import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { ScheduleService } from './schedule.service';
import { CreateScheduleGroupDto } from './dto/create-schedule.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('schedule-groups')
@UseGuards(AuthGuard, RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  // --- ZÁKLADNÍ SPRÁVA ROZVRHŮ ---
  // Vytvoření rozvrhu
  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateScheduleGroupDto) {
    return this.scheduleService.createGroup(dto);
  }
  //
  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.scheduleService.findAllGroups();
  }
  //detail konkretního rozvrhu
  @Get(':id')
  @Roles('ADMIN')
  findOne(@Param('id') id: string) {
    return this.scheduleService.findOneGroup(id);
  }

  // Odeslat k zaměstnancům (Změna statusu na OPEN)
  @Patch(':id/publish-for-preferences')
  @Roles('ADMIN')
  async publishForPreferences(@Param('id') id: string) {
    return this.scheduleService.updateStatus(id, 'OPEN');
  }

  // Spustit algoritmus (Auto-assignment) - generovaní
  @Post(':id/generate')
  @Roles('ADMIN')
  async generate(@Param('id') id: string) {
    return this.scheduleService.runAutoAssignmentForGroup(id);
  }

  // Zveřejnit finální rozvrh (Změna statusu na PUBLISHED)
  @Patch(':id/publish-final')
  @Roles('ADMIN')
  async publishFinal(@Param('id') id: string) {
    return this.scheduleService.publishFinalSchedule(id);
  }
}
