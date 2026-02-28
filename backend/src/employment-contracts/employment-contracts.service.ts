import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EmploymentContractsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.employmentContract.findMany({
      orderBy: { id: 'asc' },
    });
  }
}
