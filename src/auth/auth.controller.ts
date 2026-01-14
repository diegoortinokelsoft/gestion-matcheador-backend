import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { RolesRepository } from '../roles/roles.repository';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { PasswordRecoveryRequestDto } from './dto/password-recovery-request.dto';
import { RegisterDto } from './dto/register.dto';
import { RateLimitService } from '../common/rate-limit/rate-limit.service';
import { CSRF_COOKIE_NAME } from '../common/middleware/csrf.middleware';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../common/decorators/user.decorator';
import type { RequestUser } from '../common/types/request-user.type';

const ACCESS_TOKEN_COOKIE_NAME = 'access_token';
const REFRESH_TOKEN_COOKIE_NAME = 'refresh_token';

function getCookie(
  req: Request,
  name: string,
): string | null {
  const cookies = (req as Request & { cookies?: Record<string, unknown> }).cookies;
  const value = cookies?.[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip || 'unknown';
}

function getUserAgent(req: Request): string {
  const userAgent = req.headers['user-agent'];
  return typeof userAgent === 'string' ? userAgent : '';
}

function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rolesRepository: RolesRepository,
    private readonly rateLimitService: RateLimitService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  @Get('csrf')
  async csrf(@Res({ passthrough: true }) res: Response) {
    res.setHeader('cache-control', 'no-store');

    const csrfToken = createCsrfToken();
    this.setCsrfCookie(res, csrfToken, 1000 * 60 * 60 * 24 * 30);

    return { ok: true, csrf_token: csrfToken };
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    res.setHeader('cache-control', 'no-store');

    this.enforceLoginRateLimit(req, dto.email);

    const result = await this.authService.login(dto);
    const { session, ...publicResult } = result;

    const accessMaxAgeMs = (session.expires_in ?? 0) > 0
      ? session.expires_in * 1000
      : undefined;
    const refreshMaxAgeMs = 1000 * 60 * 60 * 24 * 30;

    this.setAccessCookie(res, session.access_token, accessMaxAgeMs);
    if (session.refresh_token) {
      this.setRefreshCookie(res, session.refresh_token, refreshMaxAgeMs);
    }

    const csrfToken = getCookie(req, CSRF_COOKIE_NAME) ?? createCsrfToken();
    if (!getCookie(req, CSRF_COOKIE_NAME)) {
      this.setCsrfCookie(res, csrfToken, refreshMaxAgeMs);
    }

    return { ok: true, ...publicResult, csrf_token: csrfToken };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req?: Request,
  ) {
    const token = req ? getCookie(req, ACCESS_TOKEN_COOKIE_NAME) : null;

    if (token) {
      const caller = await this.authService.validateAccessToken(token);
      const callerRoles = await this.rolesRepository.listRoles(caller.id);
      if (!callerRoles.includes('admin')) {
        throw new ForbiddenException('Admin role required');
      }

      return this.authService.register(dto);
    }

    const hasAnyAssignments = await this.rolesRepository.hasAnyAssignments();
    if (hasAnyAssignments) {
      throw new ForbiddenException('Admin role required');
    }

    return this.authService.register(dto, { bootstrap: true });
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('cache-control', 'no-store');

    const refreshToken = getCookie(req, REFRESH_TOKEN_COOKIE_NAME);
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refreshSession(refreshToken);
    const { session, ...publicResult } = result;

    const accessMaxAgeMs = (session.expires_in ?? 0) > 0
      ? session.expires_in * 1000
      : undefined;
    const refreshMaxAgeMs = 1000 * 60 * 60 * 24 * 30;

    this.setAccessCookie(res, session.access_token, accessMaxAgeMs);
    if (session.refresh_token) {
      this.setRefreshCookie(res, session.refresh_token, refreshMaxAgeMs);
    }

    const csrfToken = getCookie(req, CSRF_COOKIE_NAME) ?? createCsrfToken();
    if (!getCookie(req, CSRF_COOKIE_NAME)) {
      this.setCsrfCookie(res, csrfToken, refreshMaxAgeMs);
    }

    return { ok: true, ...publicResult, csrf_token: csrfToken };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.setHeader('cache-control', 'no-store');
    this.clearAuthCookies(res);
    return { ok: true };
  }

  @Post('password-recovery/request')
  async passwordRecoveryRequest(
    @Req() req: Request,
    @Body() dto: PasswordRecoveryRequestDto,
  ) {
    this.enforcePasswordRecoveryRateLimit(req, dto.email);

    await this.authService.requestPasswordRecovery(dto.email, {
      ip: getClientIp(req),
      user_agent: getUserAgent(req),
    });

    return { ok: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @User() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader('cache-control', 'no-store');

    const csrfCookie = getCookie(req, CSRF_COOKIE_NAME);
    const csrfToken = csrfCookie ?? createCsrfToken();
    if (!csrfCookie) {
      this.setCsrfCookie(res, csrfToken);
    }

    const data = await this.authService.me(user.id, user.email);
    return { ok: true, ...data, csrf_token: csrfToken };
  }

  private enforceLoginRateLimit(req: Request, email: string) {
    const perIp = this.configService.get('RATE_LIMIT_AUTH_LOGIN_PER_IP', {
      infer: true,
    });
    const perEmail = this.configService.get('RATE_LIMIT_AUTH_LOGIN_PER_EMAIL', {
      infer: true,
    });
    const windowSeconds = this.configService.get(
      'RATE_LIMIT_AUTH_LOGIN_WINDOW_SECONDS',
      { infer: true },
    );

    const windowMs = windowSeconds * 1000;
    const ip = getClientIp(req);
    const emailKey = email.trim().toLowerCase();

    const ipHit = this.rateLimitService.hit(
      `auth_login:ip:${ip}`,
      perIp,
      windowMs,
    );
    if (!ipHit.allowed) {
      throw new HttpException('Too many login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }

    const emailHit = this.rateLimitService.hit(
      `auth_login:email:${emailKey}`,
      perEmail,
      windowMs,
    );
    if (!emailHit.allowed) {
      throw new HttpException('Too many login attempts', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private enforcePasswordRecoveryRateLimit(req: Request, email: string) {
    const perIp = this.configService.get('RATE_LIMIT_AUTH_RECOVERY_PER_IP', {
      infer: true,
    });
    const perEmail = this.configService.get('RATE_LIMIT_AUTH_RECOVERY_PER_EMAIL', {
      infer: true,
    });
    const windowSeconds = this.configService.get(
      'RATE_LIMIT_AUTH_RECOVERY_WINDOW_SECONDS',
      { infer: true },
    );

    const windowMs = windowSeconds * 1000;
    const ip = getClientIp(req);
    const emailKey = email.trim().toLowerCase();

    const ipHit = this.rateLimitService.hit(
      `auth_recovery:ip:${ip}`,
      perIp,
      windowMs,
    );
    if (!ipHit.allowed) {
      throw new HttpException(
        'Too many password recovery attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const emailHit = this.rateLimitService.hit(
      `auth_recovery:email:${emailKey}`,
      perEmail,
      windowMs,
    );
    if (!emailHit.allowed) {
      throw new HttpException(
        'Too many password recovery attempts',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private cookieBaseOptions() {
    const nodeEnv = this.configService.get('NODE_ENV', { infer: true });
    const secure = nodeEnv === 'production';

    return {
      secure,
      sameSite: 'lax' as const,
      path: '/' as const,
    };
  }

  private setAccessCookie(res: Response, accessToken: string, maxAgeMs?: number) {
    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
      ...this.cookieBaseOptions(),
      httpOnly: true,
      maxAge: maxAgeMs,
    });
  }

  private setRefreshCookie(res: Response, refreshToken: string, maxAgeMs?: number) {
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      ...this.cookieBaseOptions(),
      httpOnly: true,
      maxAge: maxAgeMs,
    });
  }

  private setCsrfCookie(res: Response, csrfToken: string, maxAgeMs?: number) {
    res.cookie(CSRF_COOKIE_NAME, csrfToken, {
      ...this.cookieBaseOptions(),
      httpOnly: false,
      maxAge: maxAgeMs,
    });
  }

  private clearAuthCookies(res: Response) {
    const base = this.cookieBaseOptions();
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, { ...base, httpOnly: true });
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, { ...base, httpOnly: true });
    res.clearCookie(CSRF_COOKIE_NAME, { ...base, httpOnly: false });
  }
}
