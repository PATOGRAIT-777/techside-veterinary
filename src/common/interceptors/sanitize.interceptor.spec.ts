import { ExecutionContext, CallHandler } from '@nestjs/common';
import { SanitizeInterceptor } from './sanitize.interceptor';
import { of } from 'rxjs';

describe('SanitizeInterceptor', () => {
  let interceptor: SanitizeInterceptor;

  beforeEach(() => {
    interceptor = new SanitizeInterceptor();
  });

  function createContext(body: unknown): {
    ctx: ExecutionContext;
    req: { body: unknown };
  } {
    const req = { body };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;
    return { ctx, req };
  }

  function createHandler(): CallHandler {
    return { handle: () => of('next') };
  }

  it('should strip <script> tags from strings', () => {
    const reqBody = { name: '<script>alert(1)</script>Hello' };
    const { ctx, req } = createContext(reqBody);
    interceptor.intercept(ctx, createHandler());
    expect(req.body).toEqual({ name: 'Hello' });
  });

  it('should strip HTML tags from strings', () => {
    const reqBody = { title: '<b>Bold</b> text' };
    const { ctx, req } = createContext(reqBody);
    interceptor.intercept(ctx, createHandler());
    expect(req.body).toEqual({ title: 'Bold text' });
  });

  it('should leave non-string values untouched', () => {
    const reqBody = { count: 42, active: true };
    const { ctx, req } = createContext(reqBody);
    interceptor.intercept(ctx, createHandler());
    expect(req.body).toEqual({ count: 42, active: true });
  });

  it('should sanitize nested objects recursively', () => {
    const reqBody = {
      user: {
        name: '<script>evil</script>John',
        address: { street: '<br>Main St</br>' },
      },
      tags: ['<b>tag1</b>', 'clean'],
    };
    const { ctx, req } = createContext(reqBody);
    interceptor.intercept(ctx, createHandler());
    expect(req.body).toEqual({
      user: {
        name: 'John',
        address: { street: 'Main St' },
      },
      tags: ['tag1', 'clean'],
    });
  });
});
