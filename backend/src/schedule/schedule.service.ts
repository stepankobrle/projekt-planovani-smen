import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ScheduleStatus, Shift, ShiftStatus } from '@prisma/client';

@Injectable()
export class ScheduleService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

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
            jobPosition: true,
            location: true,
          },
          orderBy: {
            startDatetime: 'asc',
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
    // Načteme skupinu kvůli locationId, year, month pro notifikace
    const group = await this.prisma.scheduleGroup.findUnique({
      where: { id },
      select: { locationId: true, year: true, month: true },
    });
    if (!group) throw new NotFoundException('Rozvrh nenalezen.');

    const result = await this.prisma.$transaction([
      this.prisma.scheduleGroup.update({
        where: { id },
        data: { status: status as ScheduleStatus },
      }),
      this.prisma.shift.updateMany({
        where: { scheduleGroupId: id },
        data: { status: status as ShiftStatus },
      }),
    ]);

    if (status === 'PREFERENCES' || status === 'PUBLISHED') {
      const users = await this.prisma.profile.findMany({
        where: { locationId: group.locationId, isActivated: true },
        select: { id: true },
      });
      const userIds = users.map((u) => u.id);
      const period = `${group.month}/${group.year}`;
      const message =
        status === 'PREFERENCES'
          ? `Byl otevřen sběr preferencí pro ${period}. Zadejte svou dostupnost.`
          : `Rozvrh pro ${period} byl publikován.`;

      await this.notifications.notifyUsers(userIds, group.locationId, message, 'INFO');
    }

    return result;
  }

  // AUTOMATICKÉ PŘIŘAZENÍ
  async runAutoAssignment(locationId: number, dateFrom: Date, dateTo: Date) {
    const settings = await this.prisma.organizationSettings.findFirst();
    const minRestHours = settings?.minRestBetweenShifts ?? 11;
    // 1. Načtení směn k přiřazení (pouze v aktuálním okně)
    const shiftsToAssign = await this.prisma.shift.findMany({
      where: {
        locationId,
        status: { in: ['DRAFT', 'PREFERENCES', 'GENERATED'] },
        assignedUserId: null,
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      include: { availabilities: true, shiftType: true },
      orderBy: { startDatetime: 'asc' },
    });

    const employees = await this.prisma.profile.findMany({
      where: { locationId, role: 'EMPLOYEE', isActivated: true },
      include: { jobPosition: true, employmentContract: true },
    });

    // --- ŘAZENÍ SMĚN PODLE OBTÍŽNOSTI (nejméně kandidátů = první) ---
    // Greedy algoritmus tak nejprve obsadí "nejtěžší" směny a nevyčerpá
    // vzácné zaměstnance na snadné směny předem.
    const shiftsWithDifficulty = shiftsToAssign.map((shift) => {
      const count = employees.filter((emp) => {
        if (emp.jobPositionId !== shift.jobPositionId) return false;
        const pref = shift.availabilities.find((a) => a.userId === emp.id);
        if (pref?.type === 'UNAVAILABLE') return false;
        return true;
      }).length;
      return { shift, count };
    });
    shiftsWithDifficulty.sort((a, b) => a.count - b.count);
    const orderedShifts = shiftsWithDifficulty.map((s) => s.shift);

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

    // --- DOVOLENÉ: Výpočet hodin dovolené v aktuálním období pro každého zaměstnance ---
    // Zahrnujeme do celkového vytížení pro spravedlivé rank-based skórování
    const vacationHours = new Map<string, number>();
    for (const emp of employees) vacationHours.set(emp.id, 0);
    for (const v of approvedVacations) {
      const overlapStart = new Date(Math.max(v.startDate.getTime(), dateFrom.getTime()));
      const overlapEnd   = new Date(Math.min(v.endDate.getTime(), dateTo.getTime()));
      if (overlapStart <= overlapEnd) {
        const days = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / 864e5) + 1;
        vacationHours.set(v.userId, (vacationHours.get(v.userId) ?? 0) + days * 8);
      }
    }

    // --- DPP: Načtení hodin odpracovaných před tímto obdobím v daném roce ---
    const yearStart = new Date(dateFrom.getFullYear(), 0, 1);
    const dppIds = employees
      .filter((e) => e.employmentContract?.type === 'DPP')
      .map((e) => e.id);

    const dppPrePeriodHours = new Map<string, number>();
    if (dppIds.length > 0) {
      const prePeriodShifts = await this.prisma.shift.findMany({
        where: {
          assignedUserId: { in: dppIds },
          startDatetime: { gte: yearStart, lt: dateFrom },
        },
        select: {
          assignedUserId: true,
          startDatetime: true,
          endDatetime: true,
        },
      });
      for (const s of prePeriodShifts) {
        if (!s.assignedUserId) continue;
        const dur =
          (s.endDatetime.getTime() - s.startDatetime.getTime()) / 36e5;
        const net = dur >= 6 ? dur - 0.5 : dur;
        dppPrePeriodHours.set(
          s.assignedUserId,
          (dppPrePeriodHours.get(s.assignedUserId) ?? 0) + net,
        );
      }
    }

    // --- DPČ: Stropní limit hodin pro dané plánovací období ---
    // Zákon: průměr max 20h/týden za celé trvání dohody (§ 76 ZP)
    const periodWeeks =
      (dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24 * 7);
    const dpcPeriodCap = Math.ceil(periodWeeks) * 20;

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
    const assignments: { shiftId: string; userId: string }[] = [];
    const assignedShiftIds: string[] = [];
    const unassignedShifts: {
      shiftId: string;
      startDatetime: Date;
      jobPositionId: number | null;
      reason: string;
    }[] = [];

    // --- NUMERICKÉ SKÓROVÁNÍ KANDIDÁTŮ ---
    // Preference (+100) > férovost vytížení (max +50) > kontinuita bloků (+10)
    const scoreCandidates = (
      emp: (typeof employees)[0],
      shift: (typeof shiftsToAssign)[0],
      rankScore: number,
    ): number => {
      let score = 0;

      const prefType = shift.availabilities.find(
        (p) => p.userId === emp.id,
      )?.type;
      if (prefType === 'PREFERRED') score += 100;

      // Rank-based férovost: 1.místo=100, 2.=80, 3.=60, 4.=40, 5.=20, 6+.=0
      // Zahrnuje odpracované hodiny + hodiny dovolené v aktuálním období
      score += rankScore;

      // Kontinuita: pracoval den před touto směnou → méně přepínání pro zaměstnance
      const yesterday = new Date(shift.startDatetime);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const workedYesterday = (userSchedules.get(emp.id) ?? []).some(
        (s) => s.dateStr === yesterdayStr,
      );
      if (workedYesterday) score += 10;

      return score;
    };

    // --- HLAVNÍ CYKLUS PŘIŘAZOVÁNÍ ---
    for (const shift of orderedShifts) {
      const shiftStart = shift.startDatetime.getTime();
      const shiftEnd = shift.endDatetime.getTime();

      // --- 1. ZÁKONNÁ KONTROLA: MAX DÉLKA SMĚNY (§ 83) ---
      const rawDuration = (shiftEnd - shiftStart) / 36e5;
      if (rawDuration > 12) {
        console.warn(
          `Směna ${shift.id} je delší než 12h, automat ji přeskočí.`,
        );
        unassignedShifts.push({
          shiftId: shift.id,
          startDatetime: shift.startDatetime,
          jobPositionId: shift.jobPositionId,
          reason: 'shift_too_long',
        });
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

        // A2. DPP: zákonný limit 300 hodin za kalendářní rok (§ 75 ZP)
        if (emp.employmentContract?.type === 'DPP') {
          const preHours = dppPrePeriodHours.get(emp.id) ?? 0;
          const periodHours = workLoad.get(emp.id) ?? 0;
          if (preHours + periodHours + netDuration > 300) return false;
        }

        // A3. DPČ: průměr max 20h/týden za plánovací období (§ 76 ZP)
        if (emp.employmentContract?.type === 'DPC') {
          const periodHours = workLoad.get(emp.id) ?? 0;
          if (periodHours + netDuration > dpcPeriodCap) return false;
        }

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

        // F. Týdenní norma max 40h pro HPP/ICO (§ 48 ZP)
        if (
          emp.employmentContract?.type === 'HPP' ||
          emp.employmentContract?.type === 'ICO' ||
          !emp.employmentContract
        ) {
          const weekStartDate = new Date(shiftStart);
          const day = weekStartDate.getDay();
          // Posunout na pondělí (EU týden)
          weekStartDate.setDate(weekStartDate.getDate() - (day === 0 ? 6 : day - 1));
          weekStartDate.setHours(0, 0, 0, 0);
          const weekStartMs = weekStartDate.getTime();
          const weekEndMs = weekStartMs + 7 * 24 * 3600 * 1000;

          const weekHours = schedule
            .filter((s) => s.start >= weekStartMs && s.start < weekEndMs)
            .reduce((sum, s) => sum + (s.end - s.start) / 36e5, 0);

          if (weekHours + netDuration > 40) return false;
        }

        return true;
      });

      // KROK B: Rank-based skóre férovosti — seřazení dle hodin (směny + dovolená)
      const sortedByLoad = [...viableCandidates].sort((a, b) => {
        const hoursA = (workLoad.get(a.id) ?? 0) + (vacationHours.get(a.id) ?? 0);
        const hoursB = (workLoad.get(b.id) ?? 0) + (vacationHours.get(b.id) ?? 0);
        return hoursA - hoursB;
      });
      const rankScoreMap = new Map<string, number>();
      sortedByLoad.forEach((emp, index) => {
        rankScoreMap.set(emp.id, Math.max(0, 100 - index * 20));
      });

      // KROK B: Rozdělení na Standard a Přesčas
      let bestCandidate: (typeof employees)[0] | null = null;

      const standardCandidates = viableCandidates.filter((emp) => {
        const currentLoad = workLoad.get(emp.id) || 0;
        const target = Number(emp.targetHoursPerMonth) || 160;
        return currentLoad + netDuration <= target;
      });

      if (standardCandidates.length > 0) {
        standardCandidates.sort(
          (a, b) => scoreCandidates(b, shift, rankScoreMap.get(b.id) ?? 0) - scoreCandidates(a, shift, rankScoreMap.get(a.id) ?? 0),
        );
        bestCandidate = standardCandidates[0];
      } else if (viableCandidates.length > 0) {
        // Fallback: přesčas (zohledníme preference i zde)
        viableCandidates.sort(
          (a, b) => scoreCandidates(b, shift, rankScoreMap.get(b.id) ?? 0) - scoreCandidates(a, shift, rankScoreMap.get(a.id) ?? 0),
        );
        bestCandidate = viableCandidates[0];
      }

      // KROK C: Zaznamenání přiřazení (zápis do DB proběhne hromadně po cyklu)
      if (bestCandidate) {
        assignments.push({ shiftId: shift.id, userId: bestCandidate.id });

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

        assignedShiftIds.push(shift.id);
      } else {
        unassignedShifts.push({
          shiftId: shift.id,
          startDatetime: shift.startDatetime,
          jobPositionId: shift.jobPositionId,
          reason:
            viableCandidates.length === 0
              ? 'no_eligible_candidates'
              : 'all_at_capacity',
        });
      }
    }

    // FÁZE 2: LOCAL SEARCH — iterativní zlepšování swapem přiřazení
    const shiftMap = new Map(shiftsToAssign.map((s) => [s.id, s]));
    const getNet = (s: (typeof shiftsToAssign)[0]): number => {
      const raw = (s.endDatetime.getTime() - s.startDatetime.getTime()) / 36e5;
      if (raw >= 11) return raw - 1.0;
      if (raw >= 6) return raw - 0.5;
      return raw;
    };

    const MAX_LS_ITERATIONS = 300;
    let lsImproved = true;
    let lsIteration = 0;

    while (lsImproved && lsIteration < MAX_LS_ITERATIONS) {
      lsImproved = false;
      lsIteration++;

      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const asgA = assignments[i];
          const asgB = assignments[j];
          if (asgA.userId === asgB.userId) continue;

          const shiftA = shiftMap.get(asgA.shiftId);
          const shiftB = shiftMap.get(asgB.shiftId);
          if (!shiftA || !shiftB) continue;

          const empA = employees.find((e) => e.id === asgA.userId)!;
          const empB = employees.find((e) => e.id === asgB.userId)!;
          const netA = getNet(shiftA);
          const netB = getNet(shiftB);

          const schedAWithout = (userSchedules.get(empA.id) ?? []).filter(
            (s) => !(s.start === shiftA.startDatetime.getTime() && s.end === shiftA.endDatetime.getTime()),
          );
          const schedBWithout = (userSchedules.get(empB.id) ?? []).filter(
            (s) => !(s.start === shiftB.startDatetime.getTime() && s.end === shiftB.endDatetime.getTime()),
          );
          const loadAWithout = (workLoad.get(empA.id) ?? 0) - netA;
          const loadBWithout = (workLoad.get(empB.id) ?? 0) - netB;

          const aCanDoB = this.canWorkShift(empA, shiftB, schedAWithout, loadAWithout, approvedVacations, minRestHours, dppPrePeriodHours, dpcPeriodCap, netB);
          const bCanDoA = this.canWorkShift(empB, shiftA, schedBWithout, loadBWithout, approvedVacations, minRestHours, dppPrePeriodHours, dpcPeriodCap, netA);
          if (!aCanDoB || !bCanDoA) continue;

          const newWorkLoad = new Map(workLoad);
          newWorkLoad.set(empA.id, loadAWithout + netB);
          newWorkLoad.set(empB.id, loadBWithout + netA);

          const prefLostA = shiftA.availabilities.find((a) => a.userId === empA.id)?.type === 'PREFERRED' ? 1 : 0;
          const prefLostB = shiftB.availabilities.find((a) => a.userId === empB.id)?.type === 'PREFERRED' ? 1 : 0;
          const prefGainedA = shiftB.availabilities.find((a) => a.userId === empA.id)?.type === 'PREFERRED' ? 1 : 0;
          const prefGainedB = shiftA.availabilities.find((a) => a.userId === empB.id)?.type === 'PREFERRED' ? 1 : 0;
          const prefDelta = (prefGainedA + prefGainedB) - (prefLostA + prefLostB);

          const varianceImprovement = this.computeVariance(workLoad) - this.computeVariance(newWorkLoad);
          if (varianceImprovement + prefDelta * 10 <= 0.01) continue;

          asgA.userId = empB.id;
          asgB.userId = empA.id;
          workLoad.set(empA.id, loadAWithout + netB);
          workLoad.set(empB.id, loadBWithout + netA);
          userSchedules.set(empA.id, [...schedAWithout, { start: shiftB.startDatetime.getTime(), end: shiftB.endDatetime.getTime(), dateStr: shiftB.startDatetime.toISOString().split('T')[0] }]);
          userSchedules.set(empB.id, [...schedBWithout, { start: shiftA.startDatetime.getTime(), end: shiftA.endDatetime.getTime(), dateStr: shiftA.startDatetime.toISOString().split('T')[0] }]);
          lsImproved = true;
        }
      }
    }

    // --- HROMADNÝ ZÁPIS DO DB V JEDNÉ TRANSAKCI ---
    if (assignments.length > 0) {
      await this.prisma.$transaction(
        assignments.map(({ shiftId, userId }) =>
          this.prisma.shift.update({
            where: { id: shiftId },
            data: { assignedUserId: userId },
          }),
        ),
      );
    }

    return {
      message: `Automaticky přiděleno ${assignedShiftIds.length} z ${shiftsToAssign.length} směn.`,
      assignedCount: assignedShiftIds.length,
      unassignedCount: unassignedShifts.length,
      unassigned: unassignedShifts,
    };
  }

  private computeVariance(workLoad: Map<string, number>): number {
    const values = [...workLoad.values()];
    if (values.length === 0) return 0;
    const mean = values.reduce((s, v) => s + v, 0) / values.length;
    return values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  }

  private canWorkShift(
    emp: { id: string; jobPositionId: number | null; employmentContract: { type: string } | null },
    shift: { startDatetime: Date; endDatetime: Date; jobPositionId: number | null },
    schedule: { start: number; end: number; dateStr: string }[],
    currentLoad: number,
    approvedVacations: { userId: string; startDate: Date; endDate: Date }[],
    minRestHours: number,
    dppPrePeriodHours: Map<string, number>,
    dpcPeriodCap: number,
    netDuration: number,
  ): boolean {
    const shiftStart = shift.startDatetime.getTime();
    const shiftEnd = shift.endDatetime.getTime();

    if (emp.jobPositionId !== shift.jobPositionId) return false;

    if (emp.employmentContract?.type === 'DPP') {
      if ((dppPrePeriodHours.get(emp.id) ?? 0) + currentLoad + netDuration > 300) return false;
    }
    if (emp.employmentContract?.type === 'DPC') {
      if (currentLoad + netDuration > dpcPeriodCap) return false;
    }

    const onVacation = approvedVacations.some((v) => {
      if (v.userId !== emp.id) return false;
      const vs = new Date(v.startDate); vs.setHours(0, 0, 0, 0);
      const ve = new Date(v.endDate); ve.setHours(23, 59, 59, 999);
      return shiftStart < ve.getTime() && shiftEnd > vs.getTime();
    });
    if (onVacation) return false;

    if (schedule.some((s) => shiftStart < s.end && shiftEnd > s.start)) return false;

    if (schedule.some((s) => {
      const after = (shiftStart - s.end) / 36e5;
      const before = (s.start - shiftEnd) / 36e5;
      return (after >= 0 && after < minRestHours) || (before >= 0 && before < minRestHours);
    })) return false;

    let streak = 0;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(shift.startDatetime);
      d.setDate(d.getDate() - i);
      if (schedule.some((s) => s.dateStr === d.toISOString().split('T')[0])) streak++;
      else break;
    }
    if (streak >= 6) return false;

    if (!emp.employmentContract || emp.employmentContract.type === 'HPP' || emp.employmentContract.type === 'ICO') {
      const wd = new Date(shiftStart);
      const day = wd.getDay();
      wd.setDate(wd.getDate() - (day === 0 ? 6 : day - 1));
      wd.setHours(0, 0, 0, 0);
      const weekMs = wd.getTime();
      const weekHours = schedule
        .filter((s) => s.start >= weekMs && s.start < weekMs + 7 * 24 * 3600 * 1000)
        .reduce((sum, s) => sum + (s.end - s.start) / 36e5, 0);
      if (weekHours + netDuration > 40) return false;
    }

    return true;
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
