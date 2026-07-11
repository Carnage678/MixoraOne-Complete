import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  // ADR 0002: length over composition rules; breached-password check comes
  // with the notifications/security hardening pass.
  @IsString()
  @MinLength(10)
  @MaxLength(128)
  password!: string;

  @IsString()
  @Length(1, 100)
  name!: string;
}
