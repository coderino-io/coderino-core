import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AwsProviderService } from 'src/provider/aws/aws-provider.service';

@Injectable()
export class AwsTaskSchedulerService {
    private readonly logger = new Logger(AwsTaskSchedulerService.name);

    @Cron('45 * * * * *')
    handleAwsScheduler() {
        this.logger.debug("This was called to check the Shutdown Time for the VMs");

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
    
        if (hours === 23 && minutes === 59) {
            this.logger.debug("It's time to shut down the VMs!");
        }
    }

}