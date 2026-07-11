import { IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';

export class SubmitVerificationDto {
  @IsString()
  @Length(2, 200)
  legalName!: string;

  @IsString()
  @Length(2, 80)
  country!: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  evidenceUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
