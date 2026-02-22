import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
//Služba autentikace
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.prisma.profile.findUnique({
      where: { email },
      include: { jobPosition: true },
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      const effectiveRole = user.jobPosition?.isManagerial ? 'ADMIN' : user.role;
      const payload = {
        sub: user.id,
        id: user.id,
        email: user.email,
        role: effectiveRole,
        locationId: user.locationId,
        fullName: user.fullName,
      };

      return {
        access_token: await this.jwtService.signAsync(payload),
        user: {
          id: user.id,
          fullName: user.fullName,
          role: effectiveRole,
          locationId: user.locationId,
        },
      };
    }
    throw new UnauthorizedException('Chybné údaje');
  }

  async activateAccount(token: string, password: string) {
    const user = await this.prisma.profile.findFirst({
      where: { invitationToken: token },
    });
    if (!user) {
      throw new BadRequestException(
        'Neplatný nebo již použitý aktivační odkaz.',
      );
    }
    if (user.isActivated) {
      throw new BadRequestException('Účet je již aktivní.');
    }
    if (user.invitationExpires && new Date() > user.invitationExpires) {
      throw new BadRequestException(
        'Platnost odkazu vypršela. Požádejte o nové pozvání.',
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await this.prisma.profile.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        invitationToken: null,
        invitationExpires: null,
      },
    });

    return { message: 'Účet úspěšně aktivován! Nyní se můžeš přihlásit.' };
  }
}
