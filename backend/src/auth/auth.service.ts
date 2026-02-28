import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
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

    if (!user || !(await bcrypt.compare(password, user.password ?? ''))) {
      throw new UnauthorizedException('Chybné údaje');
    }

    const effectiveRole = user.jobPosition?.isManagerial ? 'ADMIN' : user.role;
    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: effectiveRole,
      locationId: user.locationId,
      fullName: user.fullName,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const refreshToken = await this.generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: effectiveRole,
        locationId: user.locationId,
      },
    };
  }

  private async generateRefreshToken(userId: string): Promise<string> {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    });

    return token;
  }

  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { include: { jobPosition: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new UnauthorizedException('Refresh token expiroval nebo je neplatný.');
    }

    // Rotace tokenu — starý smažeme, nový vytvoříme
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });

    const user = stored.user;
    const effectiveRole = user.jobPosition?.isManagerial ? 'ADMIN' : user.role;
    const payload = {
      sub: user.id,
      id: user.id,
      email: user.email,
      role: effectiveRole,
      locationId: user.locationId,
      fullName: user.fullName,
    };

    const newAccessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_SECRET,
      expiresIn: '15m',
    });

    const newRefreshToken = await this.generateRefreshToken(user.id);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async generateSseToken(userId: string): Promise<string> {
    return this.jwtService.signAsync(
      { id: userId, type: 'sse' },
      { secret: process.env.JWT_SECRET, expiresIn: '5m' },
    );
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  async activateAccount(token: string, password: string) {
    const user = await this.prisma.profile.findFirst({
      where: { invitationToken: token },
    });
    if (!user) {
      throw new BadRequestException('Neplatný nebo již použitý aktivační odkaz.');
    }
    if (user.isActivated) {
      throw new BadRequestException('Účet je již aktivní.');
    }
    if (user.invitationExpires && new Date() > user.invitationExpires) {
      throw new BadRequestException('Platnost odkazu vypršela. Požádejte o nové pozvání.');
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
