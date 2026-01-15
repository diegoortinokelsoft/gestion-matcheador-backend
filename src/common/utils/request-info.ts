import type { Request } from 'express';

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.ip || null;
}

export function getUserAgent(req: Request): string | null {
  const userAgent = req.headers['user-agent'];
  return typeof userAgent === 'string' ? userAgent : null;
}

