import { Controller, Get, Request } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getSubdomain(@Request() request: Request): string {
    const subdomain = request.headers['host'].split('.')[0];
    console.log('subdomain: ', subdomain);
    return this.appService.getHello();
  }
}
