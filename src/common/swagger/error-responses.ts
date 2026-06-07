import { ApiResponse } from '@nestjs/swagger';

export const ApiBadRequestResponse = () =>
  ApiResponse({
    status: 400,
    description:
      'Bad Request — Validation failed, malformed input, or invalid foreign key reference.',
  });

export const ApiUnauthorizedResponse = () =>
  ApiResponse({
    status: 401,
    description: 'Unauthorized — JWT token is missing, expired, or invalid.',
  });

export const ApiForbiddenResponse = () =>
  ApiResponse({
    status: 403,
    description:
      'Forbidden — Authenticated user lacks required role privileges.',
  });

export const ApiNotFoundResponse = () =>
  ApiResponse({
    status: 404,
    description: 'Not Found — The requested resource does not exist.',
  });

export const ApiTooManyRequestsResponse = () =>
  ApiResponse({
    status: 429,
    description: 'Too Many Requests — Rate limit exceeded.',
  });
