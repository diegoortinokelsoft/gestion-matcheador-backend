export type UserProfileRow = {
  id: string;
  legacy_user_id: number | null;
  peopleforce_id: string | null;
  name: string;
  meli: string | null;
  status: string;
  status_detail: string | null;
  team: string | null;
  leader: string | null;
  created_at: string;
  updated_at: string;
};

export type UserRoleRow = {
  auth_user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

export type RolePermissionRow = {
  role: string;
  permission: string;
  created_at: string;
  updated_at: string;
};

export type SessionRow = {
  session_id: string;
  user_id: string;
  created_at: string;
  expires_at: string | null;
  last_seen_at: string | null;
  revoked_at: string | null;
  ip: string | null;
  user_agent: string | null;
  session_hash: string | null;
};

