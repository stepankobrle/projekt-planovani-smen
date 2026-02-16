import {
  IsEmail,
  IsString,
  IsEnum,
  IsNumber,
  IsInt,
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
  targetHours: number; // Kolik má mít h/měsíc

  @IsInt()
  positionId: number; // ID pozice z tabulky JobPosition
}
