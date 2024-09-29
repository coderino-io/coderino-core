import { Controller, Get } from '@nestjs/common';
import { AwsProviderService } from './aws-provider.service';

@Controller('aws')
export class AwsProviderController {
  constructor(private readonly awsService: AwsProviderService) {}

  @Get('create')
  createWorkspace() {
    this.awsService.createWorkspace();
  }
}
