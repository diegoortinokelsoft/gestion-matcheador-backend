import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.validation';

@Injectable()
export class SupabaseService {
  public readonly clientAnon: SupabaseClient;
  public readonly clientService: SupabaseClient;

  constructor(private readonly configService: ConfigService<Env, true>) {
    const supabaseUrl = this.configService.get('SUPABASE_URL', { infer: true });
    const anonKey = this.configService.get('SUPABASE_ANON_KEY', { infer: true });
    const serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY', {
      infer: true,
    });

    const baseOptions = {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    } as const;

    this.clientAnon = createClient(supabaseUrl, anonKey, baseOptions);
    this.clientService = createClient(supabaseUrl, serviceRoleKey, baseOptions);
  }

  createAnonClientForToken(accessToken: string): SupabaseClient {
    const supabaseUrl = this.configService.get('SUPABASE_URL', { infer: true });
    const anonKey = this.configService.get('SUPABASE_ANON_KEY', { infer: true });

    return createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });
  }
}

