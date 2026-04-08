import { Controller, Get, UseGuards } from '@nestjs/common';
import { EmploymentContractsService } from './employment-contracts.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('employment-contracts')
@UseGuards(AuthGuard, RolesGuard)
export class EmploymentContractsController {
  constructor(private readonly service: EmploymentContractsService) {}

  @Get()
  @Roles('ADMIN', 'MANAGER')
  findAll() {
    return this.service.findAll();
  }
}
