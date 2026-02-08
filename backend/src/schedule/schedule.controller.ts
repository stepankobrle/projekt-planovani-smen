// backend/src/schedule/schedule.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { ScheduleService } from './schedule.service';

@Controller('schedule')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post('generate')
  async generate(
    @Body() body: { locationId: number; from: string; to: string },
  ) {
    // Převedeme stringy z frontendu na Date objekty
    const dateFrom = new Date(body.from);
    const dateTo = new Date(body.to);

    return this.scheduleService.runAutoAssignment(
      Number(body.locationId),
      dateFrom,
      dateTo,
    );
  }
}
