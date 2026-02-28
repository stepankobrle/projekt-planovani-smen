import { Test, TestingModule } from '@nestjs/testing';
import { ScheduleService } from './schedule.service';
import { PrismaService } from '../prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

// --- Pomocné typy ---
type ShiftSeed = {
  id: string;
  locationId: number;
  startDatetime: Date;
  endDatetime: Date;
  status: string;
  assignedUserId: string | null;
  jobPositionId: number;
  availabilities: { userId: string; type: string }[];
  shiftType: null;
};

type EmployeeSeed = {
  id: string;
  locationId: number;
  role: string;
  isActivated: boolean;
  jobPositionId: number;
  targetHoursPerMonth: number;
  jobPosition: { isManagerial: boolean } | null;
  employmentContract: { type: string } | null;
};

// --- Továrna na datum (UTC) ---
const d = (hour: number, dayOffset = 0) => {
  const date = new Date('2026-03-01T00:00:00Z');
  date.setDate(date.getDate() + dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
};

const makeShift = (id: string, startHour: number, dayOffset = 0, durationH = 8, extras = {}): ShiftSeed => ({
  id,
  locationId: 1,
  startDatetime: d(startHour, dayOffset),
  endDatetime: d(startHour + durationH, dayOffset),
  status: 'DRAFT',
  assignedUserId: null,
  jobPositionId: 1,
  availabilities: [],
  shiftType: null,
  ...extras,
});

const makeEmployee = (id: string, extras = {}): EmployeeSeed => ({
  id,
  locationId: 1,
  role: 'EMPLOYEE',
  isActivated: true,
  jobPositionId: 1,
  targetHoursPerMonth: 160,
  jobPosition: null,
  employmentContract: null,
  ...extras,
});

const makeNotificationsMock = () => ({
  notifyUsers: jest.fn().mockResolvedValue(undefined),
  notifyUser: jest.fn().mockResolvedValue(undefined),
  notifyAdminsInLocation: jest.fn().mockResolvedValue(undefined),
});

// Sestaví PrismaService mock s předdefinovanými daty
const buildPrismaMock = (
  shifts: ShiftSeed[],
  employees: EmployeeSeed[],
  assigned: { assignedUserId: string; startDatetime: Date; endDatetime: Date }[] = [],
  dppPrePeriod: { assignedUserId: string; startDatetime: Date; endDatetime: Date }[] = [],
  settings: { minRestBetweenShifts: number } | null = { minRestBetweenShifts: 11 },
) => {
  let callCount = 0;

  return {
    organizationSettings: { findFirst: jest.fn().mockResolvedValue(settings) },
    shift: {
      findMany: jest.fn().mockImplementation(() => {
        const n = callCount++;
        if (n === 0) return Promise.resolve(shifts);        // shiftsToAssign
        if (n === 1) return Promise.resolve(assigned);       // alreadyAssigned (lookback)
        return Promise.resolve(dppPrePeriod);                // DPP pre-period
      }),
      update: jest.fn().mockImplementation(({ where, data }: { where: { id: string }; data: object }) =>
        Promise.resolve({ id: where.id, ...data }),
      ),
    },
    profile: { findMany: jest.fn().mockResolvedValue(employees) },
    vacationRequest: { findMany: jest.fn().mockResolvedValue([]) },
    scheduleGroup: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((args: { data: object }) =>
        Promise.resolve({ id: 'grp-1', ...args.data }),
      ),
    },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 0 }) },
  };
};

const buildService = async (prismaMock: object) => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ScheduleService,
      { provide: PrismaService, useValue: prismaMock },
      { provide: NotificationsService, useValue: makeNotificationsMock() },
    ],
  }).compile();
  return module.get<ScheduleService>(ScheduleService);
};

const dateFrom = new Date('2026-03-01T00:00:00Z');
const dateTo   = new Date('2026-03-31T23:59:59Z');

// ===================================================================
describe('ScheduleService.runAutoAssignment', () => {

  it('přiřadí zaměstnance k volné směně', async () => {
    const prisma = buildPrismaMock([makeShift('s1', 8)], [makeEmployee('e1')]);
    const svc = await buildService(prisma);

    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.message).toMatch('1 z 1');
    expect(prisma.shift.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 's1' }, data: { assignedUserId: 'e1' } }),
    );
  });

  it('nepřiřadí zaměstnance označeného UNAVAILABLE', async () => {
    const shift = makeShift('s1', 8, 0, 8, {
      availabilities: [{ userId: 'e1', type: 'UNAVAILABLE' }],
    });
    const prisma = buildPrismaMock([shift], [makeEmployee('e1')]);
    const svc = await buildService(prisma);

    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.unassignedCount).toBe(1);
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('respektuje minimální odpočinek 11 hodin (§ 90)', async () => {
    // Zaměstnanec skončil ve 02:00, nová směna začíná v 10:00 (8h — méně než 11h)
    const assigned = [{ assignedUserId: 'e1', startDatetime: d(18, -1), endDatetime: d(2) }];
    const newShift = makeShift('s2', 10, 0); // začátek v 10:00 = jen 8h od konce v 02:00

    const prisma = buildPrismaMock([newShift], [makeEmployee('e1')], assigned);
    const svc = await buildService(prisma);

    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.unassignedCount).toBe(1);
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('dá přednost zaměstnanci s preferencí PREFERRED před AVAILABLE', async () => {
    const shift = makeShift('s1', 8, 0, 8, {
      availabilities: [
        { userId: 'e1', type: 'AVAILABLE' },
        { userId: 'e2', type: 'PREFERRED' },
      ],
    });
    const prisma = buildPrismaMock([shift], [makeEmployee('e1'), makeEmployee('e2')]);
    const svc = await buildService(prisma);

    await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(prisma.shift.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assignedUserId: 'e2' } }),
    );
  });

  it('ponechá směnu nepřiřazenou pokud nejsou žádní kandidáti', async () => {
    const prisma = buildPrismaMock([makeShift('s1', 8)], []);
    const svc = await buildService(prisma);

    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.unassignedCount).toBe(1);
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('přeskočí směnu delší než 12 hodin (§ 83)', async () => {
    const prisma = buildPrismaMock([makeShift('s1', 6, 0, 13)], [makeEmployee('e1')]);
    const svc = await buildService(prisma);

    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.unassignedCount).toBe(1);
    expect(prisma.shift.update).not.toHaveBeenCalled();
  });

  it('nepřiřadí DPP zaměstnance pokud překročí 300h/rok (§ 75)', async () => {
    // 8h směna → čistých 7.5h (odečtení 0.5h přestávky)
    // 40 × 7.5 = 300h odpracováno předem → 300 + 7.5 = 307.5 > 300 → filtr vyřadí
    const prePeriodShifts = Array.from({ length: 40 }, (_, i) => ({
      assignedUserId: 'e1',
      startDatetime: d(8, -(i + 1)),
      endDatetime: d(16, -(i + 1)),
    }));

    const emp = makeEmployee('e1', { employmentContract: { type: 'DPP' } });

    let callCount = 0;
    const prisma = buildPrismaMock([], [], [], []);
    prisma.shift.findMany = jest.fn().mockImplementation(() => {
      const n = callCount++;
      if (n === 0) return Promise.resolve([makeShift('s1', 8)]);  // shifts to assign
      if (n === 1) return Promise.resolve([]);                     // already assigned
      return Promise.resolve(prePeriodShifts);                     // DPP pre-period
    });
    prisma.profile.findMany = jest.fn().mockResolvedValue([emp]);

    const svc = await buildService(prisma);
    const result = await svc.runAutoAssignment(1, dateFrom, dateTo);

    expect(result.unassignedCount).toBe(1);
  });

  it('vyrovná zátěž — méně vytíženému přiřadí dříve', async () => {
    const [s1, s2] = [makeShift('s1', 8, 0), makeShift('s2', 8, 1)];
    const emp1 = makeEmployee('e1');
    const emp2 = makeEmployee('e2');

    // emp1 má již 80h odpracováno v tomto období
    const emp1Assigned = Array.from({ length: 10 }, (_, i) => ({
      assignedUserId: 'e1',
      startDatetime: d(8, -(i * 2 + 2)),
      endDatetime: d(16, -(i * 2 + 2)),
    }));

    const prisma = buildPrismaMock([s1, s2], [emp1, emp2], emp1Assigned);
    const svc = await buildService(prisma);

    await svc.runAutoAssignment(1, dateFrom, dateTo);

    // emp2 (méně vytížený — 0h) by měl dostat alespoň jednu z těchto směn
    const calls = (prisma.shift.update as jest.Mock).mock.calls;
    const assignedToEmp2 = calls.some(
      ([arg]: [{ data: { assignedUserId: string } }]) => arg.data.assignedUserId === 'e2',
    );
    expect(assignedToEmp2).toBe(true);
  });
});

// ===================================================================
describe('ScheduleService.createNextMonth', () => {

  it('vytvoří skupinu pro aktuální měsíc pokud DB je prázdná', async () => {
    const prisma = buildPrismaMock([], []);
    const svc = await buildService(prisma);

    const result = await svc.createNextMonth(1);

    const now = new Date();
    expect(result.year).toBe(now.getFullYear());
    expect(result.month).toBe(now.getMonth() + 1);
    expect(result.calendarDays.length).toBeGreaterThan(27);
  });

  it('navazuje na existující měsíc prosinec → leden nového roku', async () => {
    const prisma = buildPrismaMock([], []);
    prisma.scheduleGroup.findFirst = jest.fn().mockResolvedValue({
      year: 2026, month: 12, locationId: 1,
    });
    const svc = await buildService(prisma);

    const result = await svc.createNextMonth(1);

    expect(result.year).toBe(2027);
    expect(result.month).toBe(1);
  });

  it('calendarDays odpovídají správnému počtu dní v měsíci', async () => {
    const prisma = buildPrismaMock([], []);
    prisma.scheduleGroup.findFirst = jest.fn().mockResolvedValue({
      year: 2026, month: 1, locationId: 1, // Únor 2026 = 28 dní
    });
    const svc = await buildService(prisma);

    const result = await svc.createNextMonth(1);

    expect(result.month).toBe(2);
    expect(result.calendarDays).toHaveLength(28); // 2026 není přestupný rok
  });
});
