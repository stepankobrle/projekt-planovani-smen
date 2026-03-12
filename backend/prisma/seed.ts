import { PrismaClient, EmploymentContractType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // --- EMPLOYMENT CONTRACTS ---
  const contracts: { type: EmploymentContractType; label: string }[] = [
    { type: 'HPP', label: 'HPP' },
    { type: 'DPC', label: 'DPČ' },
    { type: 'DPP', label: 'DPP' },
    { type: 'ICO', label: 'IČO' },
  ];
  for (const contract of contracts) {
    await prisma.employmentContract.upsert({
      where: { type: contract.type },
      update: { label: contract.label },
      create: contract,
    });
  }
  const hpp = await prisma.employmentContract.findUnique({ where: { type: 'HPP' } });
  const dpp = await prisma.employmentContract.findUnique({ where: { type: 'DPP' } });

  // --- LOCATION ---
  const location = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Pobočka Praha', address: 'Václavské náměstí 1, Praha' },
  });

  // --- JOB POSITIONS ---
  const pokladni = await prisma.jobPosition.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Pokladní', isManagerial: false },
  });
  const skladnik = await prisma.jobPosition.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Skladník', isManagerial: false },
  });
  const vedouci = await prisma.jobPosition.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Vedoucí směny', isManagerial: true },
  });

  // --- SHIFT TYPES ---
  const ranni = await prisma.shiftType.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, name: 'Ranní', startTime: '06:00', endTime: '14:00', colorCode: '#22c55e' },
  });
  const odpoledni = await prisma.shiftType.upsert({
    where: { id: 2 },
    update: {},
    create: { id: 2, name: 'Odpolední', startTime: '14:00', endTime: '22:00', colorCode: '#3b82f6' },
  });
  await prisma.shiftType.upsert({
    where: { id: 3 },
    update: {},
    create: { id: 3, name: 'Noční', startTime: '22:00', endTime: '06:00', colorCode: '#8b5cf6' },
  });

  // --- ADMIN USER ---
  const adminPwd = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.profile.upsert({
    where: { email: 'admin@demo.cz' },
    update: {},
    create: {
      email: 'admin@demo.cz',
      password: adminPwd,
      fullName: 'Karel Novotný',
      role: 'ADMIN',
      isActivated: true,
      locationId: location.id,
      jobPositionId: vedouci.id,
      employmentContractId: hpp!.id,
      targetHoursPerMonth: 160,
    },
  });

  // --- EMPLOYEES ---
  const empPwd = await bcrypt.hash('Heslo123!', 10);
  const employees = await Promise.all([
    prisma.profile.upsert({
      where: { email: 'jan.novak@demo.cz' },
      update: {},
      create: {
        email: 'jan.novak@demo.cz',
        password: empPwd,
        fullName: 'Jan Novák',
        role: 'EMPLOYEE',
        isActivated: true,
        locationId: location.id,
        jobPositionId: pokladni.id,
        employmentContractId: hpp!.id,
        targetHoursPerMonth: 160,
      },
    }),
    prisma.profile.upsert({
      where: { email: 'marie.svobodova@demo.cz' },
      update: {},
      create: {
        email: 'marie.svobodova@demo.cz',
        password: empPwd,
        fullName: 'Marie Svobodová',
        role: 'EMPLOYEE',
        isActivated: true,
        locationId: location.id,
        jobPositionId: pokladni.id,
        employmentContractId: hpp!.id,
        targetHoursPerMonth: 160,
      },
    }),
    prisma.profile.upsert({
      where: { email: 'petr.dvorak@demo.cz' },
      update: {},
      create: {
        email: 'petr.dvorak@demo.cz',
        password: empPwd,
        fullName: 'Petr Dvořák',
        role: 'EMPLOYEE',
        isActivated: true,
        locationId: location.id,
        jobPositionId: skladnik.id,
        employmentContractId: dpp!.id,
        targetHoursPerMonth: 80,
      },
    }),
    prisma.profile.upsert({
      where: { email: 'lucie.horakova@demo.cz' },
      update: {},
      create: {
        email: 'lucie.horakova@demo.cz',
        password: empPwd,
        fullName: 'Lucie Horáková',
        role: 'EMPLOYEE',
        isActivated: true,
        locationId: location.id,
        jobPositionId: skladnik.id,
        employmentContractId: hpp!.id,
        targetHoursPerMonth: 160,
      },
    }),
    prisma.profile.upsert({
      where: { email: 'tomas.benes@demo.cz' },
      update: {},
      create: {
        email: 'tomas.benes@demo.cz',
        password: empPwd,
        fullName: 'Tomáš Beneš',
        role: 'EMPLOYEE',
        isActivated: true,
        locationId: location.id,
        jobPositionId: pokladni.id,
        employmentContractId: dpp!.id,
        targetHoursPerMonth: 80,
      },
    }),
  ]);

  const [jan, marie, petr, lucie, tomas] = employees;

  // --- SCHEDULE GROUP (březen 2026) ---
  const scheduleGroup = await prisma.scheduleGroup.upsert({
    where: { locationId_year_month: { locationId: location.id, year: 2026, month: 3 } },
    update: { status: 'PUBLISHED' },
    create: {
      locationId: location.id,
      year: 2026,
      month: 3,
      status: 'PUBLISHED',
      calendarDays: Array.from({ length: 31 }, (_, i) => `2026-03-${String(i + 1).padStart(2, '0')}`),
    },
  });

  // --- SHIFTS ---
  // Dnešní směny (12.3.2026)
  const todayShifts = [
    { start: '2026-03-12T06:00:00', end: '2026-03-12T14:00:00', userId: jan.id, shiftTypeId: ranni.id, jobPositionId: pokladni.id },
    { start: '2026-03-12T14:00:00', end: '2026-03-12T22:00:00', userId: marie.id, shiftTypeId: odpoledni.id, jobPositionId: pokladni.id },
    { start: '2026-03-12T06:00:00', end: '2026-03-12T14:00:00', userId: tomas.id, shiftTypeId: ranni.id, jobPositionId: pokladni.id },
  ];
  for (const s of todayShifts) {
    await prisma.shift.create({
      data: {
        startDatetime: new Date(s.start),
        endDatetime: new Date(s.end),
        status: 'PUBLISHED',
        locationId: location.id,
        assignedUserId: s.userId,
        shiftTypeId: s.shiftTypeId,
        jobPositionId: s.jobPositionId,
        scheduleGroupId: scheduleGroup.id,
      },
    });
  }

  // Přiřazené budoucí směny
  const futureAssigned = [
    { start: '2026-03-13T06:00:00', end: '2026-03-13T14:00:00', userId: jan.id, shiftTypeId: ranni.id, jobPositionId: pokladni.id },
    { start: '2026-03-13T14:00:00', end: '2026-03-13T22:00:00', userId: lucie.id, shiftTypeId: odpoledni.id, jobPositionId: skladnik.id },
    { start: '2026-03-14T06:00:00', end: '2026-03-14T14:00:00', userId: marie.id, shiftTypeId: ranni.id, jobPositionId: pokladni.id },
    { start: '2026-03-17T06:00:00', end: '2026-03-17T14:00:00', userId: jan.id, shiftTypeId: ranni.id, jobPositionId: pokladni.id },
    { start: '2026-03-18T14:00:00', end: '2026-03-18T22:00:00', userId: tomas.id, shiftTypeId: odpoledni.id, jobPositionId: pokladni.id },
  ];
  for (const s of futureAssigned) {
    await prisma.shift.create({
      data: {
        startDatetime: new Date(s.start),
        endDatetime: new Date(s.end),
        status: 'PUBLISHED',
        locationId: location.id,
        assignedUserId: s.userId,
        shiftTypeId: s.shiftTypeId,
        jobPositionId: s.jobPositionId,
        scheduleGroupId: scheduleGroup.id,
      },
    });
  }

  // Neobsazené budoucí směny
  const futureUnassigned = [
    { start: '2026-03-13T06:00:00', end: '2026-03-13T14:00:00', shiftTypeId: ranni.id, jobPositionId: skladnik.id },
    { start: '2026-03-14T14:00:00', end: '2026-03-14T22:00:00', shiftTypeId: odpoledni.id, jobPositionId: pokladni.id },
    { start: '2026-03-15T06:00:00', end: '2026-03-15T14:00:00', shiftTypeId: ranni.id, jobPositionId: pokladni.id },
    { start: '2026-03-16T14:00:00', end: '2026-03-16T22:00:00', shiftTypeId: odpoledni.id, jobPositionId: skladnik.id },
  ];
  for (const s of futureUnassigned) {
    await prisma.shift.create({
      data: {
        startDatetime: new Date(s.start),
        endDatetime: new Date(s.end),
        status: 'PUBLISHED',
        locationId: location.id,
        shiftTypeId: s.shiftTypeId,
        jobPositionId: s.jobPositionId,
        scheduleGroupId: scheduleGroup.id,
      },
    });
  }

  // --- VACATION REQUESTS ---
  await prisma.vacationRequest.create({
    data: {
      userId: petr.id,
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-03-25'),
      status: 'PENDING',
      type: 'VACATION',
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: lucie.id,
      startDate: new Date('2026-03-18'),
      endDate: new Date('2026-03-19'),
      status: 'PENDING',
      type: 'VACATION',
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: jan.id,
      startDate: new Date('2026-03-27'),
      endDate: new Date('2026-03-28'),
      status: 'APPROVED',
      type: 'VACATION',
    },
  });

  // --- NOTIFICATIONS pro admina ---
  const notifs = [
    { content: 'Petr Dvořák žádá o dovolenou od 20. 3. do 25. 3. 2026', type: 'VACATION_REQUEST' },
    { content: 'Lucie Horáková žádá o dovolenou od 18. 3. do 19. 3. 2026', type: 'VACATION_REQUEST' },
    { content: '4 směny v příštím týdnu jsou stále neobsazeny', type: 'ALERT' },
    { content: 'Tomáš Beneš se zaregistroval a aktivoval účet', type: 'INFO', isRead: true },
  ];
  for (const n of notifs) {
    await prisma.notification.create({
      data: {
        content: n.content,
        type: n.type,
        isRead: (n as any).isRead ?? false,
        locationId: location.id,
        recipientId: admin.id,
      },
    });
  }

  console.log('✓ Demo data úspěšně vytvořena.');
  console.log('  Admin: admin@demo.cz / Admin123!');
  console.log('  Zaměstnanci: jan.novak@demo.cz / Heslo123! (a další @demo.cz)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
