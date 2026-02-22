import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Subject, Observable, interval, merge, from } from 'rxjs';
import { filter, startWith, switchMap, map } from 'rxjs/operators';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class NotificationsService {
  // Každé vyslání userId sem způsobí push přes SSE danému uživateli
  private readonly events$ = new Subject<string>();

  constructor(private prisma: PrismaService) {}

  /**
   * Pošle notifikaci jednomu konkrétnímu uživateli.
   */
  async notifyUser(
    userId: string,
    locationId: number,
    content: string,
    type: string = 'INFO',
  ) {
    await this.prisma.notification.create({
      data: { content, type, locationId, recipientId: userId, isRead: false },
    });
    this.events$.next(userId);
  }

  /**
   * Pošle notifikaci více konkrétním uživatelům (např. všem přiřazeným na směnu).
   */
  async notifyUsers(
    userIds: string[],
    locationId: number,
    content: string,
    type: string = 'INFO',
  ) {
    if (userIds.length === 0) return;
    const data = userIds.map((userId) => ({
      content,
      type,
      locationId,
      recipientId: userId,
      isRead: false,
    }));
    await this.prisma.notification.createMany({ data });
    userIds.forEach((id) => this.events$.next(id));
  }

  /**
   * Pošle notifikaci všem ADMINŮM a MANAŽERŮM ve stejné lokaci.
   */
  async notifyAdminsInLocation(
    locationId: number,
    content: string,
    type: string = 'INFO',
  ) {
    const admins = await this.prisma.profile.findMany({
      where: {
        locationId: locationId,
        role: { in: ['ADMIN', 'MANAGER'] },
        isActivated: true,
      },
    });

    if (admins.length === 0) return;

    const data = admins.map((admin) => ({
      content,
      type,
      locationId,
      recipientId: admin.id,
      isRead: false,
    }));

    await this.prisma.notification.createMany({ data });

    // Okamžitý push přes SSE každému příjemci
    admins.forEach((admin) => this.events$.next(admin.id));
  }

  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async markAsRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    this.events$.next(userId);
    return result;
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    this.events$.next(userId);
    return result;
  }

  /**
   * Vrátí Observable pro SSE stream.
   * Emituje okamžitě při nové notifikaci nebo přečtení,
   * + záložní polling každých 30 sekund.
   */
  getStream(userId: string): Observable<MessageEvent> {
    const push$ = this.events$.pipe(filter((id) => id === userId));
    const poll$ = interval(30_000);

    return merge(push$, poll$).pipe(
      startWith(null),
      switchMap(() => from(this.getUnreadCount(userId))),
      map((count) => ({ data: { unreadCount: count } }) as MessageEvent),
    );
  }
}
