import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import type { AssetKind, BillingInterval, PricingType } from '@mixoraone/contracts';
import { ASSET_KINDS, BILLING_INTERVALS, PRICING_TYPES } from '@mixoraone/contracts';
import { PartialType } from '@nestjs/swagger';

export class CreateProductDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class CreateVersionDto {
  // Semantic version: major.minor.patch with optional pre-release tag.
  @Matches(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, {
    message: 'semver must look like 1.2.3 or 1.2.3-beta.1',
  })
  semver!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  changelog?: string;
}

export class CreateAssetDto {
  @IsIn(ASSET_KINDS)
  kind!: AssetKind;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  url!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class CreateDocDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsString()
  @Length(1, 100000)
  content!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateDocDto extends PartialType(CreateDocDto) {}

export class CreatePricingPlanDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsIn(PRICING_TYPES)
  type!: PricingType;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @IsOptional()
  @IsIn(BILLING_INTERVALS)
  interval?: BillingInterval;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}
