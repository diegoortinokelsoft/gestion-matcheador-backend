import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SessionsRepository } from './sessions.repository';

type RegisterSessionMeta = {
  ip: string | null;
  user_agent: string | null;
};

@Injectable()
export class SessionsService {
  constructor(private readonly sessionsRepository: SessionsRepository) {}

  registerSession(userId: string, meta: RegisterSessionMeta) {
    return this.sessionsRepository.create({
      session_id: randomUUID(),
      user_id: userId,
      ip: meta.ip,
      user_agent: meta.user_agent,
      expires_at: null,
      session_hash: null,
    });
  }

  revokeSession(userId: string, sessionId: string) {
    return this.sessionsRepository.revoke(userId, sessionId);
  }

  listSessions(userId: string) {
    return this.sessionsRepository.listByUser(userId);
  }
}

