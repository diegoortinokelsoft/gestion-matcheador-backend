import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppscriptsGateway } from '../../appscripts/appscripts.gateway';
import { RolesRepository } from '../../roles/roles.repository';
import { UsersRepository } from '../../users/users.repository';
import type { RequestUser } from '../../common/types/request-user.type';
import { getClientIp, getUserAgent } from '../../common/utils/request-info';
import { resolveActorRole } from '../../common/utils/role-utils';
import { TasksDeleteMultipleDto } from './dto/tasks-delete-multiple.dto';
import { TasksSetMultipleDto } from './dto/tasks-set-multiple.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly appscripts: AppscriptsGateway,
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async list(user: RequestUser) {
    const [profile, roles] = await Promise.all([
      this.usersRepository.findById(user.id),
      this.rolesRepository.listRoles(user.id),
    ]);

    const tasks = await this.appscripts.call<unknown[]>('tasks_list', {});
    const isElevated = roles.includes('admin') || roles.includes('supervisor');

    if (isElevated) {
      return { ok: true, data: tasks };
    }

    const legacyUserId = profile?.legacy_user_id ?? null;
    if (!legacyUserId) {
      throw new BadRequestException('Missing legacy_user_id for this user');
    }

    const filtered = (tasks ?? []).filter((task) => {
      if (!task || typeof task !== 'object') return false;
      const value = (task as Record<string, unknown>).user_id;
      return Number(value) === Number(legacyUserId);
    });

    return { ok: true, data: filtered };
  }

  async setMultiple(user: RequestUser, req: Request, dto: TasksSetMultipleDto) {
    const roles = await this.rolesRepository.listRoles(user.id);

    const requestId = dto.request_id ?? randomUUID();
    const data = await this.appscripts.call<{ saved: number }>('tasks_set_multiple', {
      tasks: dto.tasks,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { ...data, request_id: requestId } };
  }

  async deleteMultiple(
    user: RequestUser,
    req: Request,
    dto: TasksDeleteMultipleDto,
  ) {
    const roles = await this.rolesRepository.listRoles(user.id);

    const requestId = dto.request_id ?? randomUUID();
    const data = await this.appscripts.call<{ deleted: number }>('tasks_delete_multiple', {
      task_ids: dto.task_ids,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { ...data, request_id: requestId } };
  }
}

