// backend/src/shifts/shifts.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';

@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('generate')
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createDraftSlots(createShiftDto);
  }

  @Get('available')
  async getAvailableShifts() {
    return this.shiftsService.findAllDrafts();
  }

  @Get('admin-overview')
  async getAdminOverview(@Query('locationId') locationId: string) {
    // Pro bakalářku je dobré mít pevné datum nebo ho posílat v query
    const dateFrom = new Date(); // např. od dneška
    const dateTo = new Date();
    dateTo.setDate(dateTo.getDate() + 7); // na týden dopředu

    return this.shiftsService.getShiftsWithAvailabilities(
      Number(locationId),
      dateFrom,
      dateTo,
    );
  }
}
