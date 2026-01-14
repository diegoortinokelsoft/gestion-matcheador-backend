import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  assignRole(userId: string, role: string) {
    return this.rolesRepository.assignRole(userId, role);
  }

  revokeRole(userId: string, role: string) {
    return this.rolesRepository.revokeRole(userId, role);
  }

  listRoles(userId: string) {
    return this.rolesRepository.listRoles(userId);
  }
}

