import { IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';

export class VacationsListTeamDto {
  @IsOptional()
  @IsUUID()
  auth_user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;
}

