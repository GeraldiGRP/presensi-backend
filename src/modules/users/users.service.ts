import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

export interface UserActor {
  nik: string;
  role: UserRole;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByNik(nik: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { nik } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.nik, 10);
    const user = this.usersRepository.create({
      ...dto,
      passwordHash,
      defaultPassword: true,
    });
    return this.usersRepository.save(user);
  }

  async createMany(dtos: CreateUserDto[]): Promise<User[]> {
    const users: User[] = [];
    for (const dto of dtos) {
      const passwordHash = await bcrypt.hash(dto.nik, 10);
      const user = this.usersRepository.create({
        ...dto,
        passwordHash,
        defaultPassword: true,
      });
      users.push(user);
    }
    return this.usersRepository.save(users);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find({ order: { name: 'ASC' } });
  }

  async update(nik: string, dto: UpdateUserDto, actor: UserActor): Promise<User> {
    const user = await this.findByNik(nik);
    if (!user) throw new NotFoundException('User not found');

    if (actor.nik === nik) {
      if (dto.isActive === false) {
        throw new BadRequestException('Tidak dapat menonaktifkan akun sendiri');
      }
      if (dto.role && dto.role !== user.role) {
        throw new BadRequestException('Tidak dapat mengubah role akun sendiri');
      }
    }

    if (dto.role && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Hanya admin yang dapat mengubah role');
    }

    if (user.role === UserRole.ADMIN && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Hanya admin yang dapat mengubah data admin');
    }

    if (
      user.role === UserRole.ADMIN &&
      (dto.isActive === false || (dto.role && dto.role !== UserRole.ADMIN))
    ) {
      await this.ensureNotLastActiveAdmin(nik);
    }

    Object.assign(user, dto);
    return this.usersRepository.save(user);
  }

  async changePassword(nik: string, newPassword: string): Promise<void> {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.usersRepository.update(
      { nik },
      { passwordHash, defaultPassword: false },
    );
  }

  async resetPassword(nik: string): Promise<void> {
    const passwordHash = await bcrypt.hash(nik, 10);
    await this.usersRepository.update(
      { nik },
      { passwordHash, defaultPassword: true },
    );
  }

  async delete(nik: string, actor: UserActor): Promise<void> {
    if (actor.nik === nik) {
      throw new BadRequestException('Tidak dapat menghapus akun sendiri');
    }
    const user = await this.findByNik(nik);
    if (!user) throw new NotFoundException('User not found');

    if (user.role === UserRole.ADMIN) {
      await this.ensureNotLastActiveAdmin(nik);
    }

    await this.usersRepository.delete({ nik });
  }

  private async ensureNotLastActiveAdmin(nik: string): Promise<void> {
    const target = await this.findByNik(nik);
    if (!target || target.role !== UserRole.ADMIN || !target.isActive) return;

    const adminCount = await this.usersRepository.count({
      where: { role: UserRole.ADMIN, isActive: true },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(
        'Tidak dapat menonaktifkan/menghapus admin aktif terakhir',
      );
    }
  }

  async validatePassword(nik: string, password: string): Promise<boolean> {
    const user = await this.findByNik(nik);
    if (!user) return false;
    return bcrypt.compare(password, user.passwordHash);
  }
}
