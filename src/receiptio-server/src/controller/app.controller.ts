import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

@Controller()
@ApiTags('app')
export class AppController {
  constructor() {}

  @Get()
  @ApiExcludeEndpoint()
  getIndex(@Res() res: Response): void {
    res.redirect('/swagger');
  }
}
