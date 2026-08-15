import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OfficesModule } from './modules/offices/offices.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
import { AttendancesModule } from './modules/attendances/attendances.module';

import { User } from './modules/users/entities/user.entity';
import { Office } from './modules/offices/entities/office.entity';
import { Shift } from './modules/shifts/entities/shift.entity';
import { Attendance } from './modules/attendances/entities/attendance.entity';
import { AttendanceLog } from './modules/attendances/entities/attendance-log.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('database.host'),
        port: config.get('database.port'),
        username: config.get('database.username'),
        password: config.get('database.password'),
        database: config.get('database.database'),
        ssl: config.get('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        entities: [User, Office, Shift, Attendance, AttendanceLog],
        synchronize: true,
        logging: false,
      }),
    }),
    AuthModule,
    UsersModule,
    OfficesModule,
    ShiftsModule,
    AttendancesModule,
  ],
})
export class AppModule {}
