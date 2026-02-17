import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Patch,
  Param,
  UseGuards,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('shifts')
@UseGuards(AuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post() // Odpovídá axios.post('/shifts', ...)
  @Roles('ADMIN')
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createShifts(createShiftDto);
  }
  //
  @Post('bulk')
  @Roles('ADMIN')
  async bulkCreate(@Body() dto: any) {
    return this.shiftsService.bulkCreateFromTemplate(dto);
  }

  // Smazání směny
  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string) {
    return this.shiftsService.deleteShift(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateShiftDto: any) {
    return this.shiftsService.update(id, updateShiftDto);
  }

  @Get('available-employees/:locationId')
  @Roles('ADMIN')
  async getEmployees(@Param('locationId') locationId: string) {
    return this.shiftsService.getAvailableEmployees(Number(locationId));
  }
  // Přehled pro admina s preferencemi zaměstnanců
  @Get('admin-overview')
  @Roles('ADMIN')
  async getAdminOverview(@Query('locationId') locationId: string) {
    const dateFrom = new Date();
    const dateTo = new Date();
    dateTo.setDate(dateTo.getDate() + 30); // Změněno na 30 dní pro lepší přehled

    return this.shiftsService.getShiftsWithAvailabilities(
      Number(locationId),
      dateFrom,
      dateTo,
    );
  }

  // Manuální přiřazení/změna člověka na směně
  @Patch(':id/assign')
  @Roles('ADMIN')
  async manualAssign(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.shiftsService.manualAssign(id, body.userId);
  }

  // Seznam volných směn (např. pro zaměstnance)
  @Get('available')
  async getAvailableShifts() {
    return this.shiftsService.findAllDrafts();
  }

  @Get('open-preferences')
  async findOpenForPreferences(
    @Query('locationId', ParseIntPipe) locationId: number,
    @Query('userId') userId: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.shiftsService.findShiftsForEmployee(
      locationId,
      userId,
      year,
      month,
    );
  }
}
