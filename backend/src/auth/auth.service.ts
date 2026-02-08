import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
//Služba autentikace
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.prisma.profile.findUnique({
      where: { email },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const payload = { sub: user.id, email: user.email, role: user.role };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          fullName: user.fullName,
          role: user.role,
        },
      };
    }
    throw new UnauthorizedException('Chybné přihlašovací údaje');
  }

  // Pozvání nového uživatele
  async inviteUser(dto: {
    email: string;
    fullName: string;
    role: UserRole;
    targetHours: number;
    locationId?: number;
    positionId?: number;
  }) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 24); // Expirace za 24 hodin

    const existingUser = await this.prisma.profile.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      if (existingUser.isActivated) {
        throw new BadRequestException(
          'Uživatel s tímto e-mailem je již aktivní.',
        );
      }
      await this.prisma.profile.update({
        where: { email: dto.email },
        data: {
          fullName: dto.fullName,
          role: dto.role,
          targetHoursPerMonth: dto.targetHours,
          invitationToken: token,
          invitationExpires: expires,
          locationId: dto.locationId || null,
          positionId: dto.positionId || null,
        },
      });
    } else {
      await this.prisma.profile.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          role: dto.role,
          targetHoursPerMonth: dto.targetHours,
          invitationToken: token,
          invitationExpires: expires,
          isActivated: false,
          locationId: dto.locationId || null,
          positionId: dto.positionId || null,
        },
      });
    }

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

    return {
      message:
        'Zaměstnanec byl úspěšně vytvořen a pozvánka odeslána na e-mail.',
    };
  }

  //Aktivace účtu
  async activateAccount(token: string, newPassword: string) {
    const user = await this.prisma.profile.findUnique({
      where: { invitationToken: token },
    });

    if (!user) throw new UnauthorizedException('Neplatný nebo vypršelý token');
    // Kontrola expirace
    const now = new Date();
    if (user.invitationExpires && now > user.invitationExpires) {
      throw new UnauthorizedException(
        'Platnost odkazu vypršela. Požádejte admina o nové pozvání.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.profile.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        invitationToken: null,
      },
    });

    return { message: 'Účet byl úspěšně aktivován. Nyní se můžete přihlásit.' };
  }
}
