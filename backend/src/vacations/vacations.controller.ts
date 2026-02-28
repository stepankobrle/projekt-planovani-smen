import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VacationStatus } from '@prisma/client';

@Controller('vacations')
@UseGuards(AuthGuard, RolesGuard)
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateVacationDto) {
    return this.vacationsService.create(req.user.id, dto);
  }

  @Get('my')
  findMy(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.vacationsService.findMyRequests(
      req.user.id,
      skip ? Number(skip) : 0,
      take ? Number(take) : 50,
    );
  }

  @Get('location/:locationId')
  @Roles('ADMIN', 'MANAGER')
  findAllByLocation(
    @Param('locationId') locationId: string,
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.findAllInLocation(
      +locationId,
      adminId,
      skip ? Number(skip) : 0,
      take ? Number(take) : 50,
    );
  }

  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  approve(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.updateStatus(id, VacationStatus.APPROVED, adminId);
  }

  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  reject(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.updateStatus(id, VacationStatus.REJECTED, adminId);
  }
}
