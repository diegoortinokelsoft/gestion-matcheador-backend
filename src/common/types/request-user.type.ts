import type { User } from '@supabase/supabase-js';

export type RequestUser = {
  id: string;
  email: string | null;
  claims: Record<string, unknown> | null;
  supabaseUser: User;
};

