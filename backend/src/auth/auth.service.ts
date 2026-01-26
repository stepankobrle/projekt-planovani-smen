import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string) {
    const user = await this.prisma.profile.findUnique({
      where: { email },
    });

    // 2. Porovnáme heslo (bcrypt automaticky pozná hash)
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
}
