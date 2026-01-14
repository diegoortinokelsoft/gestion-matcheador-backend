export type SessionEntity = {
  session_id: string;
  user_id: string;
  created_at: string;
  expires_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  ip: string | null;
  user_agent: string | null;
  session_hash?: string | null;
};

