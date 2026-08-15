import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nik: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(['employee', 'hr', 'admin'])
  role: UserRole = UserRole.EMPLOYEE;
}
