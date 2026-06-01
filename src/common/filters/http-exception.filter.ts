import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string;
  error: string;
  details?: Array<{ path: (string | number)[]; message: string }>;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string;
    let error: string;
    let details: ErrorResponseBody['details'] | undefined;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const resp = exceptionResponse as Record<string, unknown>;
      message =
        typeof resp.message === 'string'
          ? resp.message
          : Array.isArray(resp.message)
            ? resp.message.join(', ')
            : 'Error';
      error = typeof resp.error === 'string' ? resp.error : 'Error';
      details = Array.isArray(resp.details) ? resp.details : undefined;
    } else {
      message = String(exceptionResponse);
      error = 'Error';
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
    };

    if (details) {
      body.details = details;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} — ${status}: ${message}`,
        exception.stack,
      );
      body.message = 'Error interno del servidor. Inténtalo más tarde.';
    } else if (status === 401) {
      this.logger.warn(
        `${request.method} ${request.url} — ${status}: ${message}`,
      );
    } else {
      this.logger.verbose(
        `${request.method} ${request.url} — ${status}: ${message}`,
      );
    }

    response.status(status).json(body);
  }
}
