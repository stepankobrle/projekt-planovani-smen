import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Pošle notifikaci všem ADMINŮM a MANAŽERŮM ve stejné lokaci.
   */
  async notifyAdminsInLocation(
    locationId: number,
    content: string,
    type: string = 'INFO',
  ) {
    // 1. Najdeme Adminy a Managery v dané lokaci
    const admins = await this.prisma.profile.findMany({
      where: {
        locationId: locationId,
        role: { in: ['ADMIN', 'MANAGER'] },
        isActivated: true,
      },
    });

    if (admins.length === 0) return;

    // 2. Vytvoříme notifikaci pro každého z nich (každý má svou kopii, aby si ji mohl přečíst)
    const data = admins.map((admin) => ({
      content,
      type,
      locationId,
      recipientId: admin.id,
      isRead: false,
    }));

    await this.prisma.notification.createMany({ data });
  }

  // Získání notifikací pro přihlášeného uživatele (Admina)
  async getMyNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20, // Načteme jen posledních 20
    });
  }

  // Označit konkrétní notifikaci jako přečtenou
  async markAsRead(id: string, userId: string) {
    // Používáme updateMany s filtrem recipientId jako bezpečnostní pojistku,
    // aby admin nemohl označit cizí notifikaci
    return this.prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
  }

  // Označit všechny jako přečtené (volitelné, hodí se tlačítko "Přečíst vše")
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }
}
