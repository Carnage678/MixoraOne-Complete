import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@mixoraone/contracts';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given roles (evaluated after authentication). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
