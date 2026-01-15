import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { AppscriptsGateway } from '../../appscripts/appscripts.gateway';
import { RolesRepository } from '../../roles/roles.repository';
import { UsersRepository } from '../../users/users.repository';
import type { RequestUser } from '../../common/types/request-user.type';
import { getClientIp, getUserAgent } from '../../common/utils/request-info';
import { resolveActorRole } from '../../common/utils/role-utils';
import { VacationsDeleteDto } from './dto/vacations-delete.dto';
import { VacationsListTeamDto } from './dto/vacations-list-team.dto';
import { VacationsListUserDto } from './dto/vacations-list-user.dto';
import { VacationsSetDto } from './dto/vacations-set.dto';

@Injectable()
export class VacationsService {
  constructor(
    private readonly appscripts: AppscriptsGateway,
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async listAll() {
    const data = await this.appscripts.call<unknown[]>('vacations_list_all', {});
    return { ok: true, data };
  }

  async listUser(user: RequestUser, dto: VacationsListUserDto) {
    const [profile, roles] = await Promise.all([
      this.usersRepository.findById(user.id),
      this.rolesRepository.listRoles(user.id),
    ]);

    const isElevated = roles.includes('admin') || roles.includes('supervisor');
    const legacyUserId = await this.resolveTargetLegacyUserId_({
      requesterProfileLegacyId: profile?.legacy_user_id ?? null,
      requesterIsElevated: isElevated,
      targetAuthUserId: dto.auth_user_id ?? null,
      targetLegacyUserId: dto.user_id ?? null,
    });

    const data = await this.appscripts.call<unknown[]>('vacations_list_user', {
      user_id: legacyUserId,
    });
    return { ok: true, data };
  }

  async listTeam(user: RequestUser, dto: VacationsListTeamDto) {
    const [profile, roles] = await Promise.all([
      this.usersRepository.findById(user.id),
      this.rolesRepository.listRoles(user.id),
    ]);

    const legacyUserId = await this.resolveTargetLegacyUserId_({
      requesterProfileLegacyId: profile?.legacy_user_id ?? null,
      requesterIsElevated: roles.includes('admin') || roles.includes('supervisor'),
      targetAuthUserId: dto.auth_user_id ?? null,
      targetLegacyUserId: dto.user_id ?? null,
    });

    const data = await this.appscripts.call<unknown[]>('vacations_list_team', {
      user_id: legacyUserId,
    });
    return { ok: true, data };
  }

  async set(user: RequestUser, req: Request, dto: VacationsSetDto) {
    const [profile, roles] = await Promise.all([
      this.usersRepository.findById(user.id),
      this.rolesRepository.listRoles(user.id),
    ]);

    const targetLegacyUserId = await this.resolveLegacyUserIdForWrite_({
      requesterProfileLegacyId: profile?.legacy_user_id ?? null,
      requesterIsElevated: roles.includes('admin') || roles.includes('supervisor'),
      targetAuthUserId: dto.auth_user_id ?? null,
      targetLegacyUserId: dto.user_id ?? null,
    });

    const requestId = dto.request_id ?? randomUUID();
    const data = await this.appscripts.call<unknown>('vacations_set', {
      user_id: targetLegacyUserId,
      vacation_init_date: dto.vacation_init_date,
      vacation_end_date: dto.vacation_end_date,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { result: data, request_id: requestId } };
  }

  async delete(user: RequestUser, req: Request, dto: VacationsDeleteDto) {
    const roles = await this.rolesRepository.listRoles(user.id);

    const requestId = dto.request_id ?? randomUUID();
    const data = await this.appscripts.call<unknown>('vacations_delete', {
      vacation_id: dto.vacation_id,
      request_id: requestId,
      actor_user_id: user.id,
      actor_email: user.email ?? '',
      actor_role: resolveActorRole(roles),
      ip: getClientIp(req) ?? '',
      user_agent: getUserAgent(req) ?? '',
    });

    return { ok: true, data: { result: data, request_id: requestId } };
  }

  private async resolveTargetLegacyUserId_(params: {
    requesterProfileLegacyId: number | null;
    requesterIsElevated: boolean;
    targetAuthUserId: string | null;
    targetLegacyUserId: number | null;
  }): Promise<number> {
    if (params.requesterIsElevated) {
      if (params.targetAuthUserId) {
        return this.resolveLegacyUserIdByAuthId_(params.targetAuthUserId);
      }
      if (params.targetLegacyUserId) return params.targetLegacyUserId;
    }

    if (!params.requesterProfileLegacyId) {
      throw new BadRequestException('Missing legacy_user_id for this user');
    }
    return params.requesterProfileLegacyId;
  }

  private async resolveLegacyUserIdForWrite_(params: {
    requesterProfileLegacyId: number | null;
    requesterIsElevated: boolean;
    targetAuthUserId: string | null;
    targetLegacyUserId: number | null;
  }): Promise<number> {
    if (params.requesterIsElevated) {
      if (params.targetAuthUserId) {
        return this.resolveLegacyUserIdByAuthId_(params.targetAuthUserId);
      }
      if (params.targetLegacyUserId) return params.targetLegacyUserId;

      if (params.requesterProfileLegacyId) return params.requesterProfileLegacyId;
      throw new BadRequestException('user_id (legacy) or auth_user_id is required');
    }

    if (!params.requesterProfileLegacyId) {
      throw new BadRequestException('Missing legacy_user_id for this user');
    }
    return params.requesterProfileLegacyId;
  }

  private async resolveLegacyUserIdByAuthId_(authUserId: string): Promise<number> {
    const profile = await this.usersRepository.findById(authUserId);
    const legacyUserId = profile?.legacy_user_id ?? null;
    if (!legacyUserId) {
      throw new BadRequestException('Target user is missing legacy_user_id');
    }
    return legacyUserId;
  }
}
