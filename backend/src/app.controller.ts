import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class AppController {
  getHealth() {
    return { status: 'ok' };
  }

  @Get()
  handleGet() {
    return this.getHealth();
  }
}
