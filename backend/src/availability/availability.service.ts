// backend/src/shifts/availability.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async setAvailability(dto: CreateAvailabilityDto) {
    // 1. Najdeme směnu I S JEJÍ SKUPINOU (ScheduleGroup)
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
      include: { scheduleGroup: true }, // <--- Důležité!
    });

    if (!shift) throw new NotFoundException('Směna nenalezena');
    if (!shift.scheduleGroup || shift.scheduleGroup.status !== 'PREFERENCES') {
      throw new ForbiddenException(
        'Tento měsíc již není otevřený pro úpravy preferencí.',
      );
    }
    const existingEntry = await this.prisma.availability.findFirst({
      where: { userId: dto.userId, shiftId: dto.shiftId },
    });

    if (existingEntry) {
      return this.prisma.availability.update({
        where: { id: existingEntry.id },
        data: { type: dto.type },
      });
    } else {
      return this.prisma.availability.create({
        data: {
          userId: dto.userId,
          shiftId: dto.shiftId,
          type: dto.type,
          startDatetime: shift.startDatetime,
          endDatetime: shift.endDatetime,
          shiftTypeId: shift.shiftTypeId,
        },
      });
    }
  }
}
