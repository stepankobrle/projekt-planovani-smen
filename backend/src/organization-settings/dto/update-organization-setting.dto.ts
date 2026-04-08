import { IsBoolean, IsNumber, Min, Max } from 'class-validator';

export class UpdateSettingsDto {
  @IsBoolean()
  workOnWeekends: boolean;

  @IsBoolean()
  workOnHolidays: boolean;

  @IsNumber()
  @Min(0)
  @Max(24)
  minRestBetweenShifts: number;
}
