import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsEmail,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsNumber()
  targetHours?: number;

  @IsOptional()
  @IsNumber()
  positionId?: number;

  @IsOptional()
  @IsNumber()
  employmentContractId?: number;
}
