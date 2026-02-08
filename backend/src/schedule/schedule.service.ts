import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Shift } from '@prisma/client'; // DŮLEŽITÉ: Musíme naimportovat typ Shift

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async runAutoAssignment(locationId: number, dateFrom: Date, dateTo: Date) {
    // 1. Načteme všechny prázdné směny
    const shifts = await this.prisma.shift.findMany({
      where: {
        locationId,
        status: 'DRAFT',
        assignedUserId: null,
        startDatetime: { gte: dateFrom, lte: dateTo },
      },
      include: {
        availabilities: true,
      },
      orderBy: { startDatetime: 'asc' },
    });

    // OPRAVA: Definujeme pole jako pole typu Shift
    const results: Shift[] = [];

    for (const shift of shifts) {
      console.log(
        `Zpracovávám směnu ID: ${shift.id}, počet zájemců: ${shift.availabilities.length}`,
      );
      // 2. Seřazení kandidátů (Preference -> Můžu)
      const candidates = shift.availabilities
        .filter((a) => a.type !== 'UNAVAILABLE')
        .sort((a, b) => (a.type === 'PREFERRED' ? -1 : 1));

      console.log(`Počet vhodných kandidátů po filtraci: ${candidates.length}`);

      for (const candidate of candidates) {
        // 3. Kontrola zákonné pauzy
        const isLegallyOk = await this.checkHardConstraints(
          candidate.userId,
          shift,
        );

        if (isLegallyOk) {
          // 4. Přiřazení vítěze v DB
          const updatedShift = await this.prisma.shift.update({
            where: { id: shift.id },
            data: { assignedUserId: candidate.userId },
          });
          results.push(updatedShift);
          break;
        }
      }
    }

    return {
      message: `Přiřazeno ${results.length} zaměstnanců ze ${shifts.length} volných slotů.`,
      assignedCount: results.length,
    };
  }

  private async checkHardConstraints(
    userId: string,
    currentShift: any,
  ): Promise<boolean> {
    const previousShift = await this.prisma.shift.findFirst({
      where: {
        assignedUserId: userId,
        endDatetime: { lt: currentShift.startDatetime },
      },
      orderBy: { endDatetime: 'desc' },
    });

    if (previousShift) {
      const diffInHours =
        (currentShift.startDatetime.getTime() -
          previousShift.endDatetime.getTime()) /
        (1000 * 60 * 60);
      if (diffInHours < 11) return false;
    }

    return true;
  }
}
