import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

const roleHierarchy: Record<Rol, number> = {
  cliente: 1,
  medico: 2,
  admin: 3,
};

interface RequestWithUser {
  user?: { rol: Rol };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Rol[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();
    if (!user) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción.',
      );
    }

    const userLevel = roleHierarchy[user.rol];
    const minRequiredLevel = Math.min(
      ...requiredRoles.map((r) => roleHierarchy[r]),
    );

    if (userLevel < minRequiredLevel) {
      throw new ForbiddenException(
        'No tienes permiso para realizar esta acción.',
      );
    }

    return true;
  }
}
