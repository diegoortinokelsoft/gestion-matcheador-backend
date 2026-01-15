import { IsArray, IsOptional, IsString } from 'class-validator';

export class TasksSetMultipleDto {
  @IsArray()
  tasks!: unknown[];

  @IsOptional()
  @IsString()
  request_id?: string;
}

