import { Module, Global } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { ThrottlerModule } from '@nestjs/throttler';
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
import { EmploymentContractsModule } from './employment-contracts/employment-contracts.module';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60000,  // 60 sekund
        limit: 10,   // max 10 pokusů za minutu
      },
    ]),
    AuthModule,
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAILTRAP_HOST'),
          port: config.get<number>('MAILTRAP_PORT'),
          auth: {
            user: config.get<string>('MAILTRAP_USER'),
            pass: config.get<string>('MAILTRAP_PASS'),
          },
        },
        defaults: {
          from: '"Plánování směn" <no-reply@mojeapp.cz>',
        },
      }),
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
    EmploymentContractsModule,
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
