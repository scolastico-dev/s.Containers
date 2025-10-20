import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { JobService, PrintJobDTO } from 'src/services/job.service';

@Controller()
@ApiTags('app')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('job')
  @ApiBody({
    description: 'Start a print job',
    type: PrintJobDTO,
    required: true,
    isArray: true,
  })
  async printReceipt(@Body() jobs: PrintJobDTO[]): Promise<string[]> {
    return await this.jobService.processJobs(jobs, true);
  }
}
