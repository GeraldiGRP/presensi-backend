import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(nik: string, password: string) {
    const isValid = await this.usersService.validatePassword(nik, password);
    if (!isValid) throw new UnauthorizedException('NIK atau password salah');

    const user = await this.usersService.findByNik(nik);
    if (!user) throw new UnauthorizedException('Akun tidak ditemukan');
    if (!user.isActive) throw new UnauthorizedException('Akun tidak aktif');

    const payload = { sub: user.nik, role: user.role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: 900,
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: 604800,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        nik: user.nik,
        name: user.name,
        role: user.role,
      },
      requirePasswordChange: user.defaultPassword,
    };
  }

  async refreshToken(nik: string, role: string) {
    const payload = { sub: nik, role };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: 900,
    });

    return { accessToken };
  }

  async changePassword(nik: string, newPassword: string) {
    await this.usersService.changePassword(nik, newPassword);
    return { message: 'Password berhasil diubah' };
  }
}
