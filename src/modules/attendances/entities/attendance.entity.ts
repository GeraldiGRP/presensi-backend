import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Shift } from '../../shifts/entities/shift.entity';

export enum CheckInStatus {
  HADIR = 'hadir',
  TERLAMBAT = 'terlambat',
}

export enum CheckOutStatus {
  NORMAL = 'normal',
  PULANG_AWAL = 'pulang_awal',
}

@Entity('attendances')
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'varchar', length: 50 })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'shift_id', type: 'uuid' })
  shiftId: string;

  @ManyToOne(() => Shift, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ name: 'work_date', type: 'date' })
  workDate: string;

  @Column({ name: 'clock_in', type: 'timestamptz', nullable: true })
  clockIn: Date | null;

  @Column({ name: 'clock_out', type: 'timestamptz', nullable: true })
  clockOut: Date | null;

  @Column({
    name: 'check_in_status',
    type: 'enum',
    enum: CheckInStatus,
    nullable: true,
  })
  checkInStatus: CheckInStatus | null;

  @Column({
    name: 'check_out_status',
    type: 'enum',
    enum: CheckOutStatus,
    nullable: true,
  })
  checkOutStatus: CheckOutStatus | null;

  @Column({ name: 'clock_in_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockInLat: number | null;

  @Column({ name: 'clock_in_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockInLng: number | null;

  @Column({ name: 'clock_in_distance_m', type: 'decimal', precision: 10, scale: 2, nullable: true })
  clockInDistanceM: number | null;

  @Column({ name: 'clock_out_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockOutLat: number | null;

  @Column({ name: 'clock_out_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  clockOutLng: number | null;

  @Column({ name: 'clock_out_distance_m', type: 'decimal', precision: 10, scale: 2, nullable: true })
  clockOutDistanceM: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
