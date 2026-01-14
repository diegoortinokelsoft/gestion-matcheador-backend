import { IsOptional, IsString } from 'class-validator';

export class ProxyRequestDto {
  @IsString()
  action!: string;

  @IsOptional()
  payload?: unknown;
}

