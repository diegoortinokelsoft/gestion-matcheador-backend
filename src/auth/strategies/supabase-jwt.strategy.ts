import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { SupabaseService } from '../../supabase/supabase.service';
import type { RequestUser } from '../../common/types/request-user.type';

const ACCESS_TOKEN_COOKIE_NAME = 'access_token';

function extractAccessToken(req: Request): string | null {
  const cookies = (req as Request & { cookies?: Record<string, unknown> }).cookies;
  const token = cookies?.[ACCESS_TOKEN_COOKIE_NAME];
  if (typeof token !== 'string') return null;
  const trimmed = token.trim();
  return trimmed ? trimmed : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');

  try {
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

@Injectable()
export class SupabaseJwtStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(private readonly supabaseService: SupabaseService) {
    super();
  }

  async validate(req: Request): Promise<RequestUser> {
    const accessToken = extractAccessToken(req);
    if (!accessToken) {
      throw new UnauthorizedException('Missing access token cookie');
    }

    const { data, error } = await this.supabaseService.clientAnon.auth.getUser(
      accessToken,
    );
    if (error || !data.user) {
      throw new UnauthorizedException(error?.message || 'Invalid token');
    }

    return {
      id: data.user.id,
      email: data.user.email ?? null,
      claims: decodeJwtPayload(accessToken),
      supabaseUser: data.user,
    };
  }
}
