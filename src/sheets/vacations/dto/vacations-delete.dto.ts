import { IsOptional, IsString } from 'class-validator';

export class VacationsDeleteDto {
  @IsString()
  vacation_id!: string;

  @IsOptional()
  @IsString()
  request_id?: string;
}

