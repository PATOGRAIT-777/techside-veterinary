import {
  HttpException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };
  let mockRequest: { method: string; url: string };

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockRequest = { method: 'POST', url: '/auth/login' };
  });

  const createHost = () => ({
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  });

  it('should return standardized shape for BadRequestException with details', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      details: [{ path: ['email'], message: 'Invalid email' }],
    });

    filter.catch(
      exception,
      createHost() as Parameters<HttpExceptionFilter['catch']>[1],
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        details: [{ path: ['email'], message: 'Invalid email' }],
      }),
    );
  });

  it('should return shape without details for UnauthorizedException', () => {
    const exception = new UnauthorizedException('Credenciales inválidas');

    filter.catch(
      exception,
      createHost() as Parameters<HttpExceptionFilter['catch']>[1],
    );

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Credenciales inválidas',
        error: 'Unauthorized',
      }),
    );
    expect(
      (mockResponse.json.mock.calls[0] as unknown[])[0] as Record<
        string,
        unknown
      >,
    ).not.toHaveProperty('details');
  });

  it('should mask message for 500 errors', () => {
    const exception = new InternalServerErrorException('Database exploded');

    filter.catch(
      exception,
      createHost() as Parameters<HttpExceptionFilter['catch']>[1],
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Error interno del servidor. Inténtalo más tarde.',
        error: 'Internal Server Error',
      }),
    );
  });

  it('should handle plain string response', () => {
    const exception = new HttpException('Forbidden', 403);

    filter.catch(
      exception,
      createHost() as Parameters<HttpExceptionFilter['catch']>[1],
    );

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Forbidden',
        error: 'Error',
      }),
    );
  });
});
