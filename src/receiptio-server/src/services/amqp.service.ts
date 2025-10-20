import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JobService } from './job.service';
import { CfgService } from './cfg.service';
import { IdLogger } from 'src/id.logger';
import * as amqp from 'amqplib';

@Injectable()
export class AmqpService implements OnModuleInit, OnModuleDestroy {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly jobService: JobService,
    private readonly cfg: CfgService,
    private readonly logger: IdLogger,
  ) {
    this.logger.setContext(AmqpService.name);
  }

  async onModuleInit() {
    if (!this.cfg.amqpUrl) {
      this.logger.log('AMQP URL not configured, skipping AMQP initialization');
      return;
    }

    try {
      await this.initializeAmqp();
      this.logger.log('AMQP service initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing AMQP service', error);
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async initializeAmqp(): Promise<void> {
    const parsedUrl = new URL(this.cfg.amqpUrl);
    const queueName = parsedUrl.pathname.substring(1) || 'print_jobs';

    this.logger.log(`Connecting to AMQP server at ${parsedUrl.host}`);
    this.connection = (await amqp.connect(this.cfg.amqpUrl)) as any;

    this.connection.on('error', (err) => {
      this.logger.error('AMQP connection error', err);
    });

    this.connection.on('close', () => {
      this.logger.warn('AMQP connection closed');
    });

    this.channel = await (this.connection as any).createChannel();

    this.channel.on('error', (err) => {
      this.logger.error('AMQP channel error', err);
    });

    this.channel.on('close', () => {
      this.logger.warn('AMQP channel closed');
    });

    await this.channel.assertQueue(queueName, {
      durable: true,
    });

    this.logger.log(`Consuming messages from queue: ${queueName}`);

    await this.channel.consume(
      queueName,
      async (msg) => {
        if (msg) {
          await this.processMessage(msg);
        }
      },
      {
        noAck: false,
      },
    );
  }

  private async processMessage(msg: amqp.ConsumeMessage): Promise<void> {
    try {
      const content = msg.content.toString();
      this.logger.log(`Received AMQP message: ${content.substring(0, 100)}...`);

      const jobData = JSON.parse(content);

      // Handle both single job and array of jobs
      const jobs = Array.isArray(jobData) ? jobData : [jobData];

      const results = await this.jobService.processJobs(jobs, false);

      this.logger.log(
        `Processed ${jobs.length} job(s) from AMQP, ${results.length} successful`,
      );

      // Acknowledge message only after successful processing
      this.channel?.ack(msg);
    } catch (error) {
      this.logger.error('Error processing AMQP message', error);

      // Check if we should reject or nack the message
      if (this.shouldRetry(error)) {
        this.logger.log('Rejecting message for retry');
        this.channel?.nack(msg, false, true);
      } else {
        this.logger.log(
          'Message processing failed permanently, acknowledging to remove from queue',
        );
        this.channel?.ack(msg);
      }
    }
  }

  private shouldRetry(error: any): boolean {
    // Don't retry validation errors or malformed JSON
    if (error instanceof SyntaxError) return false;
    if (error?.message?.includes('validation')) return false;

    // Retry for network errors, temporary failures, etc.
    return true;
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }

      if (this.connection) {
        await (this.connection as any).close();
        this.connection = null;
      }

      this.logger.log('AMQP connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing AMQP connection', error);
    }
  }

  /**
   * Get connection status for health checks
   */
  public isConnected(): boolean {
    return !!(
      this.connection && !(this.connection as any).connection?.destroyed
    );
  }

  /**
   * Manual method to reconnect if needed
   */
  public async reconnect(): Promise<void> {
    await this.disconnect();
    await this.initializeAmqp();
  }
}
