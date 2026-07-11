import { IsEmail, IsIn, IsOptional, MaxLength } from 'class-validator';
import type { OrganizationRole } from '@mixoraone/contracts';
import { ORGANIZATION_ROLES } from '@mixoraone/contracts';

export class AddMemberDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(ORGANIZATION_ROLES)
  role?: OrganizationRole;
}
