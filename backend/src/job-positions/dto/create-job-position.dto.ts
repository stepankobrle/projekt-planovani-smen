import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateJobPositionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsBoolean()
  @IsOptional()
  isManagerial?: boolean; // Jestli je to manažerská pozice (nepovinné, default false)
}
