import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Shift } from './entities/shift.entity';

@Injectable()
export class ShiftsService {
  constructor(
    @InjectRepository(Shift)
    private readonly shiftsRepository: Repository<Shift>,
  ) {}

  async findAll(): Promise<Shift[]> {
    return this.shiftsRepository.find({ where: { isActive: true } });
  }

  async findById(id: string): Promise<Shift> {
    const shift = await this.shiftsRepository.findOne({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    return shift;
  }

  async getActiveShifts(serverTime: string): Promise<Shift[]> {
    const active = await this.shiftsRepository.find({ where: { isActive: true } });
    return active.filter((shift) => this.isShiftInWindow(shift, serverTime));
  }

  isShiftInWindow(shift: Shift, serverTime: string): boolean {
    const timeToMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    const nowMinutes = timeToMinutes(serverTime);
    const startMinutes = timeToMinutes(shift.startTime);
    const endMinutes = timeToMinutes(shift.endTime);
    const allowance = 30;

    if (shift.crossesMidnight) {
      const adjustedStart = startMinutes - allowance;
      const adjustedEnd = endMinutes;
      if (nowMinutes >= adjustedStart || nowMinutes <= adjustedEnd) return true;
      return false;
    }

    const adjustedStart = startMinutes - allowance;
    return nowMinutes >= adjustedStart && nowMinutes <= endMinutes;
  }

  async create(data: Partial<Shift>): Promise<Shift> {
    const shift = this.shiftsRepository.create(data);
    return this.shiftsRepository.save(shift);
  }

  async update(id: string, data: Partial<Shift>): Promise<Shift> {
    const shift = await this.findById(id);
    Object.assign(shift, data);
    return this.shiftsRepository.save(shift);
  }

  async delete(id: string): Promise<void> {
    await this.shiftsRepository.delete({ id });
  }

  async seedDefaults(): Promise<void> {
    const defaults = [
      { name: 'Pagi', startTime: '07:45', endTime: '14:00', graceMinutes: 15, crossesMidnight: false },
      { name: 'Siang', startTime: '14:00', endTime: '20:00', graceMinutes: 15, crossesMidnight: false },
      { name: 'Malam', startTime: '20:00', endTime: '08:00', graceMinutes: 15, crossesMidnight: true },
      { name: 'Office A', startTime: '08:00', endTime: '16:00', graceMinutes: 15, crossesMidnight: false },
      { name: 'Office B', startTime: '09:00', endTime: '17:00', graceMinutes: 15, crossesMidnight: false },
    ];

    const existing = await this.shiftsRepository.count();
    if (existing === 0) {
      await this.shiftsRepository.save(
        defaults.map((d) => this.shiftsRepository.create(d)),
      );
    }
  }
}
