import { Test, TestingModule } from '@nestjs/testing';
import { AwsTaskSchedulerService } from './aws-task-scheduler.service';

describe('AwsTaskSchedulerService', () => {
  let service: AwsTaskSchedulerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsTaskSchedulerService],
    }).compile();

    service = module.get<AwsTaskSchedulerService>(AwsTaskSchedulerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
