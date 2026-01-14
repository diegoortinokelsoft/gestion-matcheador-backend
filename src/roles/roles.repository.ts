import { BadRequestException, Injectable } from '@nestjs/common';
import { throwIfSupabaseError } from '../common/utils/http-errors';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class RolesRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async assignRole(userId: string, role: string): Promise<void> {
    const { error } = await this.supabaseService.clientService
      .from('user_roles')
      .upsert({ auth_user_id: userId, role }, { onConflict: 'auth_user_id,role' });

    throwIfSupabaseError(error, 'Failed to assign role');
  }

  async revokeRole(userId: string, role: string): Promise<void> {
    const { error } = await this.supabaseService.clientService
      .from('user_roles')
      .delete()
      .eq('auth_user_id', userId)
      .eq('role', role);

    throwIfSupabaseError(error, 'Failed to revoke role');
  }

  async listRoles(userId: string): Promise<string[]> {
    const { data, error } = await this.supabaseService.clientService
      .from('user_roles')
      .select('role')
      .eq('auth_user_id', userId);

    throwIfSupabaseError(error, 'Failed to list roles');

    return (data ?? [])
      .map((row) => row.role)
      .filter((role): role is string => typeof role === 'string');
  }

  async userHasRole(userId: string, role: string): Promise<boolean> {
    const roles = await this.listRoles(userId);
    return roles.includes(role);
  }

  async hasAnyAssignments(): Promise<boolean> {
    const { data, error } = await this.supabaseService.clientService
      .from('user_roles')
      .select('auth_user_id')
      .limit(1);

    if (error) {
      throw new BadRequestException(error.message);
    }

    return (data?.length ?? 0) > 0;
  }
}

