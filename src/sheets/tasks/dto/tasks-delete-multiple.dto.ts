import { IsArray, IsOptional, IsString } from 'class-validator';

export class TasksDeleteMultipleDto {
  @IsArray()
  task_ids!: string[];

  @IsOptional()
  @IsString()
  request_id?: string;
}

