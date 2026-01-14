import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { User } from '@supabase/supabase-js';
import { AppscriptsGateway } from '../appscripts/appscripts.gateway';
import type { Env } from '../config/env.validation';
import { RolesRepository } from '../roles/roles.repository';
import { SupabaseService } from '../supabase/supabase.service';
import { UsersRepository } from '../users/users.repository';
import { throwIfSupabaseError } from '../common/utils/http-errors';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

type RegisterOptions = {
  bootstrap?: boolean;
};

type AllowlistEntry = {
  email: string;
  enabled: boolean;
  can_reset_password: boolean;
};

type PasswordRecoveryContext = {
  ip?: string | null;
  user_agent?: string | null;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly usersRepository: UsersRepository,
    private readonly rolesRepository: RolesRepository,
    private readonly appscripts: AppscriptsGateway,
    private readonly configService: ConfigService<Env, true>,
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
    const roles = await this.rolesRepository.listRoles(user.id);

    return {
      session,
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      roles,
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

  async me(userId: string, email: string | null) {
    const profile = await this.usersRepository.findById(userId);
    const roles = await this.rolesRepository.listRoles(userId);

    return {
      user: { id: userId, email },
      profile,
      roles,
    };
  }

  async refreshSession(refreshToken: string) {
    const { data, error } = await this.supabaseService.clientAnon.auth.refreshSession(
      {
        refresh_token: refreshToken,
      },
    );

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    const session = data.session;
    const user = data.user;
    if (!session || !user) {
      throw new UnauthorizedException('Invalid refresh response from Supabase');
    }

    const profile = await this.usersRepository.findById(user.id);
    const roles = await this.rolesRepository.listRoles(user.id);

    return {
      session,
      user: { id: user.id, email: user.email },
      profile,
      roles,
    };
  }

  async requestPasswordRecovery(email: string, context: PasswordRecoveryContext = {}) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    let allowed = false;
    let result: 'OK' | 'ERROR' = 'OK';
    let errorMessage = '';

    try {
      const entry = await this.appscripts.call<AllowlistEntry | null>('allowlist_get', {
        email: normalizedEmail,
      });

      allowed = Boolean(entry?.enabled && entry?.can_reset_password);
    } catch (err) {
      result = 'ERROR';
      errorMessage = 'Allowlist lookup failed';
      this.logger.warn(`password_recovery allowlist_get failed: ${String(err)}`);
    }

    if (allowed) {
      try {
        const redirectTo = this.configService.get('SUPABASE_RESET_PASSWORD_REDIRECT_URL', {
          infer: true,
        });

        const { error } = await this.supabaseService.clientAnon.auth.resetPasswordForEmail(
          normalizedEmail,
          redirectTo ? { redirectTo } : undefined,
        );
        if (error) {
          result = 'ERROR';
          errorMessage = error.message;
          this.logger.warn(`password_recovery supabase error: ${error.message}`);
        }
      } catch (err) {
        result = 'ERROR';
        errorMessage = 'Supabase resetPasswordForEmail failed';
        this.logger.warn(`password_recovery supabase exception: ${String(err)}`);
      }
    }

    try {
      await this.appscripts.call('logs_append', {
        action: 'AUTH_PASSWORD_RESET_REQUEST',
        resource: 'auth',
        actor_email: normalizedEmail,
        result,
        error_message: errorMessage,
        ip: context.ip ?? '',
        user_agent: context.user_agent ?? '',
        meta_json: { allowed },
      });
    } catch (err) {
      this.logger.warn(`password_recovery logs_append failed: ${String(err)}`);
    }
  }
}
