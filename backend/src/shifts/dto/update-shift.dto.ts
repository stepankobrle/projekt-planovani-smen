import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from './create-shift.dto';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  assignedUserId?: string | null;
  shiftTypeId?: number; // Změna na number, protože v modelu máš Int
  startDatetime?: Date;
  endDatetime?: Date;
}
