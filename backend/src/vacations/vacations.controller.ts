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

  // Admin: Zobrazit všechny žádosti (tady bys měl filtrovat podle locationId admina)
  // Pro jednoduchost zatím vracíme všechny, nebo můžeš poslat locationId v query
  @Get('location/:locationId')
  @Roles('ADMIN', 'MANAGER')
  findAllByLocation(@Param('locationId') locationId: string) {
    return this.vacationsService.findAllInLocation(+locationId);
  }

  // Admin: Schválit
  @Patch(':id/approve')
  @Roles('ADMIN', 'MANAGER')
  approve(@Param('id') id: string) {
    return this.vacationsService.updateStatus(id, 'APPROVED');
  }

  // Admin: Zamítnout
  @Patch(':id/reject')
  @Roles('ADMIN', 'MANAGER')
  reject(@Param('id') id: string) {
    return this.vacationsService.updateStatus(id, 'REJECTED');
  }
}
