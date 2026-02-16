import { Module } from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service';
import { ShiftTypesController } from './shift-types.controller';

@Module({
  controllers: [ShiftTypesController],
  providers: [ShiftTypesService],
})
export class ShiftTypesModule {}
