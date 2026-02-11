import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { handleError, CustomError } from '../utils/errors';
import logger from '../utils/logger';

export async function errorHandler(
  error: FastifyError | CustomError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Handle known custom errors
  if (error instanceof CustomError) {
    return handleError(error, reply);
  }

  // Handle validation errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      message: 'Validation error',
      error: 'VALIDATION_ERROR',
      details: error.validation,
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return reply.status(401).send({
      success: false,
      message: 'Invalid or expired token',
      error: 'AUTHENTICATION_ERROR',
    });
  }

  // Log unknown errors
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: request.url,
    method: request.method,
  });

  // Return generic error
  return reply.status(error.statusCode || 500).send({
    success: false,
    message: error.message || 'Internal server error',
    error: 'INTERNAL_ERROR',
  });
}
