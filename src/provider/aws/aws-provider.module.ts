import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AwsProviderController } from './aws-provider.controller';
import { AwsProviderService } from './aws-provider.service';

@Module({
  imports: [HttpModule],
  controllers: [AwsProviderController],
  providers: [AwsProviderService],
})
export class AwsProviderModule {
  constructor() {}
}
