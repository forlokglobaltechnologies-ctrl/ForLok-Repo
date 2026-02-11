import { FastifyReply } from 'fastify';
import { AppError } from '../types';
import logger from './logger';

export class CustomError extends Error implements AppError {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends CustomError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
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
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
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
