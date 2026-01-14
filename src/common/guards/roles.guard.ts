import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { RequestUser } from '../types/request-user.type';
import { SupabaseService } from '../../supabase/supabase.service';

function normalizeRoles(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.filter((v) => typeof v === 'string');
  return [];
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const requestUser = request.user;
    if (!requestUser) {
      throw new UnauthorizedException('Missing authenticated user');
    }

    const rolesFromClaims = normalizeRoles(requestUser.claims?.['user_role']);
    const rolesFromMetadata = normalizeRoles(
      requestUser.supabaseUser?.app_metadata?.['user_role'],
    );
    const userRoles = [...new Set([...rolesFromClaims, ...rolesFromMetadata])];

    if (userRoles.length === 0) {
      const { data, error } = await this.supabaseService.clientService
        .from('user_roles')
        .select('role')
        .eq('auth_user_id', requestUser.id);
      if (error) throw new ForbiddenException(error.message);

      const dbRoles = (data ?? [])
        .map((row) => row.role)
        .filter((role): role is string => typeof role === 'string');
      userRoles.push(...dbRoles);
    }

    const allowed = requiredRoles.some((role) => userRoles.includes(role));
    if (!allowed) {
      throw new ForbiddenException('Insufficient role');
    }

    return true;
  }
}

