// backend/src/shifts/shifts.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { Shift, ShiftStatus, Prisma } from '@prisma/client';
import { UpdateShiftDto } from './dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // --- HROMADNÉ VYTVOŘENÍ ZE ŠABLONY (BOD 1 tvého plánu) ---
  async bulkCreateFromTemplate(dto: any) {
    // Změň dočasně na any pro snazší ladění
    console.log('--- DEBUG START ---');
    console.log('Přijaté DTO:', dto); // Sleduj terminál!

    // Ochrana proti pádu aplikace
    if (!dto || !dto.items) {
      console.error('CHYBA: Data nedorazila do service');
      throw new Error("Payload is missing 'items' property");
    }

    const shiftsToCreate: Prisma.ShiftCreateManyInput[] = [];
    const shiftTypes = await this.prisma.shiftType.findMany();

    for (const item of dto.items) {
      const type = shiftTypes.find((t) => t.id === Number(item.shiftTypeId));
      if (!type) {
        console.warn(
          `Typ směny s ID ${item.shiftTypeId} nenalezen, přeskakuji.`,
        );
        continue;
      }

      const [startH, startM] = type.startTime
        ? type.startTime.split(':').map(Number)
        : [8, 0];
      const [endH, endM] = type.endTime
        ? type.endTime.split(':').map(Number)
        : [16, 0];

      const startDatetime = new Date(item.date);
      startDatetime.setHours(startH, startM, 0, 0);

      const endDatetime = new Date(item.date);
      endDatetime.setHours(endH, endM, 0, 0);

      if (endDatetime <= startDatetime) {
        endDatetime.setDate(endDatetime.getDate() + 1);
      }

      for (let i = 0; i < item.count; i++) {
        shiftsToCreate.push({
          scheduleGroupId: dto.scheduleGroupId,
          shiftTypeId: Number(item.shiftTypeId),
          locationId: Number(dto.locationId),
          startDatetime: new Date(startDatetime),
          endDatetime: new Date(endDatetime),
          status: ShiftStatus.DRAFT,
        });
      }
    }

    console.log(`Pripraveno k vytvoreni: ${shiftsToCreate.length} směn.`);
    return this.prisma.shift.createMany({
      data: shiftsToCreate,
    });
  }

  // --- STÁVAJÍCÍ METODY ---
  async createDraftSlots(dto: CreateShiftDto) {
    // 1. Validace vstupu - pojistka, aby aplikace nespadla na Prisma chybě
    const idAsNumber = Number(dto.shiftTypeId);

    if (isNaN(idAsNumber)) {
      throw new BadRequestException(
        `Neplatné ID typu směny: ${dto.shiftTypeId}`,
      );
    }

    // 2. Hledání typu směny
    const shiftType = await this.prisma.shiftType.findUnique({
      where: {
        id: idAsNumber,
      },
    });

    if (!shiftType) {
      throw new BadRequestException(
        `Typ směny s ID ${dto.shiftTypeId} nebyl nalezen.`,
      );
    }

    const createdShifts: any[] = [];

    for (let i = 0; i < dto.count; i++) {
      const start = new Date(dto.date);
      const [sh, sm] = (shiftType.startTime || '08:00').split(':');
      start.setHours(parseInt(sh), parseInt(sm), 0, 0);

      const end = new Date(dto.date);
      const [eh, em] = (shiftType.endTime || '16:00').split(':');
      end.setHours(parseInt(eh), parseInt(em), 0, 0);

      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      const shift = await this.prisma.shift.create({
        data: {
          startDatetime: start,
          endDatetime: end,
          shiftTypeId: idAsNumber,
          locationId: Number(dto.locationId),
          scheduleGroupId: dto.scheduleGroupId, // Pošleme ID přímo jako string/number
          status: 'DRAFT',
        },
      });
      createdShifts.push(shift);
    }
    return createdShifts;
  }

  async update(id: string, dto: UpdateShiftDto) {
    return this.prisma.shift.update({
      where: { id },
      data: {
        assignedUserId:
          dto.assignedUserId !== undefined ? dto.assignedUserId : undefined,
        shiftTypeId: dto.shiftTypeId ? Number(dto.shiftTypeId) : undefined,
        startDatetime: dto.startDatetime
          ? new Date(dto.startDatetime)
          : undefined,
        endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : undefined,
      },
      include: {
        assignedUser: true,
        shiftType: true, // Tohle zajistí, že frontend dostane nový colorCode a name
      },
    });
  }

  async getAvailableEmployees(locationId: number) {
    return this.prisma.profile.findMany({
      where: {
        locationId: locationId,
        role: 'EMPLOYEE',
        isActivated: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });
  }

  async findAllDrafts() {
    return this.prisma.shift.findMany({
      where: { status: 'DRAFT' },
      include: { shiftType: true, location: true },
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
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      include: {
        shiftType: true,
        availabilities: { include: { user: true } },
        assignedUser: true,
      },
      orderBy: { startDatetime: 'asc' },
    });
  }

  async manualAssign(shiftId: string, userId: string | null) {
    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { assignedUserId: userId },
      include: { assignedUser: true },
    });
  }

  async deleteShift(id: string) {
    // 1. Najdeme směnu, abychom věděli, komu ji mažeme
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: { assignedUser: true },
    });

    if (!shift) throw new Error('Směna nenalezena');

    // 2. Pokud tam byl někdo přiřazen, simulujeme odeslání e-mailu/notifikace
    if (shift.assignedUserId) {
      console.log(`--- NOTIFIKACE ---`);
      console.log(`Odesílám e-mail uživateli ${shift.assignedUser?.email}`);
      console.log(
        `Zpráva: Vaše směna dne ${shift.startDatetime.toLocaleDateString()} byla zrušena adminem.`,
      );
      // Zde by v budoucnu mohl být volán MailerService
    }
    // 3. Smažeme samotnou směnu
    return this.prisma.shift.delete({
      where: { id },
    });
  }
}
