import { PartialType } from '@nestjs/mapped-types';
import { CreateScheduleGroupDto } from './create-schedule.dto';

export class UpdateScheduleDto extends PartialType(CreateScheduleGroupDto) {}
