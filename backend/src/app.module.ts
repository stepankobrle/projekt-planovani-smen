import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    MailerModule.forRoot({
      transport: {
        host: 'sandbox.smtp.mailtrap.io',
        port: 2525,
        auth: {
          user: 'c35aa3a19ffaed',
          pass: '14e2c20cb0b65a',
        },
      },
      defaults: {
        from: '"Plánování směn" <no-reply@mojeapp.cz>',
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
