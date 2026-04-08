import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import type { Response as ExpressResponse, Request as ExpressRequest } from 'express';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  async signIn(
    @Body() signInDto: { email: string; password: string },
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.signIn(signInDto.email, signInDto.password);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000, // 15 minut
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dní
    });

    return { user: result.user };
  }

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (!refreshToken) {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Chybí refresh token.' });
      return;
    }

    const result = await this.authService.refreshTokens(refreshToken);

    res.cookie('access_token', result.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', result.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { ok: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return { ok: true };
  }

  @UseGuards(AuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(AuthGuard)
  @Get('sse-token')
  async getSseToken(@Request() req) {
    const token = await this.authService.generateSseToken(req.user.id);
    return { token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('activate')
  @UseGuards(ThrottlerGuard)
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  async activateAccount(@Body() body: { token: string; password: string }) {
    return this.authService.activateAccount(body.token, body.password);
  }
}
