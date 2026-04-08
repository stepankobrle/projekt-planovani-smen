// src/availabilities/dto/create-availability.dto.ts
import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { AvailabilityType } from '@prisma/client';

export class CreateAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  shiftId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(AvailabilityType)
  type: AvailabilityType; // Tady validujeme AVAILABLE | UNAVAILABLE | PREFERRED
}
