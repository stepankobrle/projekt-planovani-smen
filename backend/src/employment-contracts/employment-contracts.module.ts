import { Module } from '@nestjs/common';
import { EmploymentContractsService } from './employment-contracts.service';
import { EmploymentContractsController } from './employment-contracts.controller';

@Module({
  controllers: [EmploymentContractsController],
  providers: [EmploymentContractsService],
})
export class EmploymentContractsModule {}
