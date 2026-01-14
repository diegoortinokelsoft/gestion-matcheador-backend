import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { throwIfSupabaseError } from '../common/utils/http-errors';
import { SupabaseService } from '../supabase/supabase.service';
import type { UserProfileEntity } from './entities/user-profile.entity';
import type { UpdateUserDto } from './dto/update-user.dto';

type CreateProfileInput = {
  id: string;
  legacy_user_id: number | null;
  peopleforce_id: string | null;
  name: string;
  meli: string | null;
  status: string;
  status_detail: string | null;
  team: string | null;
  leader: string | null;
};

@Injectable()
export class UsersRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findById(id: string): Promise<UserProfileEntity | null> {
    const { data, error } = await this.supabaseService.clientService
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    throwIfSupabaseError(error, 'Failed to fetch profile');
    return (data as UserProfileEntity) ?? null;
  }

  async findAll(): Promise<UserProfileEntity[]> {
    const { data, error } = await this.supabaseService.clientService
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    throwIfSupabaseError(error, 'Failed to fetch profiles');
    return (data as UserProfileEntity[]) ?? [];
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserProfileEntity> {
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) patch[key] = value;
    }

    const { data, error } = await this.supabaseService.clientService
      .from('user_profiles')
      .update(patch)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Profile not found');
    }

    return data as UserProfileEntity;
  }

  async createProfile(input: CreateProfileInput): Promise<UserProfileEntity> {
    const { data, error } = await this.supabaseService.clientService
      .from('user_profiles')
      .insert(input)
      .select('*')
      .single();

    throwIfSupabaseError(error, 'Failed to create profile');
    return data as UserProfileEntity;
  }
}

