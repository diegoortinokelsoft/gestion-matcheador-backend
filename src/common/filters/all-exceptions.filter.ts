import {
  Catch,
  type ArgumentsHost,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ApiErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

function statusToCode(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return 'BAD_REQUEST';
    case HttpStatus.UNAUTHORIZED:
      return 'UNAUTHORIZED';
    case HttpStatus.FORBIDDEN:
      return 'FORBIDDEN';
    case HttpStatus.NOT_FOUND:
      return 'NOT_FOUND';
    case HttpStatus.CONFLICT:
      return 'CONFLICT';
    case HttpStatus.TOO_MANY_REQUESTS:
      return 'RATE_LIMITED';
    case HttpStatus.BAD_GATEWAY:
      return 'BAD_GATEWAY';
    default:
      if (status >= 500) return 'INTERNAL_SERVER_ERROR';
      return `HTTP_${status}`;
  }
}

function extractMessage(response: unknown): string {
  if (typeof response === 'string') return response;

  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>;
    const message = obj.message;

    if (typeof message === 'string') return message;
    if (Array.isArray(message)) {
      return message.filter((m) => typeof m === 'string').join(', ') || 'Bad request';
    }
  }

  return 'Unexpected error';
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (obj.ok !== false) return false;

  const error = obj.error;
  if (!error || typeof error !== 'object') return false;
  const e = error as Record<string, unknown>;

  return typeof e.code === 'string' && typeof e.message === 'string';
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const path = request.originalUrl ?? request.url;
    const method = request.method;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      const httpResponse = exception.getResponse();
      if (isApiErrorResponse(httpResponse)) {
        const message =
          status === HttpStatus.INTERNAL_SERVER_ERROR
            ? 'Internal server error'
            : httpResponse.error.message;
        return response.status(status).json({
          ok: false,
          error: { code: httpResponse.error.code, message },
        });
      }

      const isServerError = status >= 500;
      const message = isServerError
        ? 'Internal server error'
        : extractMessage(httpResponse);

      const code = statusToCode(status);
      return response.status(status).json({
        ok: false,
        error: { code, message },
      });
    }

    // eslint-disable-next-line no-console
    console.error('Unhandled exception', { method, path, exception });

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({
        ok: false,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' },
      });
  }
}
