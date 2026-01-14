export type UserProfileEntity = {
  id: string;
  legacy_user_id?: number;
  peopleforce_id?: string | null;
  name: string;
  meli: string | null;
  status: 'Activo' | 'Inactivo' | string;
  status_detail?: string | null;
  team?: string | null;
  leader?: string | null;
  created_at: string;
  updated_at: string;
};

