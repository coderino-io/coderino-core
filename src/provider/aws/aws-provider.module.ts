import { Module } from '@nestjs/common';
import { AwsProviderController } from './aws-provider.controller';
import { AwsProviderService } from './aws-provider.service';

@Module({
  imports: [],
  controllers: [AwsProviderController],
  providers: [AwsProviderService],
})
export class AwsProviderModule {
  constructor() {}
}
