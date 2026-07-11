import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { DeveloperProfile, PublicDeveloperProfile } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateDeveloperProfileDto } from './dto/create-developer-profile.dto';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { UpdateDeveloperProfileDto } from './dto/update-developer-profile.dto';
import { DevelopersService } from './developers.service';

@ApiTags('developers')
@Controller('developers')
export class DevelopersController {
  constructor(private readonly developersService: DevelopersService) {}

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Own developer profile with verification status' })
  getOwn(@CurrentUser() principal: AuthPrincipal): Promise<DeveloperProfile> {
    return this.developersService.getOwnProfile(principal.userId);
  }

  @Post('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a developer profile (upgrades role to DEVELOPER)' })
  create(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: CreateDeveloperProfileDto,
  ): Promise<DeveloperProfile> {
    return this.developersService.createOwnProfile(principal.userId, dto);
  }

  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the developer profile' })
  update(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: UpdateDeveloperProfileDto,
  ): Promise<DeveloperProfile> {
    return this.developersService.updateOwnProfile(principal.userId, dto);
  }

  @Post('me/verification')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Submit a trust verification request' })
  async submitVerification(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: SubmitVerificationDto,
  ): Promise<{ status: 'PENDING' }> {
    await this.developersService.submitVerification(principal.userId, dto);
    return { status: 'PENDING' };
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public developer profile' })
  getPublic(@Param('slug') slug: string): Promise<PublicDeveloperProfile> {
    return this.developersService.getPublicBySlug(slug);
  }
}
