import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.validation';

@Injectable()
export class AppscriptsClient {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  async call(action: string, payload: unknown) {
    const baseUrl = this.configService.get('APPSCRIPT_BASE_URL', { infer: true });
    const internalToken = this.configService.get('APPSCRIPT_INTERNAL_TOKEN', {
      infer: true,
    });

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
    });

    const text = await response.text();
    const body = (() => {
      if (!text) return null;
      try {
        return JSON.parse(text) as unknown;
      } catch {
        return text;
      }
    })();

    if (!response.ok) {
      throw new BadGatewayException({
        status: response.status,
        body,
      });
    }

    return { status: response.status, body };
  }
}

