import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import type { SessionEntity } from './entities/session.entity';

type CreateSessionInput = Pick<
  SessionEntity,
  'session_id' | 'user_id' | 'ip' | 'user_agent' | 'expires_at' | 'session_hash'
>;

@Injectable()
export class SessionsRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async create(input: CreateSessionInput): Promise<SessionEntity> {
    const { data, error } = await this.supabaseService.clientService
      .from('sessions')
      .insert({
        ...input,
        last_seen_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data as SessionEntity;
  }

  async revoke(userId: string, sessionId: string): Promise<void> {
    const { error } = await this.supabaseService.clientService
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('session_id', sessionId);

    if (error) throw new BadRequestException(error.message);
  }

  async listByUser(userId: string): Promise<SessionEntity[]> {
    const { data, error } = await this.supabaseService.clientService
      .from('sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return (data as SessionEntity[]) ?? [];
  }
}

