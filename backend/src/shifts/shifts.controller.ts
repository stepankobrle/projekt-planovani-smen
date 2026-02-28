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
  Req,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { BulkCreateShiftsDto } from './dto/bulk-create-shifts.dto';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';

@Controller('shifts')
@UseGuards(AuthGuard, RolesGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post()
  @Roles('ADMIN')
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftsService.createShifts(createShiftDto);
  }

  @Post('bulk')
  @Roles('ADMIN')
  async bulkCreate(@Body() dto: BulkCreateShiftsDto) {
    return this.shiftsService.bulkCreateFromTemplate(dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  async remove(@Param('id') id: string, @Req() req) {
    return this.shiftsService.deleteShift(id, req.user.id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() dto: UpdateShiftDto) {
    return this.shiftsService.update(id, dto);
  }

  @Get('available-employees/:locationId')
  @Roles('ADMIN')
  async getEmployees(
    @Param('locationId') locationId: string,
    @Query('jobPositionId') jobPositionId?: string,
  ) {
    return this.shiftsService.getAvailableEmployees(
      Number(locationId),
      jobPositionId ? Number(jobPositionId) : undefined,
    );
  }

  @Get('admin-overview')
  @Roles('ADMIN')
  async getAdminOverview(@Query('locationId') locationId: string) {
    const dateFrom = new Date();
    const dateTo = new Date();
    dateTo.setDate(dateTo.getDate() + 30);

    return this.shiftsService.getShiftsWithAvailabilities(
      Number(locationId),
      dateFrom,
      dateTo,
    );
  }

  @Patch(':id/assign')
  @Roles('ADMIN')
  async manualAssign(
    @Param('id') id: string,
    @Body() body: { userId: string },
    @Req() req,
  ) {
    return this.shiftsService.manualAssign(id, body.userId, req.user.id);
  }

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

  @Get()
  async findAll(
    @Query('assignedUserId') assignedUserId?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('locationId') locationId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.shiftsService.findAll({
      assignedUserId,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
      locationId: locationId ? Number(locationId) : undefined,
      skip: skip ? Number(skip) : 0,
      take: take ? Number(take) : 50,
    });
  }

  @Patch(':id/offer')
  async offerShift(@Param('id') id: string, @Req() req) {
    return this.shiftsService.offerShift(req.user.id, id);
  }

  @Patch(':id/take')
  async takeShift(@Param('id') id: string, @Req() req) {
    return this.shiftsService.requestShift(req.user.id, id);
  }
}
