import { Module } from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { VacationsController } from './vacations.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [PrismaModule, NotificationsModule, AuditLogModule],
  controllers: [VacationsController],
  providers: [VacationsService],
})
export class VacationsModule {}
