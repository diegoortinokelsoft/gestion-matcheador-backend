import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID } from 'class-validator';

export class AbsencesListUserDto {
  @IsOptional()
  @IsUUID()
  auth_user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;
}

