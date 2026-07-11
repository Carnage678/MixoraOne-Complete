import { Body, Controller, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@mixoraone/contracts';

import type { AuthPrincipal } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  updateProfile(
    @CurrentUser() principal: AuthPrincipal,
    @Body() dto: UpdateProfileDto,
  ): Promise<AuthUser> {
    return this.usersService.updateProfile(principal.userId, dto);
  }
}
