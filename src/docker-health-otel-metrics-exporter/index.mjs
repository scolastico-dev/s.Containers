import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import Docker from 'dockerode';

const NODE_ENV = process.env.NODE_ENV || 'development';
const DEV = NODE_ENV === 'development';
const OTEL_URL = process.env.OTEL_URL || 'http://localhost:4317';
const SCRAPER_INTERVAL = parseInt(process.env.SCRAPER_INTERVAL, 10) || 60;
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
const metricExporter = new OTLPMetricExporter({ url: OTEL_URL });
const meterProvider = new MeterProvider({
  readers: [new PeriodicExportingMetricReader({ exporter: metricExporter })],
});
const meter = meterProvider.getMeter('container-health-monitor');
const containerHealthMetric = meter.createObservableGauge('container_health_state', {
  description: 'Health state of running Docker containers',
});

let latestMetrics = [];

async function fetchContainerHealth() {
  try {
    if (DEV) console.log('Fetching container list...');
    const containers = await docker.listContainers({ all: true });

    if (DEV) console.log(`Found ${containers.length} containers`);
    const metrics = [];

    for (const containerInfo of containers) {
      const container = docker.getContainer(containerInfo.Id);
      const details = await container.inspect();
      const healthState = details.State.Health ? details.State.Health.Status : details.State.Status;

      let stateValue;
      switch (healthState) {
        case 'healthy':
          stateValue = 1;
          break;
        case 'unhealthy':
          stateValue = 0;
          break;
        case 'starting':
          stateValue = 2;
          break;
        default:
          stateValue = details.State.Running ? -1 : -2;
          break;
      }

      if (DEV) console.log(`Container ${containerInfo.Names[0]} health state: ${stateValue}`);

      metrics.push({
        value: stateValue,
        attributes: {
          container_id: containerInfo.Id,
          container_name: containerInfo.Names[0].replace(/^\//, ''),
        },
      });
    }

    latestMetrics = metrics;
    if (DEV) console.log('Flushing metrics...');
    meterProvider.forceFlush();
    if (DEV) console.log('Metrics flushed, waiting for next interval...');
  } catch (error) {
    console.error('Error fetching container health:', error);
  }
}

containerHealthMetric.addCallback((observableResult) => {
  latestMetrics.forEach(({ value, attributes }) => {
    observableResult.observe(value, attributes);
  });
});

setInterval(fetchContainerHealth, SCRAPER_INTERVAL * 1000);
console.log(`Container health monitoring started. Interval: ${SCRAPER_INTERVAL}s`);
