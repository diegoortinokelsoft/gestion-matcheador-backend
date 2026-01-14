import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { RolesRepository } from '../roles/roles.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersRepository } from '../users/users.repository';
import { throwIfSupabaseError } from '../common/utils/http-errors';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

type RegisterOptions = {
  bootstrap?: boolean;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async login(dto: LoginDto) {
    const { data, error } =
      await this.supabaseService.clientAnon.auth.signInWithPassword({
        email: dto.email,
        password: dto.password,
      });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    const session = data.session;
    const user = data.user;
    if (!session || !user) {
      throw new UnauthorizedException('Invalid login response from Supabase');
    }

    const profile = await this.usersRepository.findById(user.id);

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
    };
  }

  async register(dto: RegisterDto, options: RegisterOptions = {}) {
    const { data, error } = await this.supabaseService.clientService.auth.admin.createUser(
      {
        email: dto.email,
        password: dto.password,
        email_confirm: true,
      },
    );
    throwIfSupabaseError(error, 'Failed to create Supabase user');

    const user = data.user;
    if (!user) {
      throw new UnauthorizedException('Supabase user was not created');
    }

    try {
      const profile = await this.usersRepository.createProfile({
        id: user.id,
        name: dto.name,
        meli: dto.meli ?? null,
        legacy_user_id: dto.legacy_user_id ?? null,
        peopleforce_id: dto.peopleforce_id ?? null,
        status: dto.status ?? 'Activo',
        status_detail: dto.status_detail ?? null,
        team: dto.team ?? null,
        leader: dto.leader ?? null,
      });

      if (options.bootstrap) {
        await this.rolesRepository.assignRole(user.id, 'admin');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
        },
        profile,
        bootstrap_admin_assigned: Boolean(options.bootstrap),
      };
    } catch (err) {
      await this.supabaseService.clientService.auth.admin.deleteUser(user.id);
      throw err;
    }
  }

  async validateAccessToken(accessToken: string): Promise<User> {
    const { data, error } = await this.supabaseService.clientAnon.auth.getUser(
      accessToken,
    );

    if (error || !data.user) {
      throw new UnauthorizedException(error?.message || 'Invalid token');
    }

    return data.user;
  }
}

