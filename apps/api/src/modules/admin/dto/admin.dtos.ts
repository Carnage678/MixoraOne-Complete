import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import {
  MODERATION_DECISIONS,
  type ModerationDecision,
  type TrustCheckStatus,
} from '@mixoraone/contracts';

export class TrustCheckDecisionDto {
  @IsIn(['APPROVED', 'REJECTED'] satisfies TrustCheckStatus[])
  status!: Extract<TrustCheckStatus, 'APPROVED' | 'REJECTED'>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNote?: string;
}

export class ModerationDecisionDto {
  @IsIn(MODERATION_DECISIONS)
  decision!: ModerationDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  decisionNote?: string;
}

export class ResolveDisputeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(5000)
  resolution!: string;
}
