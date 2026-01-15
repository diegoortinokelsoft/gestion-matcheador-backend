import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class AllowlistUpsertDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  role_hint?: string;

  @IsOptional()
  @IsBoolean()
  can_reset_password?: boolean;

  @IsOptional()
  @IsBoolean()
  can_manage_users?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  request_id?: string;
}

