import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendancesService } from './attendances.service';
import { CheckInDto } from './dto/check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller()
@UseGuards(JwtAuthGuard)
export class AttendancesController {
  constructor(private readonly attendancesService: AttendancesService) {}

  @Post('attendances/check-in')
  async checkIn(@Request() req, @Body() dto: CheckInDto) {
    return this.attendancesService.checkIn(
      req.user.nik,
      dto.shiftId,
      dto.lat,
      dto.lng,
    );
  }

  @Post('attendances/check-out')
  async checkOut(@Request() req, @Body() dto: CheckOutDto) {
    return this.attendancesService.checkOut(req.user.nik, dto.lat, dto.lng);
  }

  @Get('attendances/me')
  async getMyHistory(@Request() req, @Query('month') month?: string) {
    return this.attendancesService.getMyAttendances(req.user.nik, month);
  }

  @Get('admin/attendances')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async getReport(
    @Query('date') date: string,
    @Query('month') month?: string,
    @Query('status') status?: string,
  ) {
    if (month) {
      return this.attendancesService.getReportByMonth(month, status);
    }
    const reportDate = date || (() => {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    return this.attendancesService.getReport(reportDate, status);
  }

  @Get('admin/attendances/stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async getStats(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    const m = month ? parseInt(month, 10) : new Date().getMonth() + 1;
    return this.attendancesService.getMonthlyStats(y, m);
  }

  @Get('admin/logs')
  @UseGuards(RolesGuard)
  @Roles(UserRole.HR, UserRole.ADMIN)
  async getLogs(@Query('userId') userId?: string, @Query('date') date?: string) {
    return this.attendancesService.getLogs(userId, date);
  }
}
