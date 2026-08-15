import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller()
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Get('shifts/active')
  @UseGuards(JwtAuthGuard)
  async getActive(@Query('time') time?: string) {
    const serverTime = time || new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return this.shiftsService.getActiveShifts(serverTime);
  }

  @Get('admin/shifts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async findAll() {
    return this.shiftsService.findAll();
  }

  @Get('admin/shifts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async findOne(@Param('id') id: string) {
    return this.shiftsService.findById(id);
  }

  @Post('admin/shifts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async create(@Body() body: { name: string; startTime: string; endTime: string; graceMinutes?: number; crossesMidnight?: boolean }) {
    return this.shiftsService.create(body);
  }

  @Put('admin/shifts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    return this.shiftsService.update(id, body);
  }

  @Delete('admin/shifts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Param('id') id: string) {
    await this.shiftsService.delete(id);
    return { message: 'Shift deleted' };
  }
}
