import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class AbsencesCreateDto {
  @IsOptional()
  @IsUUID()
  auth_user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @IsString()
  absence_case!: string;

  @IsString()
  absence_date!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  request_id?: string;
}

