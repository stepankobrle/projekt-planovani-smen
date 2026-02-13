import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';

@Injectable()
export class ShiftTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShiftTypeDto) {
    return this.prisma.shiftType.create({ data: dto });
  }

  async findAll() {
    return this.prisma.shiftType.findMany({ orderBy: { name: 'asc' } });
  }

  async update(id: number, dto: CreateShiftTypeDto) {
    return this.prisma.shiftType.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.shiftType.delete({ where: { id } });
  }

  async findOne(id: number) {
    return this.prisma.shiftType.findUnique({ where: { id } });
  }
}
