import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { PrismaService } from '../prisma.service'; // <-- ZKONTROLUJ CESTU K TVÉMU PRISMA SERVICE

@Injectable()
export class UsersService {
  // --- TADY BYL PROBLÉM: Chyběl konstruktor ---
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailerService: MailerService,
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
    const invitationLink = `http://localhost:3000/set-password?token=${token}`;

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

  // --- ÚPRAVA UŽIVATELE ---
  async update(id: string | number, dto: UpdateUserDto) {
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
  async remove(id: string | number) {
    return this.prisma.profile.update({
      where: { id: String(id) },
      data: {
        isActivated: false,
      },
    });
  }
}
