import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ScheduleStatus, Shift, ShiftStatus } from '@prisma/client';

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

  async updateStatus(id: string, status: string) {
    return this.prisma.$transaction([
      this.prisma.scheduleGroup.update({
        where: { id },
        data: {
          status: status as ScheduleStatus,
        },
      }),
      this.prisma.shift.updateMany({
        where: { scheduleGroupId: id },
        data: {
          status: status as ShiftStatus,
        },
      }),
    ]);
  }

  // AUTOMATICKÉ PŘIŘAZENÍ
  async runAutoAssignment(locationId: number, dateFrom: Date, dateTo: Date) {
    const settings = await this.prisma.organizationSettings.findFirst();
    const minRestHours = settings?.minRestBetweenShifts ?? 11;
    // 1. Načtení směn k přiřazení (pouze v aktuálním okně)
    const shiftsToAssign = await this.prisma.shift.findMany({
      where: {
        locationId,
        status: 'DRAFT',
        assignedUserId: null,
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      include: { availabilities: true, shiftType: true },
      orderBy: { startDatetime: 'asc' },
    });

    const employees = await this.prisma.profile.findMany({
      where: { locationId, role: 'EMPLOYEE', isActivated: true },
      include: { jobPosition: true },
    });
    // 2. INIT WORKLOAD & HISTORIE
    // Načteme historii i 7 dní PŘED začátkem, abychom viděli "streaky" (šňůry směn) z minulého měsíce
    const lookBackDate = new Date(dateFrom);
    lookBackDate.setDate(lookBackDate.getDate() - 7);

    const alreadyAssigned = await this.prisma.shift.findMany({
      where: {
        locationId,
        assignedUserId: { not: null },
        startDatetime: { gte: lookBackDate, lte: dateTo }, // <--- Tady je ta změna pro historii
      },
    });

    // Načteme schválené dovolené pro celé přiřazované období (jeden dotaz před cyklem)
    const approvedVacations = await this.prisma.vacationRequest.findMany({
      where: {
        status: 'APPROVED',
        user: { locationId },
        startDate: { lte: dateTo },
        endDate: { gte: dateFrom },
      },
      select: { userId: true, startDate: true, endDate: true },
    });

    const workLoad = new Map<string, number>();
    const userSchedules = new Map<
      string,
      { start: number; end: number; dateStr: string }[]
    >();
    // Inicializace map
    for (const emp of employees) {
      workLoad.set(emp.id, 0);
      userSchedules.set(emp.id, []);
    }
    // Naplnění existujícími daty
    for (const s of alreadyAssigned) {
      if (!s.assignedUserId) continue;

      // Zde počítáme workload (jen pro směny v aktuálním měsíci, ne ty z historie)
      const isInCurrentPeriod = s.startDatetime >= dateFrom;

      let shiftDuration =
        (s.endDatetime.getTime() - s.startDatetime.getTime()) / 36e5;
      // Korekce přestávky pro existující směny
      if (shiftDuration >= 6) shiftDuration -= 0.5;

      if (isInCurrentPeriod) {
        workLoad.set(
          s.assignedUserId,
          (workLoad.get(s.assignedUserId) || 0) + shiftDuration,
        );
      }
      // Schedule ale plníme vším (i historií), kvůli kontrole odpočinku a streaku
      const schedule = userSchedules.get(s.assignedUserId) || [];
      schedule.push({
        start: s.startDatetime.getTime(),
        end: s.endDatetime.getTime(),
        // Uložíme si string data pro snadnou kontrolu "dní v řadě" (YYYY-MM-DD)
        dateStr: s.startDatetime.toISOString().split('T')[0],
      });
      userSchedules.set(s.assignedUserId, schedule);
    }
    const assignedResults: string[] = [];
    // --- POMOCNÁ FUNKCE PRO ŘAZENÍ ---
    // Tímto zajistíme, že logika je stejná pro standardní i přesčasové kandidáty
    const sortCandidates = (
      a: (typeof employees)[0],
      b: (typeof employees)[0],
      currentShift: (typeof shiftsToAssign)[0],
    ) => {
      // 1. Kritérium: PREFERENCE (Kdo chce, vyhrává)
      const prefA =
        currentShift.availabilities.find((p) => p.userId === a.id)?.type ===
        'PREFERRED';
      const prefB =
        currentShift.availabilities.find((p) => p.userId === b.id)?.type ===
        'PREFERRED';

      if (prefA && !prefB) return -1; // A má přednost
      if (!prefA && prefB) return 1; // B má přednost

      // 2. Kritérium: VYTÍŽENÍ (Kdo má méně hodin, vyhrává - férovost)
      const loadA = workLoad.get(a.id) || 0;
      const loadB = workLoad.get(b.id) || 0;
      return loadA - loadB;
    };

    // --- HLAVNÍ CYKLUS PŘIŘAZOVÁNÍ ---
    for (const shift of shiftsToAssign) {
      const shiftStart = shift.startDatetime.getTime();
      const shiftEnd = shift.endDatetime.getTime();

      // --- 1. ZÁKONNÁ KONTROLA: MAX DÉLKA SMĚNY (§ 83) ---
      const rawDuration = (shiftEnd - shiftStart) / 36e5;
      if (rawDuration > 12) {
        console.warn(
          `Směna ${shift.id} je delší než 12h, automat ji přeskočí.`,
        );
        continue;
      }

      // --- 2. ZÁKONNÁ KONTROLA: PŘESTÁVKA NA JÍDLO (§ 88) ---
      let netDuration = rawDuration;
      if (rawDuration >= 11) {
        netDuration -= 1.0;
      } else if (rawDuration >= 6) {
        netDuration -= 0.5;
      }

      // KROK A: Filtrace kandidátů (Technické a Zákonné filtry)
      let viableCandidates = employees.filter((emp) => {
        // A. Pozice
        if (emp.jobPositionId !== shift.jobPositionId) return false;

        // B. Dostupnost
        const pref = shift.availabilities.find((a) => a.userId === emp.id);
        if (pref?.type === 'UNAVAILABLE') return false;

        const schedule = userSchedules.get(emp.id) || [];

        // C. Kolize (Double booking)
        const hasOverlap = schedule.some(
          (s) => shiftStart < s.end && shiftEnd > s.start,
        );
        if (hasOverlap) return false;

        // D. Denní odpočinek (11h mezi směnami - § 90)
        const hasRestViolation = schedule.some((s) => {
          const diffAfter = (shiftStart - s.end) / 36e5;
          const diffBefore = (s.start - shiftEnd) / 36e5;
          return (
            (diffAfter >= 0 && diffAfter < minRestHours) ||
            (diffBefore >= 0 && diffBefore < minRestHours)
          );
        });
        if (hasRestViolation) return false;

        // --- 3. ZÁKONNÁ KONTROLA: TÝDENNÍ ODPOČINEK (§ 92) ---
        let streak = 0;
        const currentShiftDate = new Date(shift.startDatetime);

        for (let i = 1; i <= 6; i++) {
          const checkDate = new Date(currentShiftDate);
          checkDate.setDate(checkDate.getDate() - i);
          const dateStrToCheck = checkDate.toISOString().split('T')[0];

          const workedOnDay = schedule.some(
            (s) => s.dateStr === dateStrToCheck,
          );
          if (workedOnDay) streak++;
          else break;
        }

        if (streak >= 6) return false;

        // E. Schválená dovolená — směna překrývá období dovolené
        const onVacation = approvedVacations.some((v) => {
          if (v.userId !== emp.id) return false;
          const vacStart = new Date(v.startDate);
          vacStart.setHours(0, 0, 0, 0);
          const vacEnd = new Date(v.endDate);
          vacEnd.setHours(23, 59, 59, 999);
          return shiftStart < vacEnd.getTime() && shiftEnd > vacStart.getTime();
        });
        if (onVacation) return false;

        return true;
      });

      // KROK B: Rozdělení na Standard a Přesčas
      let bestCandidate: (typeof employees)[0] | null = null;

      const standardCandidates = viableCandidates.filter((emp) => {
        const currentLoad = workLoad.get(emp.id) || 0;
        const target = Number(emp.targetHoursPerMonth) || 160;
        return currentLoad + netDuration <= target;
      });

      if (standardCandidates.length > 0) {
        // 1. Zkusíme naplnit základní úvazky (s ohledem na preference)
        // POUŽITÍ POMOCNÉ FUNKCE:
        standardCandidates.sort((a, b) => sortCandidates(a, b, shift));
        bestCandidate = standardCandidates[0];
      } else if (viableCandidates.length > 0) {
        // 2. Musíme jít do přesčasů
        // I TADY chceme zohlednit preference (pokud někdo chce přesčas dobrovolně)
        // POUŽITÍ POMOCNÉ FUNKCE:
        viableCandidates.sort((a, b) => sortCandidates(a, b, shift));
        bestCandidate = viableCandidates[0];
      }

      // KROK C: Zápis
      if (bestCandidate) {
        await this.prisma.shift.update({
          where: { id: shift.id },
          data: { assignedUserId: bestCandidate.id },
        });

        // Aktualizace lokálního stavu
        const currentL = workLoad.get(bestCandidate.id) || 0;
        workLoad.set(bestCandidate.id, currentL + netDuration);

        const sched = userSchedules.get(bestCandidate.id) || [];
        sched.push({
          start: shiftStart,
          end: shiftEnd,
          dateStr: shift.startDatetime.toISOString().split('T')[0],
        });
        userSchedules.set(bestCandidate.id, sched);

        assignedResults.push(shift.id);
      }
    }

    return {
      message: `Automaticky přiděleno ${assignedResults.length} z ${shiftsToAssign.length} směn.`,
      unassignedCount: shiftsToAssign.length - assignedResults.length,
    };
  }

  async runAutoAssignmentForGroup(groupId: string) {
    // 1. Najdeme skupinu (měsíc)
    const group = await this.prisma.scheduleGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) throw new NotFoundException('Rozvrh (skupina) nenalezen.');

    const dateFrom = new Date(group.year, group.month - 1, 1);
    const dateTo = new Date(group.year, group.month, 0);
    dateTo.setHours(23, 59, 59, 999);

    // 2. Zavoláme tvou hlavní logiku
    return this.runAutoAssignment(group.locationId, dateFrom, dateTo);
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

  /*
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
