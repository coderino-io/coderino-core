import { Controller, Get, Next, Req, Res } from '@nestjs/common';
import { createProxyMiddleware } from 'http-proxy-middleware';

@Controller('workspace')
export class ProxyController {
  apiProxy = createProxyMiddleware({
    target: 'https://www.npmjs.com',
    changeOrigin: true,
  });

  @Get('test-a')
  proxyTest(@Req() req, @Res() res, @Next() next) {
    this.apiProxy(req, res, next);
  }
}
