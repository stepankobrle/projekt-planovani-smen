import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftDto } from './create-shift.dto';
import { IsOptional, IsString, IsInt } from 'class-validator';

export class UpdateShiftDto extends PartialType(CreateShiftDto) {
  @IsOptional()
  @IsString()
  assignedUserId?: string;

  @IsOptional()
  @IsString()
  startDatetime?: string; // Musí tam být toto přesné jméno

  @IsOptional()
  @IsString()
  endDatetime?: string; // Musí tam být toto přesné jméno

  @IsOptional()
  @IsInt()
  jobPositionId?: number;
}
