import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Organization, OrganizationMember } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AddMemberDto } from './dto/add-member.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Organizations the current user belongs to' })
  list(@CurrentUser() principal: AuthPrincipal): Promise<Organization[]> {
    return this.organizationsService.listForUser(principal.userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create an organization (creator becomes owner)' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateOrganizationDto,
  ): Promise<Organization> {
    return this.organizationsService.create(principal.userId, dto.name);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List members (members only)' })
  members(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<OrganizationMember[]> {
    return this.organizationsService.listMembers(organizationId, principal.userId);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add a member by email (owners only)' })
  addMember(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: AddMemberDto,
  ): Promise<OrganizationMember> {
    return this.organizationsService.addMember(organizationId, principal.userId, dto);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member (owners) or leave (self)' })
  removeMember(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<void> {
    return this.organizationsService.removeMember(organizationId, principal.userId, memberUserId);
  }
}
