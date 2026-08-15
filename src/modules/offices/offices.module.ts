import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Office } from './entities/office.entity';
import { OfficesService } from './offices.service';
import { OfficesController } from './offices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Office])],
  providers: [OfficesService],
  controllers: [OfficesController],
  exports: [OfficesService],
})
export class OfficesModule {}
