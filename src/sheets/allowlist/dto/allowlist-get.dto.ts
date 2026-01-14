import { IsEmail } from 'class-validator';

export class AllowlistGetDto {
  @IsEmail()
  email!: string;
}

