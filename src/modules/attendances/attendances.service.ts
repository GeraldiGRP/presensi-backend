import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance, CheckInStatus, CheckOutStatus } from './entities/attendance.entity';
import { AttendanceLog, LogAction, LogResult } from './entities/attendance-log.entity';
import { OfficesService } from '../offices/offices.service';
import { ShiftsService } from '../shifts/shifts.service';
import { Shift } from '../shifts/entities/shift.entity';
import { haversineDistance } from '../../common/utils/haversine';

@Injectable()
export class AttendancesService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(AttendanceLog)
    private readonly logRepo: Repository<AttendanceLog>,
    private readonly officesService: OfficesService,
    private readonly shiftsService: ShiftsService,
  ) {}

  async checkIn(
    userId: string,
    shiftId: string,
    lat: number,
    lng: number,
  ) {
    const office = await this.officesService.findDefault();
    if (!office) throw new BadRequestException('Kantor belum terdaftar');

    const distance = haversineDistance(
      lat,
      lng,
      Number(office.lat),
      Number(office.lng),
    );

    if (distance > office.radiusM) {
      await this.logAttempt(userId, LogAction.CLOCK_IN, LogResult.REJECTED, 'OUT_OF_RADIUS', lat, lng, distance);
      throw new BadRequestException('Anda berada di luar radius kantor');
    }

    const shift = await this.shiftsService.findById(shiftId);
    const now = new Date();
    const serverTime = now.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (!this.shiftsService.isShiftInWindow(shift, serverTime)) {
      await this.logAttempt(userId, LogAction.CLOCK_IN, LogResult.REJECTED, 'SHIFT_NOT_ACTIVE', lat, lng, distance);
      throw new BadRequestException('Shift tidak tersedia saat ini');
    }

    const workDate = this.computeWorkDate(now, shift);
    const existing = await this.attendanceRepo.findOne({
      where: { userId, workDate },
    });

    if (existing && existing.clockIn) {
      await this.logAttempt(userId, LogAction.CLOCK_IN, LogResult.REJECTED, 'DUPLICATE', lat, lng, distance);
      throw new BadRequestException('Anda sudah melakukan presensi hari ini');
    }

    const checkInStatus = this.computeCheckInStatus(now, shift);

    let attendance = existing;
    if (!attendance) {
      attendance = this.attendanceRepo.create({
        userId,
        shiftId,
        workDate,
        clockIn: now,
        checkInStatus,
        clockInLat: lat,
        clockInLng: lng,
        clockInDistanceM: distance,
      });
    } else {
      attendance.clockIn = now;
      attendance.shiftId = shiftId;
      attendance.checkInStatus = checkInStatus;
      attendance.clockInLat = lat;
      attendance.clockInLng = lng;
      attendance.clockInDistanceM = distance;
    }

    await this.attendanceRepo.save(attendance);
    await this.logAttempt(userId, LogAction.CLOCK_IN, LogResult.APPROVED, null, lat, lng, distance);

    return {
      attendance,
      distance,
      status: checkInStatus,
    };
  }

  async checkOut(userId: string, lat: number, lng: number) {
    const office = await this.officesService.findDefault();
    if (!office) throw new BadRequestException('Kantor belum terdaftar');

    const distance = haversineDistance(
      lat,
      lng,
      Number(office.lat),
      Number(office.lng),
    );

    if (distance > office.radiusM) {
      await this.logAttempt(userId, LogAction.CLOCK_OUT, LogResult.REJECTED, 'OUT_OF_RADIUS', lat, lng, distance);
      throw new BadRequestException('Anda berada di luar radius kantor');
    }

    const now = new Date();
    const todayStr = this.toLocalDateStr(now);
    const yesterdayStr = this.toLocalDateStr(
      new Date(now.getTime() - 86400000),
    );

    let attendance = await this.attendanceRepo.findOne({
      where: { userId, workDate: todayStr },
    });

    if (!attendance || !attendance.clockIn) {
      attendance = await this.attendanceRepo.findOne({
        where: { userId, workDate: yesterdayStr },
      });
    }

    if (!attendance || !attendance.clockIn || attendance.clockOut) {
      await this.logAttempt(userId, LogAction.CLOCK_OUT, LogResult.REJECTED, 'NO_ACTIVE_CHECKIN', lat, lng, distance);
      throw new BadRequestException('Tidak ada presensi masuk yang aktif');
    }

    const shift = await this.shiftsService.findById(attendance.shiftId);
    const checkOutStatus = this.computeCheckOutStatus(
      attendance.workDate,
      now,
      shift,
    );

    attendance.clockOut = now;
    attendance.checkOutStatus = checkOutStatus;
    attendance.clockOutLat = lat;
    attendance.clockOutLng = lng;
    attendance.clockOutDistanceM = distance;

    await this.attendanceRepo.save(attendance);
    await this.logAttempt(userId, LogAction.CLOCK_OUT, LogResult.APPROVED, null, lat, lng, distance);

    return {
      attendance,
      distance,
      checkOutStatus,
    };
  }

  async getMyAttendances(userId: string, month?: string) {
    const [year, mon] = month
      ? month.split('-').map(Number)
      : [new Date().getFullYear(), new Date().getMonth() + 1];

    const start = `${year}-${String(mon).padStart(2, '0')}-01`;
    const end = this.getMonthEnd(year, mon);

    return this.attendanceRepo.find({
      where: {
        userId,
        workDate: Between(start, end),
      },
      relations: { shift: true },
      order: { workDate: 'DESC' },
    });
  }

  async getReport(date: string, status?: string) {
    const qb = this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.user', 'user')
      .leftJoinAndSelect('a.shift', 'shift')
      .where('a.workDate = :date', { date });

    if (status) {
      qb.andWhere('a.checkInStatus = :status', { status });
    }

    return qb.orderBy('user.name', 'ASC').getMany();
  }

  async getMonthlyStats(year: number, month: number) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const end = this.getMonthEnd(year, month);

    const rows = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.checkInStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('a.workDate BETWEEN :start AND :end', { start, end })
      .groupBy('a.checkInStatus')
      .getRawMany();

    const stats: Record<string, number> = {};
    for (const r of rows) stats[r.status] = parseInt(r.count, 10);
    return stats;
  }

  async getLogs(userId?: string, date?: string) {
    const where: any = {};
    if (userId) where.userId = userId;
    if (date) {
      const start = new Date(`${date}T00:00:00`);
      const end = new Date(`${date}T23:59:59.999`);
      where.createdAt = Between(start, end);
    }

    return this.logRepo.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  private async logAttempt(
    userId: string,
    action: LogAction,
    result: LogResult,
    reason: string | null,
    lat: number,
    lng: number,
    distanceM: number,
  ) {
    const log = this.logRepo.create({
      userId,
      action,
      result,
      reason,
      lat,
      lng,
      distanceM,
    });
    await this.logRepo.save(log);
  }

  private computeCheckInStatus(now: Date, shift: Shift): CheckInStatus {
    const timeStr = now.toLocaleTimeString('en-GB', { hour12: false });
    const [h, m] = timeStr.split(':').map(Number);
    const nowMinutes = h * 60 + m;
    const [sh, sm] = shift.startTime.split(':').map(Number);
    const startMinutes = sh * 60 + sm;

    if (nowMinutes <= startMinutes + shift.graceMinutes) {
      return CheckInStatus.HADIR;
    }
    return CheckInStatus.TERLAMBAT;
  }

  private computeCheckOutStatus(
    workDate: string,
    now: Date,
    shift: Shift,
  ): CheckOutStatus {
    const [endH, endM] = shift.endTime.split(':').map(Number);

    if (shift.crossesMidnight) {
      const shiftEnd = new Date(workDate + 'T00:00:00.000Z');
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      shiftEnd.setHours(endH, endM, 0, 0);
      return now < shiftEnd ? CheckOutStatus.PULANG_AWAL : CheckOutStatus.NORMAL;
    }

    const shiftEnd = new Date(workDate + 'T00:00:00.000Z');
    shiftEnd.setHours(endH, endM, 0, 0);
    return now < shiftEnd ? CheckOutStatus.PULANG_AWAL : CheckOutStatus.NORMAL;
  }

  private computeWorkDate(now: Date, shift: Shift): string {
    if (shift.crossesMidnight) {
      const [endH] = shift.endTime.split(':').map(Number);
      if (now.getHours() < endH) {
        const yesterday = new Date(now.getTime() - 86400000);
        return this.toLocalDateStr(yesterday);
      }
    }
    return this.toLocalDateStr(now);
  }

  private getMonthEnd(year: number, month: number): string {
    const lastDay = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  private toLocalDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
