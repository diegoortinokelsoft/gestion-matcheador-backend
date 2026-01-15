import { IsEmail } from 'class-validator';

export class AllowlistDisableDto {
  @IsEmail()
  email!: string;
}

