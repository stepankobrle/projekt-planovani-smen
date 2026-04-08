import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { OrganizationSettingsService } from './organization-settings.service';
import { UpdateSettingsDto } from './dto/update-organization-setting.dto';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('organization-settings')
@UseGuards(AuthGuard, RolesGuard)
export class OrganizationSettingsController {
  constructor(private readonly settingsService: OrganizationSettingsService) {}

  @Get()
  findAll() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @Roles('ADMIN')
  update(@Body() dto: UpdateSettingsDto) {
    return this.settingsService.updateSettings(dto);
  }
}
