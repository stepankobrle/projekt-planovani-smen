import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateVacationDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @IsOptional()
  note?: string;
}
