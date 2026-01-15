import { IsString, IsUUID } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  userId!: string;

  @IsString()
  role!: string;
}

