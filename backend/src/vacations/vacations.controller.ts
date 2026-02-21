import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { VacationsService } from './vacations.service';
import { CreateVacationDto } from './dto/create-vacation.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vacations')
@UseGuards(AuthGuard, RolesGuard)
export class VacationsController {
  constructor(private readonly vacationsService: VacationsService) {}

  // Zaměstnanec: Vytvořit žádost
  @Post()
  create(@Request() req, @Body() dto: CreateVacationDto) {
    return this.vacationsService.create(req.user.id, dto);
  }

  // Zaměstnanec: Moje žádosti
  @Get('my')
  findMy(@Request() req) {
    return this.vacationsService.findMyRequests(req.user.id);
  }

  // Admin: Zobrazit žádosti v lokaci — ověřuje, že locationId patří adminovi
  @Get('location/:locationId')
  @Roles('ADMIN', 'MANAGER')
  findAllByLocation(
    @Param('locationId') locationId: string,
    @Request() req,
  ) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.findAllInLocation(+locationId, adminId);
  }

  // Admin: Schválit
  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  approve(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.updateStatus(id, 'APPROVED', adminId);
  }

  // Admin: Zamítnout
  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  reject(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.vacationsService.updateStatus(id, 'REJECTED', adminId);
  }
}
