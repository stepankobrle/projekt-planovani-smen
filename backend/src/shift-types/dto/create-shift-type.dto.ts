import { IsString, IsOptional, IsHexColor, Matches } from 'class-validator';

export class CreateShiftTypeDto {
  @IsString()
  name: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Čas musí být ve formátu HH:mm',
  })
  startTime?: string;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):?([0-5]\d)$/, {
    message: 'Čas musí být ve formátu HH:mm',
  })
  endTime?: string;

  @IsOptional()
  @IsHexColor()
  colorCode?: string;
}
