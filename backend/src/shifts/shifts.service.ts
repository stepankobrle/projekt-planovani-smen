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

  // --- 1. HROMADNÉ VYTVOŘENÍ ZE ŠABLONY ---
  async bulkCreateFromTemplate(dto: any) {
    console.log('--- DEBUG START ---');
    console.log('Přijaté DTO:', dto);

    if (!dto || !dto.items) {
      throw new BadRequestException("Payload is missing 'items' property");
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

      // Zpracování času ze šablony
      const [startH, startM] = (type.startTime || '08:00')
        .split(':')
        .map(Number);
      const [endH, endM] = (type.endTime || '16:00').split(':').map(Number);

      const startDatetime = new Date(item.date);
      startDatetime.setHours(startH, startM, 0, 0);

      const endDatetime = new Date(item.date);
      endDatetime.setHours(endH, endM, 0, 0);

      if (endDatetime <= startDatetime) {
        endDatetime.setDate(endDatetime.getDate() + 1);
      }

      // Vytvoření slotů dle počtu (count)
      for (let i = 0; i < (item.count || 1); i++) {
        shiftsToCreate.push({
          scheduleGroupId: dto.scheduleGroupId,
          shiftTypeId: type.id,
          locationId: Number(dto.locationId),
          jobPositionId: Number(dto.jobPositionId), // Používáme jobPositionId dle tvé migrace
          startDatetime: startDatetime,
          endDatetime: endDatetime,
          status: ShiftStatus.DRAFT,
          isMarketplace: false, // Šablony jsou obvykle v draftu
        });
      }
    }

    return this.prisma.shift.createMany({
      data: shiftsToCreate,
    });
  }

  // --- 2. JEDNOTLIVÉ VYTVOŘENÍ (Z MODÁLU) ---
  async createShifts(dto: CreateShiftDto) {
    let finalStart: string;
    let finalEnd: string;
    let idAsNumber: number | null = null;

    // ROZHODNUTÍ: Je to šablona nebo vlastní čas?
    if (dto.shiftTypeId && dto.shiftTypeId !== 'vlastni') {
      // --- PŘÍPAD A: ŠABLONA ---
      idAsNumber = Number(dto.shiftTypeId);
      const shiftType = await this.prisma.shiftType.findUnique({
        where: { id: idAsNumber },
      });

      if (!shiftType) throw new BadRequestException(`Typ směny nenalezen`);

      // Vezmeme časy ze šablony
      finalStart = shiftType.startTime || '08:00';
      finalEnd = shiftType.endTime || '16:00';
    } else {
      // --- PŘÍPAD B: VLASTNÍ ČAS ---
      // Do DB uložíme u shiftTypeId NULL
      idAsNumber = null;

      finalStart = dto.startTime || '08:00';
      finalEnd = dto.endTime || '16:00';
    }

    const initialStatus = (dto.status as ShiftStatus) || ShiftStatus.DRAFT;
    const createdShifts: any[] = [];

    // Cyklus pro vytvoření (např. pokud vytváříš 3 stejné směny naráz)
    for (let i = 0; i < (dto.count || 1); i++) {
      // Tady spojíme datum (např. 2024-05-20) a čas (např. 14:30) do jednoho Date objektu
      const start = new Date(dto.date);
      const [sh, sm] = finalStart.split(':');
      start.setHours(parseInt(sh), parseInt(sm), 0, 0);

      const end = new Date(dto.date);
      const [eh, em] = finalEnd.split(':');
      end.setHours(parseInt(eh), parseInt(em), 0, 0);

      // Ošetření přechodu přes půlnoc
      if (end <= start) {
        end.setDate(end.getDate() + 1);
      }

      // ULOŽENÍ DO TABULKY SHIFT
      const shift = await this.prisma.shift.create({
        data: {
          startDatetime: start, // Tady je ten tvůj čas z inputu (nebo šablony)
          endDatetime: end, // Tady je ten tvůj čas z inputu (nebo šablony)
          shiftTypeId: idAsNumber, // Tady bude buď ID šablony nebo NULL (vlastní)
          locationId: Number(dto.locationId),
          scheduleGroupId: dto.scheduleGroupId,
          jobPositionId: Number(dto.jobPositionId),
          assignedUserId: dto.assignedUserId || null,
          status: initialStatus,
          isMarketplace: dto.offerToEmployees || false,
        },
      });

      createdShifts.push(shift);
    }
    if (dto.offerToEmployees) {
      await this.notifyEmployeesAboutNewShifts(
        Number(dto.jobPositionId),
        Number(dto.locationId),
      );
    }
    // ... notifikace ...
    return createdShifts;
  }

  private async notifyEmployeesAboutNewShifts(
    jobPositionId: number,
    locationId: number,
  ) {
    console.log(
      `Notifikace: Nové směny pro pozici ${jobPositionId} v lokaci ${locationId}`,
    );
  }

  async findAllDrafts() {
    return this.prisma.shift.findMany({
      where: { status: ShiftStatus.DRAFT },
      include: { shiftType: true, location: true },
      orderBy: { startDatetime: 'asc' },
    });
  }

  // Upravený update, aby přesně odpovídal DTO
  async update(id: string, dto: UpdateShiftDto) {
    // 1. Nejprve musíme načíst stávající směnu, abychom znali její datum
    const existingShift = await this.prisma.shift.findUnique({
      where: { id },
      include: { shiftType: true },
    });
    if (!existingShift) throw new NotFoundException('Směna nenalezena');
    let finalStart: Date | undefined = undefined;
    let finalEnd: Date | undefined = undefined;
    let idAsNumber: number | undefined | null = undefined;
    // 2. LOGIKA PŘEPOČTU ČASU (pokud se mění šablona nebo časy)
    // Kontrolujeme, zda přišel nový startTime, endTime nebo shiftTypeId
    if (dto.startTime || dto.endTime || dto.shiftTypeId !== undefined) {
      let timeS: string;
      let timeE: string;

      if (dto.shiftTypeId && dto.shiftTypeId !== 'vlastni') {
        // PŘÍPAD A: Změna na jinou šablonu
        idAsNumber = Number(dto.shiftTypeId);
        const st = await this.prisma.shiftType.findUnique({
          where: { id: idAsNumber },
        });
        if (!st) throw new BadRequestException('Typ směny nenalezen');
        timeS = dto.startTime || st.startTime || '';
        timeE = dto.endTime || st.endTime || '';
      } else if (
        dto.shiftTypeId === 'vlastni' ||
        (existingShift.shiftTypeId === null && (dto.startTime || dto.endTime))
      ) {
        // PŘÍPAD B: Vlastní čas (buď nově nastavený, nebo úprava stávajícího vlastního)
        idAsNumber = null;
        // Pokud v DTO chybí jeden z časů, vezmeme ho z existující směny (zformátovaný na HH:mm)
        timeS =
          dto.startTime ||
          existingShift.startDatetime.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
          });
        timeE =
          dto.endTime ||
          existingShift.endDatetime.toLocaleTimeString('cs-CZ', {
            hour: '2-digit',
            minute: '2-digit',
          });
      } else {
        // Ostatní případy (neměníme časovou logiku)
        timeS = existingShift.startDatetime.toLocaleTimeString('cs-CZ', {
          hour: '2-digit',
          minute: '2-digit',
        });
        timeE = existingShift.endDatetime.toLocaleTimeString('cs-CZ', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      // Sestavení nových Date objektů (použijeme datum z existující směny)
      const baseDate = new Date(existingShift.startDatetime);
      const [sh, sm] = timeS.split(':');
      finalStart = new Date(baseDate);
      finalStart.setHours(parseInt(sh), parseInt(sm), 0, 0);
      const [eh, em] = timeE.split(':');
      finalEnd = new Date(baseDate);
      finalEnd.setHours(parseInt(eh), parseInt(em), 0, 0);
      if (finalEnd <= finalStart) {
        finalEnd.setDate(finalEnd.getDate() + 1);
      }
    }
    // 3. SAMOTNÝ UPDATE
    return this.prisma.shift.update({
      where: { id },
      data: {
        assignedUserId:
          dto.assignedUserId !== undefined ? dto.assignedUserId : undefined,
        shiftTypeId: idAsNumber !== undefined ? idAsNumber : undefined,
        jobPositionId: dto.jobPositionId
          ? Number(dto.jobPositionId)
          : undefined,
        startDatetime: finalStart,
        endDatetime: finalEnd,
        status: dto.status ? (dto.status as ShiftStatus) : undefined,
      },
      include: {
        assignedUser: true,
        shiftType: true,
      },
    });
  }

  // --- 4. OSTATNÍ POMOCNÉ METODY ---
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
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: { assignedUser: true },
    });
    if (!shift) throw new NotFoundException('Směna nenalezena');

    return this.prisma.shift.delete({ where: { id } });
  }
}
