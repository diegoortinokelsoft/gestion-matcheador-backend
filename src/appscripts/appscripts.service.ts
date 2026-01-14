import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { AppscriptsClient } from './appscripts.client';
import type { ProxyRequestDto } from './dto/proxy-request.dto';

const ALLOWED_ACTIONS = new Set<string>(['getUserTasks', 'getVacations']);

@Injectable()
export class AppscriptsService {
  private readonly logger = new Logger(AppscriptsService.name);

  constructor(private readonly appscriptsClient: AppscriptsClient) {}

  async proxy(userId: string, dto: ProxyRequestDto) {
    if (!ALLOWED_ACTIONS.has(dto.action)) {
      throw new ForbiddenException('Action not allowed');
    }

    const result = await this.appscriptsClient.call(dto.action, dto.payload ?? null);
    this.logger.log(
      `action=${dto.action} user_id=${userId} status=${result.status}`,
    );

    return result.body;
  }
}

