import {
  Controller,
  Get,
  Patch,
  Param,
  Request,
  UseGuards,
  Query,
  Sse,
  MessageEvent,
  UnauthorizedException,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Observable, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * SSE endpoint — EventSource nepodporuje hlavičky, token jde jako query param.
   * Auth guard nelze použít, ověření probíhá ručně.
   */
  @Get('stream')
  @Sse()
  stream(@Query('token') token: string): Observable<MessageEvent> {
    if (!token) throw new UnauthorizedException();
    return from(
      this.jwtService.verifyAsync(token, { secret: process.env.JWT_SECRET }),
    ).pipe(
      switchMap((payload: { id: string }) =>
        this.notificationsService.getStream(payload.id),
      ),
      catchError(() => {
        throw new UnauthorizedException();
      }),
    );
  }

  @UseGuards(AuthGuard)
  @Get()
  findMy(
    @Request() req: { user: { id: string } },
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.notificationsService.getMyNotifications(
      req.user.id,
      skip ? Number(skip) : 0,
      take ? Number(take) : 20,
    );
  }

  @UseGuards(AuthGuard)
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  @UseGuards(AuthGuard)
  @Patch('read-all')
  markAllRead(@Request() req: { user: { id: string } }) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
