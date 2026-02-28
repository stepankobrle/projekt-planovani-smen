import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateJobPositionDto } from './dto/create-job-position.dto';
import { UpdateJobPositionDto } from './dto/update-job-position.dto';

@Injectable()
export class JobPositionsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateJobPositionDto) {
    return this.prisma.jobPosition.create({
      data: {
        name: dto.name,
        isManagerial: dto.isManagerial || false,
      },
    });
  }

  findAll() {
    return this.prisma.jobPosition.findMany({
      orderBy: { name: 'asc' }, // Seřadíme abecedně
    });
  }

  findOne(id: number) {
    return this.prisma.jobPosition.findUnique({ where: { id } });
  }

  update(id: number, dto: UpdateJobPositionDto) {
    return this.prisma.jobPosition.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.jobPosition.delete({ where: { id } });
  }
}
