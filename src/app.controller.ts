import { Controller, Get, Next, Req, Request, Res } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppService } from './app.service';

@Controller()
export class AppController {
  private proxy = createProxyMiddleware({
    ignorePath: true,
    changeOrigin: true,
    target: 'http://18.194.30.159/',
    pathRewrite: { [`^${'bar'}`]: '' },
  });

  constructor(private readonly appService: AppService) {}

  workspaces: Array<{ route: string; target: string }> = [
    { route: 'test-1', target: 'http://18.194.30.159/' },
    { route: 'test-2', target: 'https://www.startpage.com/' },
  ];

  @Get('/workspace')
  getSubdomain(
    @Request() request: Request,
    @Req() req,
    @Res() res,
    @Next() next,
  ): string {
    const subdomain = request.headers['host'].split('.')[0];
    console.log('subdomain: ', subdomain);

    this.proxy(req, res, next);

    return this.appService.getHello();
  }
}
