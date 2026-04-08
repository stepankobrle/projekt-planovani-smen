import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  ValidateNested,
  Min,
} from 'class-validator';

export class BulkShiftItem {
  @IsString()
  date: string; // YYYY-MM-DD

  @IsInt()
  @Min(1)
  @Type(() => Number)
  shiftTypeId: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  count: number;
}

export class BulkCreateShiftsDto {
  @IsUUID()
  scheduleGroupId: string;

  @IsInt()
  @Type(() => Number)
  locationId: number;

  @IsInt()
  @Type(() => Number)
  jobPositionId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkShiftItem)
  items: BulkShiftItem[];
}
