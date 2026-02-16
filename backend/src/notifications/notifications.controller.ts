import {
  Controller,
  Get,
  Patch,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(AuthGuard) // Musí být přihlášen
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // GET /notifications -> Vrátí moje notifikace
  @Get()
  findMy(@Request() req) {
    return this.notificationsService.getMyNotifications(req.user.id);
  }

  // PATCH /notifications/:id/read -> Označí jednu jako přečtenou
  @Patch(':id/read')
  markRead(@Param('id') id: string, @Request() req) {
    return this.notificationsService.markAsRead(id, req.user.id);
  }

  // PATCH /notifications/read-all -> Označí vše jako přečtené
  @Patch('read-all')
  markAllRead(@Request() req) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }
}
