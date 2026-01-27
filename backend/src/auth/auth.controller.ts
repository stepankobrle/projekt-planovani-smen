import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async signIn(@Body() signInDto: { email: string; password: string }) {
    return this.authService.signIn(signInDto.email, signInDto.password);
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard, RolesGuard)
  @SetMetadata('roles', ['ADMIN', 'MANAGER'])
  @Post('invite')
  async invite(@Body() body: any) {
    return this.authService.inviteUser(body);
  }

  @Post('activate')
  async activate(@Body() body: { token: string; password: string }) {
    return this.authService.activateAccount(body.token, body.password);
  }
}
