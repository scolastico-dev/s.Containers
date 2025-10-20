import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiResponse } from '@nestjs/swagger';
import { AmqpService } from 'src/services/amqp.service';

@Controller('health')
@ApiTags('health')
export class HealthController {
  constructor(private readonly amqpService: AmqpService) {}

  @Get('amqp')
  @ApiResponse({
    status: 200,
    description: 'AMQP connection status',
    schema: {
      type: 'object',
      properties: {
        connected: { type: 'boolean' },
        status: { type: 'string' },
      },
    },
  })
  getAmqpStatus() {
    const connected = this.amqpService.isConnected();
    return {
      connected,
      status: connected ? 'healthy' : 'disconnected',
    };
  }
}
