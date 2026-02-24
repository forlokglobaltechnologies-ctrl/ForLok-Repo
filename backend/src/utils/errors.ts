import { FastifyReply } from 'fastify';
import { AppError } from '../types';
import logger from './logger';

export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

export class CustomError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;
  fieldErrors?: FieldError[];
  details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    options?: { fieldErrors?: FieldError[]; details?: unknown }
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;
    this.fieldErrors = options?.fieldErrors;
    this.details = options?.details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, fieldErrors?: FieldError[], details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', { fieldErrors, details });
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Unauthorized access') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource already exists', fieldErrors?: FieldError[]) {
    super(message, 409, 'CONFLICT', { fieldErrors });
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

export function handleError(error: Error | CustomError, reply: FastifyReply) {
  if (error instanceof CustomError) {
    logger.warn(`Error: ${error.message}`, { code: error.code, statusCode: error.statusCode });
    return reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      error: error.code,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      ...(error.details ? { details: error.details } : {}),
    });
  }

  // Unknown error
  logger.error('Unhandled error:', error);
  return reply.status(500).send({
    success: false,
    message: 'Internal server error',
    error: 'INTERNAL_ERROR',
  });
}
