import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';

export class CreateDeveloperProfileDto {
  @IsString()
  @Length(2, 80)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  bio?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  websiteUrl?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(300)
  githubUrl?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  skills?: string[];
}
