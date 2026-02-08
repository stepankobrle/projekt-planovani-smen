// backend/src/availability/dto/create-availability.dto.ts
import { AvailabilityType } from '@prisma/client';

export class CreateAvailabilityDto {
  userId: string;
  shiftId: string;
  type: AvailabilityType; // PREFERRED, AVAILABLE, UNAVAILABLE
}
