import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Shift, ShiftStatus } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  // 1. Najde rozvrh pro konkrétní rok a měsíc
  async getByMonth(locationId: number, year: number, month: number) {
    return this.prisma.scheduleGroup.findFirst({
      where: {
        locationId: locationId,
        year: year,
        month: month,
      },
      include: {
        shifts: {
          include: {
            shiftType: true,
            assignedUser: true,
          },
        },
      },
    });
  }

  // 2. Vytvoří DALŠÍ měsíc v pořadí
  async createNextMonth(locationId: number) {
    // 1. Zkusíme najít poslední existující měsíc
    const lastGroup = await this.prisma.scheduleGroup.findFirst({
      where: { locationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    let targetYear: number;
    let targetMonth: number;

    if (!lastGroup) {
      // --- FALLBACK PRO ÚPLNĚ PRVNÍ ROZVRH ---
      const now = new Date();
      targetYear = now.getFullYear();
      targetMonth = now.getMonth() + 1; // getMonth() v JS vrací 0-11, proto +1
      console.log(
        `Prázdná DB: Inicializuji první rozvrh pro ${targetMonth}/${targetYear}`,
      );
    } else {
      // --- KLASICKÁ NAVAZUJÍCÍ LOGIKA ---
      targetMonth = lastGroup.month + 1;
      targetYear = lastGroup.year;

      if (targetMonth > 12) {
        targetMonth = 1;
        targetYear++;
      }
    }

    // 2. Vygenerujeme dny pro daný měsíc
    // Trika s Date(year, month, 0).getDate() získá počet dní v měsíci
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const calendarDays = [] as string[];

    for (let i = 1; i <= daysInMonth; i++) {
      const d = i < 10 ? `0${i}` : `${i}`;
      const m = targetMonth < 10 ? `0${targetMonth}` : `${targetMonth}`;
      calendarDays.push(`${targetYear}-${m}-${d}`);
    }

    // 3. Vytvoření záznamu
    return this.prisma.scheduleGroup.create({
      data: {
        name: `Rozvrh ${targetMonth}/${targetYear}`,
        year: targetYear,
        month: targetMonth,
        locationId: locationId,
        calendarDays,
        status: 'DRAFT',
      },
    });
  }
}
// --- 1. SPRÁVA SKUPIN (MĚSÍČNÍCH ROZVRHŮ) ---
/*
  async createGroup(dto: { name: string; dateFrom: string; dateTo: string }) {
    return this.prisma.scheduleGroup.create({
      data: {
        name: dto.name,
        dateFrom: new Date(dto.dateFrom),
        dateTo: new Date(dto.dateTo),
        status: 'DRAFT',
      },
    });
  }

  async findAllGroups() {
    return this.prisma.scheduleGroup.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneGroup(id: string) {
    const group = await this.prisma.scheduleGroup.findUnique({
      where: { id },
      include: {
        shifts: {
          include: { shiftType: true, assignedUser: true },
        },
      },
    });

    if (!group) throw new NotFoundException('Skupina nenalezena');

    const settings = await this.prisma.organizationSettings.findFirst();
    const calendarDays = this.generateCalendarDays(
      group.dateFrom,
      group.dateTo,
      settings,
    );

    return {
      ...group,
      calendarDays,
    };
  }

  async updateStatus(id: string, newStatus: string) {
    return this.prisma.scheduleGroup.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  // --- 2. LOGIKA AUTOMATICKÉHO GENEROVÁNÍ (ALGORITMUS) ---

  async runAutoAssignmentForGroup(groupId: string) {
    const group = await this.prisma.scheduleGroup.findUnique({
      where: { id: groupId },
    });
    if (!group) throw new NotFoundException('Rozvrh nenalezen');

    // Pro účely testování používáme locationId: 1
    return this.runAutoAssignment(1, group.dateFrom, group.dateTo);
  }
  // --- 3. LOGIKA AUTOMATICKÉHO GENEROVÁNÍ (ALGORITMUS) ---
  async runAutoAssignment(locationId: number, dateFrom: Date, dateTo: Date) {
    // 0. Načtení nastavení
    const settings = await this.prisma.organizationSettings.findFirst();

    // 1. Načtení směn
    const shifts = await this.prisma.shift.findMany({
      where: {
        locationId,
        status: 'DRAFT',
        assignedUserId: null,
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      include: {
        availabilities: true,
        shiftType: true, // Předpokládám, že zde máš délku směny nebo start/end
      },
      orderBy: { startDatetime: 'asc' },
    });
    // 2. Načtení zaměstnanců
    const employees = await this.prisma.profile.findMany({
      where: { locationId, role: 'EMPLOYEE', isActivated: true },
    });
    // Mapa, kde si budeme držet počet minut/hodin každého zaměstnance
    const workLoad = new Map<string, number>();
    for (const emp of employees) {
      // Můžeš začít na 0, nebo zde případně načíst z DB už existující směny v daném měsíci
      workLoad.set(emp.id, 0);
    }

    const results: Shift[] = [];
    const assignedInThisRun = new Map<string, number[]>();

    for (const shift of shifts) {
      const shiftTime = new Date(shift.startDatetime).getTime();

      // Výpočet délky aktuální směny v hodinách (předpoklad: máš start a end)
      const durationMs =
        new Date(shift.endDatetime).getTime() -
        new Date(shift.startDatetime).getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      // 3. Filtrace (Role + Dostupnost)
      const candidates = employees.filter((emp) => {
        const pref = shift.availabilities.find((a) => a.userId === emp.id);
        return !pref || pref.type !== 'UNAVAILABLE';
      });

      // 4. --- VYLEPŠENÉ ŘAZENÍ (Preference + Férovost) ---
      candidates.sort((a, b) => {
        // A. Priorita 1: Kdo chce (PREFERRED) má přednost
        const prefA =
          shift.availabilities.find((p) => p.userId === a.id)?.type ===
          'PREFERRED';
        const prefB =
          shift.availabilities.find((p) => p.userId === b.id)?.type ===
          'PREFERRED';

        if (prefA && !prefB) return -1;
        if (!prefA && prefB) return 1;

        // B. Priorita 2: Kdo má méně odpracovaných hodin, jde dřív (Férovost)
        const loadA = workLoad.get(a.id) || 0;
        const loadB = workLoad.get(b.id) || 0;

        return loadA - loadB; // Seřadí od nejméně vytíženého po nejvíce
      });

      // 5. Přiřazování
      for (const candidate of candidates) {
        const userTimes = assignedInThisRun.get(candidate.id) || [];

        // Kontrola kolize v čase
        if (userTimes.includes(shiftTime)) continue;

        const isLegallyOk = await this.checkHardConstraints(
          candidate.id,
          shift,
          settings,
        );

        if (isLegallyOk) {
          const updated = await this.prisma.shift.update({
            where: { id: shift.id },
            data: { assignedUserId: candidate.id },
          });

          // --- AKTUALIZACE PAMĚTI A VYTÍŽENÍ ---
          userTimes.push(shiftTime);
          assignedInThisRun.set(candidate.id, userTimes);

          // Připočteme hodiny k vytížení zaměstnance
          const currentLoad = workLoad.get(candidate.id) || 0;
          workLoad.set(candidate.id, currentLoad + durationHours);

          results.push(updated);
          break;
        }
      }
    }

    return {
      message: `Rozděleno ${results.length} směn mezi zaměstnance.`,
      assignedCount: results.length,
    };
  }

  // --- 3. POMOCNÉ METODY (CONSTRAINTS & KALENDÁŘ) ---

  private async checkHardConstraints(
    userId: string,
    currentShift: any,
    settings: any,
  ): Promise<boolean> {
    const minRest = settings?.minRestBetweenShifts ?? 11;

    const previousShift = await this.prisma.shift.findFirst({
      where: {
        assignedUserId: userId,
        endDatetime: { lt: currentShift.startDatetime },
      },
      orderBy: { endDatetime: 'desc' },
    });

    if (previousShift) {
      const diffInHours =
        (new Date(currentShift.startDatetime).getTime() -
          new Date(previousShift.endDatetime).getTime()) /
        (1000 * 60 * 60);
      if (diffInHours < minRest) return false;
    }
    return true;
  }

  private generateCalendarDays(
    startDate: Date,
    endDate: Date,
    settings: any,
  ): string[] {
    const days: string[] = [];
    // Vytvoříme novou instanci, abychom neměnili původní datum z DB
    let current = new Date(startDate);
    const finalDate = new Date(endDate);

    // Bezpečnostní pojistka proti nekonečnému cyklu
    let safetyNet = 0;

    while (current <= finalDate && safetyNet < 366) {
      const dayOfWeek = current.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const skipWeekend = isWeekend && (!settings || !settings.workOnWeekends);

      if (!skipWeekend) {
        // Použijeme lokální formát YYYY-MM-DD bez časového posunu
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        days.push(`${year}-${month}-${day}`);
      }

      // Posuneme se na další den
      current.setDate(current.getDate() + 1);
      safetyNet++;
    }
    return days;
  }

  // --- 4. FINÁLNÍ PUBLIKACE ---

  async publishFinalSchedule(groupId: string) {
    await this.prisma.scheduleGroup.update({
      where: { id: groupId },
      data: { status: 'PUBLISHED' },
    });

    await this.prisma.shift.updateMany({
      where: { scheduleGroupId: groupId },
      data: { status: 'PUBLISHED' },
    });

    console.log(`--- NOTIFIKACE ---`);
    console.log(`Rozvrh ${groupId} publikován. Odesílám echo zaměstnancům.`);

    return { message: 'Rozvrh byl úspěšně publikován.' };
  }

  */
