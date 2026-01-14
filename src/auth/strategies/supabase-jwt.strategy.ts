import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { SupabaseService } from '../../supabase/supabase.service';
import type { RequestUser } from '../../common/types/request-user.type';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return null;
  if (!token) return null;
  return token.trim();
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
    const accessToken = extractBearerToken(req);
    if (!accessToken) {
      throw new UnauthorizedException('Missing bearer token');
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

