import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AwsProviderModule } from './provider/aws/aws-provider.module';
import { ProxyController } from './proxy/proxy.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder/seeder.service';
import { User } from './entites/user.entity';
import { AwsTaskSchedulerService } from './aws-task-scheduler/aws-task-scheduler.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    AwsProviderModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: ["dist/**/*.entity{.ts,.js}"],
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([User]),
    ScheduleModule.forRoot()
  ],
  controllers: [AppController, ProxyController],
  providers: [AppService, SeederService, AwsTaskSchedulerService],
})
export class AppModule {}
