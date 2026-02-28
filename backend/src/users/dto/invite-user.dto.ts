import {
  IsEmail,
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsNumber()
  @Min(0)
  targetHours: number;

  @IsInt()
  positionId: number;

  @IsOptional()
  @IsInt()
  employmentContractId?: number;
}
