import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ShiftTypesService } from './shift-types.service';
import { CreateShiftTypeDto } from './dto/create-shift-type.dto';
import { UpdateShiftTypeDto } from './dto/update-shift-type.dto';

@Controller('shift-types')
export class ShiftTypesController {
  constructor(private readonly shiftTypesService: ShiftTypesService) {}

  @Post()
  create(@Body() createShiftTypeDto: CreateShiftTypeDto) {
    return this.shiftTypesService.create(createShiftTypeDto);
  }

  @Get()
  findAll() {
    return this.shiftTypesService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftTypesService.remove(+id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftTypesService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateShiftTypeDto: UpdateShiftTypeDto,
  ) {
    return this.shiftTypesService.update(+id, updateShiftTypeDto);
  }
}
