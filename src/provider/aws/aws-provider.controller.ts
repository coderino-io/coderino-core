import { Controller, Get, Param, Query } from '@nestjs/common';
import { AwsProviderService } from './aws-provider.service';

@Controller('aws')
export class AwsProviderController {
  constructor(private readonly awsService: AwsProviderService) {}

  @Get('create')
  async createWorkspace(
    @Param() params: any,
    @Query('names') names: Array<string>,
  ) {
    console.log('names:', names);
    const createdIds = await this.awsService.createWorkspace(names);
    return { created: createdIds };
  }

  @Get('terminate/all')
  async terminateAllWorkspaces() {
    const terminatedIds = await this.awsService.terminateAll();
    return { terminated: terminatedIds };
  }

  @Get('terminate/:id')
  async terminateSingleWorkspace(@Param() params: any) {
    const terminatedInstanceIds = await this.awsService.terminateInstances([
      params.id,
    ]);
    return { terminated: terminatedInstanceIds };
  }
}
