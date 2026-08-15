import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';
import { AttendanceLog } from './entities/attendance-log.entity';
import { AttendancesService } from './attendances.service';
import { AttendancesController } from './attendances.controller';
import { OfficesModule } from '../offices/offices.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, AttendanceLog]),
    OfficesModule,
    ShiftsModule,
    UsersModule,
  ],
  providers: [AttendancesService],
  controllers: [AttendancesController],
  exports: [AttendancesService],
})
export class AttendancesModule {}
