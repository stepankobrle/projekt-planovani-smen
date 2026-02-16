import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { ConfigModule } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ShiftsModule } from './shifts/shifts.module';
import { AvailabilityModule } from './availability/availability.module';
import { ScheduleModule } from './schedule/schedule.module';
import { UsersModule } from './users/users.module';
import { JobPositionsModule } from './job-positions/job-positions.module';
import { ShiftTypesModule } from './shift-types/shift-types.module';
import { OrganizationSettingsModule } from './organization-settings/organization-settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from 'prisma/prisma.module';
import { VacationsModule } from './vacations/vacations.module';

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
    ShiftsModule,
    AvailabilityModule,
    ScheduleModule,
    UsersModule,
    JobPositionsModule,
    ShiftTypesModule,
    OrganizationSettingsModule,
    NotificationsModule,
    PrismaModule,
    VacationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
