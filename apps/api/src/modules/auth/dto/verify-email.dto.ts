import { IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @Length(16, 256)
  token!: string;
}
