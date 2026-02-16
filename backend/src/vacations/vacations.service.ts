import { BadRequestException, Injectable } from '@nestjs/common';
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

  // Admin: Schválení/Zamítnutí
  async updateStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    return this.prisma.vacationRequest.update({
      where: { id },
      data: { status },
    });
  }

  // Zaměstnanec: Moje žádosti
  async findMyRequests(userId: string) {
    return this.prisma.vacationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin: Všechny žádosti v mé lokaci (nebo globálně)
  async findAllInLocation(locationId: number) {
    return this.prisma.vacationRequest.findMany({
      where: { user: { locationId } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
