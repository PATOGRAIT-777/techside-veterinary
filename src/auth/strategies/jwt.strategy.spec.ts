import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-secret-32-chars-long-for-jwt'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user data from payload', () => {
      const payload: JwtPayload = {
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        rol: 'cliente',
      };

      const result = strategy.validate(payload);

      expect(result).toEqual({
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
        rol: 'cliente',
      });
    });
  });
});
