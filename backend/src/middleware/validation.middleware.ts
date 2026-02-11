import { FastifyRequest, FastifyReply } from 'fastify';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '../utils/errors';

export function validate(schema: ZodSchema) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    try {
      // Validate body, query, and params
      const data = {
        ...(request.body as Record<string, any> || {}),
        ...(request.query as Record<string, any> || {}),
        ...(request.params as Record<string, any> || {}),
      };

      const validated = schema.parse(data);
      
      // Replace request data with validated data
      request.body = validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        throw new ValidationError(
          `Validation failed: ${errors.map((e) => e.message).join(', ')}`
        );
      }
      throw error;
    }
  };
}
