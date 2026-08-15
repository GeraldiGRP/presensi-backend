import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { OfficesService } from './offices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller()
export class OfficesController {
  constructor(private readonly officesService: OfficesService) {}

  @Get('offices/geofence')
  @UseGuards(JwtAuthGuard)
  async getGeofence() {
    const office = await this.officesService.findDefault();
    if (!office) return null;
    return {
      id: office.id,
      name: office.name,
      lat: Number(office.lat),
      lng: Number(office.lng),
      radiusM: office.radiusM,
    };
  }

  @Get('admin/offices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async findAll() {
    return this.officesService.findAll();
  }

  @Get('admin/offices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.officesService.findById(id);
  }

  @Post('admin/offices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async create(@Body() body: { name: string; lat: number; lng: number; radiusM: number }) {
    return this.officesService.create(body);
  }

  @Put('admin/offices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.officesService.update(id, body);
  }

  @Delete('admin/offices/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.officesService.delete(id);
    return { message: 'Office deleted' };
  }
}
