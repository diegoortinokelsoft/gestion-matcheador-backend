import { IsOptional, IsString } from 'class-validator';

export class AbsencesDeleteDto {
  @IsString()
  absence_id!: string;

  @IsOptional()
  @IsString()
  request_id?: string;
}

