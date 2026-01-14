import { Injectable } from '@nestjs/common';
import { AppscriptsGateway } from '../../appscripts/appscripts.gateway';
import { LogsQueryDto } from './dto/logs-query.dto';

@Injectable()
export class LogsService {
  constructor(private readonly appscripts: AppscriptsGateway) {}

  async query(dto: LogsQueryDto) {
    const limit = Math.min(Number(dto.limit ?? 100), 500);
    const offset = Number(dto.offset ?? 0);

    const data = await this.appscripts.call<unknown>('logs_query', {
      from: dto.from ?? null,
      to: dto.to ?? null,
      actor_email: dto.actor_email ?? null,
      action: dto.action ?? null,
      resource: dto.resource ?? null,
      result: dto.result ?? null,
      limit,
      offset,
    });

    return { ok: true, data };
  }
}

