import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Office } from './entities/office.entity';

@Injectable()
export class OfficesService {
  constructor(
    @InjectRepository(Office)
    private readonly officesRepository: Repository<Office>,
  ) {}

  async findAll(): Promise<Office[]> {
    return this.officesRepository.find();
  }

  async findById(id: string): Promise<Office> {
    const office = await this.officesRepository.findOne({ where: { id } });
    if (!office) throw new NotFoundException('Office not found');
    return office;
  }

  async findDefault(): Promise<Office | null> {
    return this.officesRepository.findOne({ where: {}, order: { createdAt: 'ASC' } });
  }

  async create(data: Partial<Office>): Promise<Office> {
    const office = this.officesRepository.create(data);
    return this.officesRepository.save(office);
  }

  async update(id: string, data: Partial<Office>): Promise<Office> {
    const office = await this.findById(id);
    Object.assign(office, data);
    return this.officesRepository.save(office);
  }

  async delete(id: string): Promise<void> {
    await this.officesRepository.delete({ id });
  }
}
