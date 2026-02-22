import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service'; // <---
import { CreateVacationDto } from './dto/create-vacation.dto';

@Injectable()
export class VacationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService, // <--- Injectujeme službu
  ) {}

  async create(userId: string, dto: CreateVacationDto) {
    // 1. Zkontrolujeme pravidlo 14 dní
    const start = new Date(dto.startDate);
    const now = new Date();

    // Rozdíl v milisekundách -> dny
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 14) {
      throw new BadRequestException(
        `Zákonná lhůta pro hlášení dovolené je 14 dní předem. (Zbývá jen ${diffDays} dní). Kontaktujte manažera osobně.`,
      );
    }

    // 2. Načteme uživatele kvůli jménu a lokaci
    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });
    if (!user || !user.locationId)
      throw new BadRequestException('Uživatel nemá přiřazenou lokaci.');

    // 3. Vytvoříme žádost
    const request = await this.prisma.vacationRequest.create({
      data: {
        userId,
        startDate: start,
        endDate: new Date(dto.endDate),
        note: dto.note,
        status: 'PENDING', // Čeká na schválení
      },
    });

    // 4. POŠLEME NOTIFIKACI ADMINŮM V LOKACI
    const message = `🏖️ Nová žádost o dovolenou: ${user.fullName} (${start.toLocaleDateString()} - ${new Date(dto.endDate).toLocaleDateString()})`;

    await this.notificationsService.notifyAdminsInLocation(
      user.locationId,
      message,
      'VACATION_REQUEST',
    );

    return request;
  }

  private async getAdminLocationId(adminId: string): Promise<number> {
    const admin = await this.prisma.profile.findUnique({
      where: { id: adminId },
      select: { locationId: true },
    });
    if (!admin?.locationId) throw new ForbiddenException('Nepodařilo se ověřit přístup.');
    return admin.locationId;
  }

  // Admin: Schválení/Zamítnutí — ověří, že žádost patří do adminovy lokace
  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED', adminId: string) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    const request = await this.prisma.vacationRequest.findUnique({
      where: { id },
      include: { user: { select: { locationId: true } } },
    });
    if (!request || request.user.locationId !== adminLocationId) {
      throw new ForbiddenException('Nemáte přístup k této žádosti.');
    }
    const updated = await this.prisma.vacationRequest.update({
      where: { id },
      data: { status },
    });

    const message =
      status === 'APPROVED'
        ? 'Vaše žádost o dovolenou byla schválena.'
        : 'Vaše žádost o dovolenou byla zamítnuta.';
    await this.notificationsService.notifyUser(
      request.userId,
      adminLocationId,
      message,
      status === 'APPROVED' ? 'INFO' : 'ALERT',
    );

    return updated;
  }

  // Zaměstnanec: Moje žádosti
  async findMyRequests(userId: string) {
    return this.prisma.vacationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: Všechny žádosti v lokaci — ověří, že admin má přístup k dané lokaci
  async findAllInLocation(locationId: number, adminId: string) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    if (locationId !== adminLocationId) {
      throw new ForbiddenException('Nemáte přístup k této lokaci.');
    }
    return this.prisma.vacationRequest.findMany({
      where: { user: { locationId } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
