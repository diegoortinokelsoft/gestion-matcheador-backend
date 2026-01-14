import { Injectable } from '@nestjs/common';
import type { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  findById(id: string) {
    return this.usersRepository.findById(id);
  }

  findAll() {
    return this.usersRepository.findAll();
  }

  update(id: string, dto: UpdateUserDto) {
    return this.usersRepository.update(id, dto);
  }
}

