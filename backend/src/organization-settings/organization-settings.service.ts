import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateSettingsDto } from './dto/update-organization-setting.dto';

@Injectable()
export class OrganizationSettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    // Najdeme záznam s ID 1, pokud neexistuje, vytvoříme ho s defaultními hodnotami
    let settings = await this.prisma.organizationSettings.findUnique({
      where: { id: 1 },
    });
    if (!settings) {
      settings = await this.prisma.organizationSettings.create({
        data: { id: 1 },
      });
    }
    return settings;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    return this.prisma.organizationSettings.update({
      where: { id: 1 },
      data: dto,
    });
  }
}
