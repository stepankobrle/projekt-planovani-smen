// backend/src/shifts/availability.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Injectable()
export class AvailabilityService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdate(dto: CreateAvailabilityDto) {
    // 1. Nejdříve si ověříme, že směna  existuje
    const shift = await this.prisma.shift.findUnique({
      where: { id: dto.shiftId },
    });

    if (!shift) {
      throw new NotFoundException('Směna nebyla nalezena.');
    }

    // 2. Použijeme logiku: Pokud uživatel už pro tuto směnu volbu poslal, aktualizujeme ji.
    // Jinak vytvoříme novou.
    const existing = await this.prisma.availability.findFirst({
      where: {
        userId: dto.userId,
        shiftId: dto.shiftId,
      },
    });

    if (existing) {
      return this.prisma.availability.update({
        where: { id: existing.id },
        data: { type: dto.type },
      });
    }

    // 3. Vytvoření nové preference (kopírujeme časy ze směny pro snazší výpočty algoritmu)
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

  // Pomocná funkce pro admina, aby viděl všechny "barevné buňky"
  async findAllByShift(shiftId: string) {
    return this.prisma.availability.findMany({
      where: { shiftId },
      include: { user: true },
    });
  }
}
