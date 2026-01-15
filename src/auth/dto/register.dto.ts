import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  meli?: string | null;

  @IsOptional()
  @IsInt()
  legacy_user_id?: number | null;

  @IsOptional()
  @IsString()
  peopleforce_id?: string | null;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  status_detail?: string | null;

  @IsOptional()
  @IsString()
  team?: string | null;

  @IsOptional()
  @IsString()
  leader?: string | null;
}

