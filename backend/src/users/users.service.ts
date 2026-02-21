import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async inviteUser(dto: InviteUserDto, adminId: string) {
    const adminProfile = await this.prisma.profile.findUnique({
      where: { id: adminId },
      select: { locationId: true },
    });

    if (!adminProfile || !adminProfile.locationId) {
      throw new BadRequestException(
        'Admin nemá přiřazenou lokaci nebo profil neexistuje.',
      );
    }

    const correctLocationId = adminProfile.locationId;

    // Generování tokenu
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    const existingUser = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });

    // Data pro uložení
    const userData = {
      fullName: dto.fullName,
      role: dto.role,
      targetHoursPerMonth: dto.targetHours,
      locationId: correctLocationId,
      jobPositionId: dto.positionId,
      invitationToken: token,
      invitationExpires: expires,
    };

    if (existingUser) {
      if (existingUser.isActivated) {
        throw new BadRequestException(
          'Uživatel s tímto e-mailem je již aktivní.',
        );
      }
      await this.prisma.profile.update({
        where: { email: dto.email },
        data: userData,
      });
    } else {
      await this.prisma.profile.create({
        data: {
          email: dto.email,
          isActivated: false,
          ...userData,
        },
      });
    }

    // Odeslání emailu
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const invitationLink = `${frontendUrl}/set-password?token=${token}`;

    await this.mailerService.sendMail({
      to: dto.email,
      subject: 'Pozvánka do systému plánování směn',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Vítejte v týmu!</h2>
          <p>Byl vám vytvořen účet pro správu směn.</p>
          <p>Klikněte na tlačítko níže pro nastavení hesla:</p>
          <a href="${invitationLink}"
             style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
             Aktivovat účet
          </a>
          <p style="color: gray; font-size: 12px; margin-top: 20px;">
            Platnost tohoto odkazu vyprší za 24 hodin.
          </p>
        </div>
      `,
    });

    return { message: 'Pozvánka odeslána.' };
  }

  // Všechny aktivní uživatelé
  async findAll(adminId: string) {
    const adminProfile = await this.prisma.profile.findUnique({
      where: { id: adminId },
      select: { locationId: true },
    });

    if (!adminProfile || !adminProfile.locationId) {
      return [];
    }
    return this.prisma.profile.findMany({
      where: {
        locationId: adminProfile.locationId,
        isActivated: true,
      },
      include: {
        jobPosition: true,
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  private async getAdminLocationId(adminId: string): Promise<number> {
    const admin = await this.prisma.profile.findUnique({
      where: { id: adminId },
      select: { locationId: true },
    });
    if (!admin?.locationId) {
      throw new ForbiddenException('Nepodařilo se ověřit přístup.');
    }
    return admin.locationId;
  }

  private async verifyUserAccess(targetUserId: string, adminLocationId: number): Promise<void> {
    const target = await this.prisma.profile.findUnique({
      where: { id: targetUserId },
      select: { locationId: true },
    });
    if (!target || target.locationId !== adminLocationId) {
      throw new ForbiddenException('Nemáte přístup k tomuto uživateli.');
    }
  }

  async findOne(id: string, adminId: string) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    await this.verifyUserAccess(id, adminLocationId);
    return this.prisma.profile.findUnique({
      where: { id },
      include: { jobPosition: true },
    });
  }

  // Statistiky zaměstnanců pro daný měsíc — použitelné i na dashboardu
  async getStats(adminId: string, year: number, month: number) {
    const adminProfile = await this.prisma.profile.findUnique({
      where: { id: adminId },
      select: { locationId: true },
    });
    if (!adminProfile?.locationId) return [];

    const locationId = adminProfile.locationId;
    const dateFrom = new Date(year, month - 1, 1);
    const dateTo = new Date(year, month, 0, 23, 59, 59, 999);
    const now = new Date();

    const [employees, shifts, vacations] = await Promise.all([
      this.prisma.profile.findMany({
        where: { locationId, isActivated: true },
        select: { id: true, targetHoursPerMonth: true },
      }),
      this.prisma.shift.findMany({
        where: {
          locationId,
          startDatetime: { gte: dateFrom, lte: dateTo },
          assignedUserId: { not: null },
        },
        select: {
          assignedUserId: true,
          startDatetime: true,
          endDatetime: true,
        },
      }),
      this.prisma.vacationRequest.findMany({
        where: {
          user: { locationId },
          startDate: { lte: dateTo },
          endDate: { gte: dateFrom },
          status: { in: ['APPROVED', 'PENDING'] },
        },
        select: { userId: true, startDate: true, endDate: true, status: true },
      }),
    ]);

    const calcDuration = (start: Date, end: Date): number => {
      const dur = (end.getTime() - start.getTime()) / 36e5;
      return dur >= 6 ? dur - 0.5 : dur;
    };

    const round1 = (n: number) => Math.round(n * 10) / 10;

    return employees.map((emp) => {
      const myShifts = shifts.filter((s) => s.assignedUserId === emp.id);
      const target = Number(emp.targetHoursPerMonth ?? 160);

      const workedHours = myShifts
        .filter((s) => s.endDatetime <= now)
        .reduce((acc, s) => acc + calcDuration(s.startDatetime, s.endDatetime), 0);

      const scheduledHours = myShifts
        .filter((s) => s.startDatetime > now)
        .reduce((acc, s) => acc + calcDuration(s.startDatetime, s.endDatetime), 0);

      const totalHours = workedHours + scheduledHours;
      const overtime = Math.max(0, totalHours - target);

      const myVacations = vacations.filter((v) => v.userId === emp.id);

      const vacationDays = myVacations
        .filter((v) => v.status === 'APPROVED')
        .reduce((acc, v) => {
          return acc + Math.ceil((v.endDate.getTime() - v.startDate.getTime()) / 864e5) + 1;
        }, 0);

      const pendingVacationDays = myVacations
        .filter((v) => v.status === 'PENDING')
        .reduce((acc, v) => {
          return acc + Math.ceil((v.endDate.getTime() - v.startDate.getTime()) / 864e5) + 1;
        }, 0);

      return {
        userId: emp.id,
        workedHours: round1(workedHours),
        scheduledHours: round1(scheduledHours),
        totalHours: round1(totalHours),
        overtime: round1(overtime),
        vacationDays,
        pendingVacationDays,
      };
    });
  }

  // --- ÚPRAVA UŽIVATELE ---
  async update(id: string | number, dto: UpdateUserDto, adminId: string) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    await this.verifyUserAccess(String(id), adminLocationId);
    return this.prisma.profile.update({
      where: { id: String(id) },
      data: {
        email: dto.email,
        fullName: dto.fullName,
        role: dto.role,
        // Mapování názvů z DTO na DB
        targetHoursPerMonth: dto.targetHours,
        jobPositionId: dto.positionId,
      },
    });
  }

  // --- SMAZÁNÍ (DEAKTIVACE) UŽIVATELE ---
  async remove(id: string | number, adminId: string) {
    const adminLocationId = await this.getAdminLocationId(adminId);
    await this.verifyUserAccess(String(id), adminLocationId);
    return this.prisma.profile.update({
      where: { id: String(id) },
      data: {
        isActivated: false,
      },
    });
  }
}
