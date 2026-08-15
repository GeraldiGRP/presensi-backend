import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import * as ExcelJS from 'exceljs';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HR, UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':nik')
  async findOne(@Param('nik') nik: string) {
    return this.usersService.findByNik(nik);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const existing = await this.usersService.findByNik(dto.nik);
    if (existing) {
      throw new BadRequestException('NIK sudah terdaftar');
    }
    return this.usersService.create(dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File tidak ditemukan');

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);
    const worksheet = workbook.worksheets[0];

    const dtos: CreateUserDto[] = [];
    const errors: { row: number; message: string }[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const nik = String(row.getCell(1).value ?? '').trim();
      const name = String(row.getCell(2).value ?? '').trim();
      const role = (String(row.getCell(3).value ?? '').trim() || 'employee') as UserRole;

      if (!nik || !name) {
        errors.push({ row: rowNumber, message: 'NIK atau Nama kosong' });
        return;
      }

      dtos.push({ nik, name, role });
    });

    if (dtos.length === 0) {
      throw new BadRequestException('Tidak ada data valid di file');
    }

    const users = await this.usersService.createMany(dtos);

    return {
      imported: users.length,
      errors,
      users,
    };
  }

  @Put(':nik')
  async update(
    @Param('nik') nik: string,
    @Body() dto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(nik, dto, {
      nik: req.user.nik,
      role: req.user.role,
    });
  }

  @Post(':nik/reset-password')
  async resetPassword(@Param('nik') nik: string) {
    await this.usersService.resetPassword(nik);
    return { message: 'Password direset ke default (NIK)' };
  }

  @Put(':nik/change-password')
  async changePassword(
    @Param('nik') nik: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.usersService.changePassword(nik, dto.newPassword);
    return { message: 'Password berhasil diubah' };
  }

  @Delete(':nik')
  @Roles(UserRole.ADMIN)
  async delete(@Param('nik') nik: string, @Request() req) {
    await this.usersService.delete(nik, {
      nik: req.user.nik,
      role: req.user.role,
    });
    return { message: 'User berhasil dihapus' };
  }
}
