import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Rol } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: { rol: Rol }): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  it('should allow access when no @Roles() metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

    const context = createMockContext({ rol: 'cliente' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when @Roles() is empty array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

    const context = createMockContext({ rol: 'cliente' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow cliente when @Roles(cliente) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['cliente']);

    const context = createMockContext({ rol: 'cliente' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow medico when @Roles(medico) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['medico']);

    const context = createMockContext({ rol: 'medico' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow admin when @Roles(medico) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['medico']);

    const context = createMockContext({ rol: 'admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject cliente when @Roles(medico) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['medico']);

    const context = createMockContext({ rol: 'cliente' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject cliente when @Roles(admin) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ rol: 'cliente' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject medico when @Roles(admin) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ rol: 'medico' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow admin when @Roles(admin) is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);

    const context = createMockContext({ rol: 'admin' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject unauthenticated user when @Roles() is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['cliente']);

    const context = createMockContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
