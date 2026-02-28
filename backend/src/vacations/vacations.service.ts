import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { VacationStatus } from '@prisma/client';

@Injectable()
export class VacationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditLog: AuditLogService,
  ) {}

  async create(userId: string, dto: CreateVacationDto) {
    const start = new Date(dto.startDate);
    const now = new Date();

    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 14) {
      throw new BadRequestException(
        `Zákonná lhůta pro hlášení dovolené je 14 dní předem. (Zbývá jen ${diffDays} dní). Kontaktujte manažera osobně.`,
      );
    }

    const user = await this.prisma.profile.findUnique({
      where: { id: userId },
    });
    if (!user || !user.locationId)
      throw new BadRequestException('Uživatel nemá přiřazenou lokaci.');

    const request = await this.prisma.vacationRequest.create({
      data: {
        userId,
        startDate: start,
        endDate: new Date(dto.endDate),
        note: dto.note,
        status: VacationStatus.PENDING,
      },
    });

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

  async updateStatus(id: string, status: VacationStatus, adminId: string) {
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

    await this.auditLog.log(
      status === VacationStatus.APPROVED ? 'APPROVE_VACATION' : 'REJECT_VACATION',
      'VacationRequest',
      id,
      adminId,
      { status },
    );

    const message =
      status === VacationStatus.APPROVED
        ? 'Vaše žádost o dovolenou byla schválena.'
        : 'Vaše žádost o dovolenou byla zamítnuta.';
    await this.notificationsService.notifyUser(
      request.userId,
      adminLocationId,
      message,
      status === VacationStatus.APPROVED ? 'INFO' : 'ALERT',
    );

    return updated;
  }

  async findMyRequests(userId: string, skip = 0, take = 50) {
    return this.prisma.vacationRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }

  async findAllInLocation(locationId: number, adminId: string, skip = 0, take = 50) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    if (locationId !== adminLocationId) {
      throw new ForbiddenException('Nemáte přístup k této lokaci.');
    }
    return this.prisma.vacationRequest.findMany({
      where: { user: { locationId } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
  }
}
