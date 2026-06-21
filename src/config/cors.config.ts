import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const LOCALHOST_ORIGIN_REGEX = /^http:\/\/localhost(:\d+)?$/;

export const CORS_METHODS: CorsOptions['methods'] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'OPTIONS',
];

export const CORS_ALLOWED_HEADERS: CorsOptions['allowedHeaders'] = [
  'Content-Type',
  'Authorization',
];

export function resolveCorsOrigin(
  frontendUrl: string | undefined,
  nodeEnv: string,
): string | RegExp | undefined {
  if (frontendUrl) return frontendUrl;
  if (nodeEnv !== 'production') return LOCALHOST_ORIGIN_REGEX;
  return undefined;
}
