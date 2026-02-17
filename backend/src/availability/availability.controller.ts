// src/availabilities/availabilities.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { CreateAvailabilityDto } from './dto/create-availability.dto';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  setAvailability(@Body() dto: CreateAvailabilityDto) {
    return this.availabilityService.setAvailability(dto);
  }
}
