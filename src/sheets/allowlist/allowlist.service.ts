import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppscriptsGateway } from '../../appscripts/appscripts.gateway';
import type { RequestUser } from '../../common/types/request-user.type';
import { getClientIp, getUserAgent } from '../../common/utils/request-info';
import { resolveActorRole } from '../../common/utils/role-utils';
import { RolesRepository } from '../../roles/roles.repository';
import type { AllowlistUpsertDto } from './dto/allowlist-upsert.dto';

@Injectable()
export class AllowlistService {
  constructor(
    private readonly appscripts: AppscriptsGateway,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async get(email: string) {
    const data = await this.appscripts.call<unknown>('allowlist_get', { email });
    return { ok: true, data };
  }

  async list() {
    const data = await this.appscripts.call<unknown[]>('allowlist_list', {});
    return { ok: true, data };
  }

  async upsert(user: RequestUser, req: Request, dto: AllowlistUpsertDto) {
    const roles = await this.rolesRepository.listRoles(user.id);
    const requestId = dto.request_id ?? randomUUID();

    const data = await this.appscripts.call<unknown>('allowlist_upsert', {
      email: dto.email,
      enabled: dto.enabled,
      role_hint: dto.role_hint,
      can_reset_password: dto.can_reset_password,
      can_manage_users: dto.can_manage_users,
      notes: dto.notes,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { result: data, request_id: requestId } };
  }

  async disable(user: RequestUser, req: Request, email: string) {
    const roles = await this.rolesRepository.listRoles(user.id);
    const requestId = randomUUID();

    const data = await this.appscripts.call<unknown>('allowlist_disable', {
      email,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { result: data, request_id: requestId } };
  }
}

