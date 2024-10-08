import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AwsProviderModule } from './provider/aws/aws-provider.module';
import { ProxyController } from './proxy/proxy.controller';

@Module({
  imports: [AwsProviderModule, ConfigModule.forRoot()],
  controllers: [AppController, ProxyController],
  providers: [AppService],
})
export class AppModule {}
