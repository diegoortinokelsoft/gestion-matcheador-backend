import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

type CsrfMiddlewareOptions = {
  allowedOrigins: string[];
};

function getOriginFromHeaders(req: Request): string | null {
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin) return origin;

  const referer = req.headers.referer;
  if (typeof referer !== 'string' || !referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

function safeEquals(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function jsonForbidden(res: Response, code: string, message: string) {
  return res.status(403).json({ ok: false, error: { code, message } });
}

function isSafeMethod(method: string): boolean {
  const upper = method.toUpperCase();
  return upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS';
}

export function createCsrfMiddleware(options: CsrfMiddlewareOptions) {
  const allowedOriginsSet = new Set(options.allowedOrigins);

  return function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
    if (isSafeMethod(req.method)) return next();

    const origin = getOriginFromHeaders(req);
    if (!origin) {
      return jsonForbidden(res, 'CSRF_ORIGIN_MISSING', 'Missing Origin/Referer');
    }

    if (!allowedOriginsSet.has(origin)) {
      return jsonForbidden(res, 'CSRF_ORIGIN_FORBIDDEN', 'Invalid Origin/Referer');
    }

    const csrfCookie = (req as Request & { cookies?: Record<string, unknown> })
      .cookies?.[CSRF_COOKIE_NAME];
    const csrfHeader = req.get(CSRF_HEADER_NAME);

    if (typeof csrfCookie !== 'string' || !csrfCookie) {
      return jsonForbidden(res, 'CSRF_TOKEN_MISSING', 'Missing CSRF cookie');
    }

    if (typeof csrfHeader !== 'string' || !csrfHeader) {
      return jsonForbidden(res, 'CSRF_TOKEN_MISSING', 'Missing CSRF header');
    }

    if (!safeEquals(csrfCookie, csrfHeader)) {
      return jsonForbidden(res, 'CSRF_TOKEN_INVALID', 'Invalid CSRF token');
    }

    return next();
  };
}

