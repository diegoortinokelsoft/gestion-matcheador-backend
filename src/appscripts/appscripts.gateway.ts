import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';
import { AppscriptsClient } from './appscripts.client';
import { APPSCRIPTS_ACTIONS, type AppscriptsAction } from './actions.registry';

function resolveTimeoutMs(defaultMs: number): number {
  if (!Number.isFinite(defaultMs) || defaultMs <= 0) return 10_000;
  return Math.floor(defaultMs);
}

@Injectable()
export class AppscriptsGateway {
  private readonly logger = new Logger(AppscriptsGateway.name);

  constructor(
    private readonly client: AppscriptsClient,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async call<T>(action: AppscriptsAction, payload: unknown): Promise<T> {
    const meta = APPSCRIPTS_ACTIONS[action];
    if (!meta) {
      throw new HttpException(
        { ok: false, error: { code: 'ACTION_NOT_ALLOWED', message: 'Action not allowed' } },
        HttpStatus.BAD_REQUEST,
      );
    }

    const timeoutMs = resolveTimeoutMs(
      this.configService.get('APPSCRIPT_TIMEOUT_MS', { infer: true }),
    );

    const startedAt = Date.now();
    const response = await this.client.call(action, payload, {
      timeoutMs,
      retry: meta.retry,
    });
    const durationMs = Date.now() - startedAt;

    if (response.ok) {
      this.logger.log(`action=${action} ok=true duration_ms=${durationMs}`);
      return response.data as T;
    }

    const upstreamCode = response.error.code || 'APPSCRIPT_ERROR';
    const upstreamMessage = response.error.message || 'Apps Script error';

    this.logger.warn(`action=${action} ok=false duration_ms=${durationMs} code=${upstreamCode}`);

    throw new HttpException(
      { ok: false, error: { code: upstreamCode, message: upstreamMessage } },
      HttpStatus.BAD_GATEWAY,
    );
  }
}

