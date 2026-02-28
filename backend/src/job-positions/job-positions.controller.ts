import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JobPositionsService } from './job-positions.service';
import { CreateJobPositionDto } from './dto/create-job-position.dto';
import { UpdateJobPositionDto } from './dto/update-job-position.dto';
import { Roles } from '../auth/roles.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('job-positions')
@UseGuards(AuthGuard, RolesGuard)
export class JobPositionsController {
  constructor(private readonly jobPositionsService: JobPositionsService) {}

  @Post()
  @Roles('ADMIN') // Pozice může vytvářet jen Admin
  create(@Body() createJobPositionDto: CreateJobPositionDto) {
    return this.jobPositionsService.create(createJobPositionDto);
  }

  @Get()
  findAll() {
    return this.jobPositionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobPositionsService.findOne(+id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Body() updateJobPositionDto: UpdateJobPositionDto,
  ) {
    return this.jobPositionsService.update(+id, updateJobPositionDto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.jobPositionsService.remove(+id);
  }
}
