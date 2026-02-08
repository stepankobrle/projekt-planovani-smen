// backend/src/shifts/shifts.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { Shift } from '@prisma/client';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async createDraftSlots(dto: CreateShiftDto) {
    // 1. Najdeme šablonu (ShiftType), abychom věděli časy
    const shiftType = await this.prisma.shiftType.findUnique({
      where: { id: dto.shiftTypeId },
    });

    if (!shiftType || !shiftType.startTime || !shiftType.endTime) {
      throw new Error('Typ směny neexistuje nebo nemá definované časy.');
    }

    const createdShifts: Shift[] = [];

    // 2. Cyklus pro vytvoření tolika směn, kolik admin zadal
    for (let i = 0; i < dto.count; i++) {
      const start = new Date(dto.date);
      const [sh, sm] = shiftType.startTime.split(':');
      start.setHours(parseInt(sh), parseInt(sm), 0);

      const end = new Date(dto.date);
      const [eh, em] = shiftType.endTime.split(':');
      end.setHours(parseInt(eh), parseInt(em), 0);

      const shift = await this.prisma.shift.create({
        data: {
          startDatetime: start,
          endDatetime: end,
          shiftTypeId: dto.shiftTypeId,
          locationId: dto.locationId,
          status: 'DRAFT', // Směna je zatím jen prázdná krabička
        },
      });
      createdShifts.push(shift);
    }
    return createdShifts;
  }

  async findAllDrafts() {
    return this.prisma.shift.findMany({
      where: { status: 'DRAFT' },
      include: {
        shiftType: true,
        location: true,
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  async getShiftsWithAvailabilities(
    locationId: number,
    dateFrom: Date,
    dateTo: Date,
  ) {
    return this.prisma.shift.findMany({
      where: {
        locationId,
        startDatetime: { gte: dateFrom },
        endDatetime: { lte: dateTo },
      },
      include: {
        shiftType: true,
        // Toto je klíčové: admin uvidí všechny, kdo si u směny něco vybrali
        availabilities: {
          include: {
            user: true,
          },
        },
        assignedUser: true, // Také uvidíme, jestli už je někdo přiřazen
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  async approveSchedule(locationId: number, dateFrom: Date, dateTo: Date) {
    return this.prisma.shift.updateMany({
      where: {
        locationId,
        status: 'DRAFT',
        assignedUserId: { not: null }, // Schválíme jen ty, které jsou obsazené
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      data: {
        status: 'PUBLISHED', // Tímto se stanou viditelnými pro lidi
      },
    });
  }
}
