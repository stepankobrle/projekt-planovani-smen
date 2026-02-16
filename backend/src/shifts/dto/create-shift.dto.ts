import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateShiftDto {
  @IsUUID()
  scheduleGroupId: string;

  @IsInt()
  locationId: number;

  @IsString()
  date: string; // YYYY-MM-DD

  @IsInt()
  count: number;

  @IsInt()
  jobPositionId: number; // Musí zde bý

  @IsString()
  @IsOptional()
  startDatetime?: string;

  @IsString()
  @IsOptional()
  endDatetime?: string;

  @IsString()
  @IsOptional()
  status?: string; // Např. "DRAFT", "OPEN"

  @IsBoolean()
  @IsOptional()
  offerToEmployees?: boolean; // Pro Marketplace

  @IsOptional()
  @IsString()
  startTime?: string; // Tady přijde např. "08:00" z FE

  @IsOptional()
  @IsString()
  endTime?: string; // Tady přijde např. "16:00" z FE

  @IsOptional()
  shiftTypeId?: number | string | null;

  @IsOptional()
  @IsString()
  assignedUserId?: string; // Aby fungovalo to jméno, co jsme přidali
}
