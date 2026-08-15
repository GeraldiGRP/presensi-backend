import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';
import { Office } from '../modules/offices/entities/office.entity';
import { Shift } from '../modules/shifts/entities/shift.entity';
import { Attendance } from '../modules/attendances/entities/attendance.entity';
import { AttendanceLog } from '../modules/attendances/entities/attendance-log.entity';

dotenv.config();

export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
  username: process.env.DATABASE_USERNAME ?? 'postgres',
  password: process.env.DATABASE_PASSWORD ?? 'postgres',
  database: process.env.DATABASE_NAME ?? 'presensi_db',
  entities: [User, Office, Shift, Attendance, AttendanceLog],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
