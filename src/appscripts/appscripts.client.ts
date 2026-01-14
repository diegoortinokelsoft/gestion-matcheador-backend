import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import type { AppscriptsAction } from './actions.registry';

export type AppscriptsRpcError = {
  code: string;
  message: string;
};

export type AppscriptsRpcResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: AppscriptsRpcError; status?: number };

type CallOptions = {
  timeoutMs: number;
  retry: boolean;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asErrorMessage(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeRpcResponse(body: unknown): AppscriptsRpcResponse {
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      error: { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Invalid response' },
    };
  }

  const obj = body as Record<string, unknown>;
  if (obj.ok === true) {
    return { ok: true, data: (obj.data ?? null) as unknown };
  }

  if (obj.ok === false) {
    const status =
      typeof obj.status === 'number' && Number.isFinite(obj.status)
        ? obj.status
        : undefined;

    const rawError = obj.error;
    if (rawError && typeof rawError === 'object') {
      const e = rawError as Record<string, unknown>;
      const code = typeof e.code === 'string' && e.code ? e.code : 'APPSCRIPT_ERROR';
      const message =
        typeof e.message === 'string' && e.message ? e.message : 'Apps Script error';
      return { ok: false, error: { code, message }, status };
    }

    if (typeof rawError === 'string' && rawError) {
      return { ok: false, error: { code: 'APPSCRIPT_ERROR', message: rawError }, status };
    }

    return {
      ok: false,
      error: { code: 'APPSCRIPT_ERROR', message: 'Apps Script error' },
      status,
    };
  }

  return {
    ok: false,
    error: { code: 'UPSTREAM_INVALID_RESPONSE', message: 'Invalid response' },
  };
}

@Injectable()
export class AppscriptsClient {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async call(action: AppscriptsAction, payload: unknown, options: CallOptions) {
    const baseUrl = this.configService.get('APPSCRIPT_BASE_URL', { infer: true });
    const internalToken = this.configService.get('APPSCRIPT_INTERNAL_TOKEN', {
      infer: true,
    });

    const fetchOnce = async (): Promise<AppscriptsRpcResponse> => {
      const abortController = new AbortController();
      const timeout = setTimeout(() => abortController.abort(), options.timeoutMs);

      try {
        const response = await fetch(baseUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            internalToken,
            action,
            payload,
          }),
          signal: abortController.signal,
        });

        const text = await response.text();
        const parsed = (() => {
          if (!text) return null;
          try {
            return JSON.parse(text) as unknown;
          } catch {
            return null;
          }
        })();

        if (!response.ok) {
          return {
            ok: false,
            error: {
              code: 'UPSTREAM_HTTP_ERROR',
              message: `Apps Script HTTP ${response.status}`,
            },
            status: response.status,
          };
        }

        return normalizeRpcResponse(parsed);
      } catch (err) {
        const message = asErrorMessage(err);
        const code =
          err instanceof Error && err.name === 'AbortError'
            ? 'UPSTREAM_TIMEOUT'
            : 'UPSTREAM_FETCH_FAILED';

        return { ok: false, error: { code, message } };
      } finally {
        clearTimeout(timeout);
      }
    };

    const first = await fetchOnce();
    if (first.ok) return first;

    if (!options.retry) return first;

    const retryable =
      first.error.code === 'UPSTREAM_TIMEOUT' || first.error.code === 'UPSTREAM_FETCH_FAILED';
    if (!retryable) return first;

    await sleep(200);
    return fetchOnce();
  }
}
