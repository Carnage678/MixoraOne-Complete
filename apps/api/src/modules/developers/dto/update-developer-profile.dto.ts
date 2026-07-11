import { PartialType } from '@nestjs/swagger';

import { CreateDeveloperProfileDto } from './create-developer-profile.dto';

export class UpdateDeveloperProfileDto extends PartialType(CreateDeveloperProfileDto) {}
