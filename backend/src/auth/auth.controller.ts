import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login to the platform' })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const payload = await this.authService.validateUser(dto.username, dto.password);
    return this.authService.login(payload);
  }
}
