import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { TokenCleanupService } from './token-cleanup.service';

@Module({
  imports: [
    // Toto je důležité pro generování tokenů
    JwtModule.register({
      global: true, // Zpřístupní JwtService v celém AuthModulu
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AuthService, TokenCleanupService],
  controllers: [AuthController],
})
export class AuthModule {}
