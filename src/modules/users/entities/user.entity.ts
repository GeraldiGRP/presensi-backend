import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  EMPLOYEE = 'employee',
  HR = 'hr',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  nik: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.EMPLOYEE })
  role: UserRole;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'default_password', type: 'boolean', default: true })
  defaultPassword: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
