import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
  Get,
  Patch,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @Roles('ADMIN')
  async invite(@Body() dto: InviteUserDto, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;

    if (!adminId) {
      throw new BadRequestException(
        'Nepodařilo se identifikovat admina (chybí ID v tokenu).',
      );
    }
    return this.usersService.inviteUser(dto, adminId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  async findAll(
    @Request() req,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const currentUserId = req.user.sub || req.user.userId || req.user.id;
    return this.usersService.findAll(
      currentUserId,
      skip ? Number(skip) : 0,
      take ? Number(take) : 50,
    );
  }

  // Musí být před @Get(':id') aby "stats" nebylo zachyceno jako :id
  @Get('stats')
  @Roles('ADMIN', 'MANAGER')
  getStats(
    @Request() req,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    const now = new Date();
    return this.usersService.getStats(
      adminId,
      year ? Number(year) : now.getFullYear(),
      month ? Number(month) : now.getMonth() + 1,
    );
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER')
  findOne(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.usersService.findOne(id, adminId);
  }

  // --- PATCH: ÚPRAVA UŽIVATELE ---
  @Patch(':id')
  @Roles('ADMIN', 'MANAGER') // Upravovat může Admin a Manažer
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.usersService.update(id, dto, adminId);
  }

  // --- DELETE: DEAKTIVACE UŽIVATELE ---
  @Delete(':id')
  @Roles('ADMIN') // Mazat může jen ADMIN
  remove(@Param('id') id: string, @Request() req) {
    const adminId = req.user.sub || req.user.userId || req.user.id;
    return this.usersService.remove(id, adminId);
  }
}
