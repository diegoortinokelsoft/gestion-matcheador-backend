import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class VacationsSetDto {
  @IsOptional()
  @IsUUID()
  auth_user_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  user_id?: number;

  @IsString()
  vacation_init_date!: string;

  @IsString()
  vacation_end_date!: string;

  @IsOptional()
  @IsString()
  request_id?: string;
}
