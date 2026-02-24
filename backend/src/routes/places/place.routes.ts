import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { savedPlaceService } from '../../services/savedPlace.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

const upsertPlaceSchema = z.object({
  label: z.enum(['home', 'work', 'custom']),
  customLabel: z.string().max(50).optional(),
  address: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export async function placeRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const places = await savedPlaceService.getUserPlaces(userId);
      const response: ApiResponse = {
        success: true,
        message: 'Saved places retrieved',
        data: places,
      };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/',
    { preHandler: [authenticate, validate(upsertPlaceSchema)] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const place = await savedPlaceService.upsertPlace(userId, request.body as any);
      const response: ApiResponse = {
        success: true,
        message: 'Place saved',
        data: place,
      };
      return reply.status(201).send(response);
    }
  );

  fastify.delete(
    '/:placeId',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { placeId } = request.params as { placeId: string };
      await savedPlaceService.deletePlace(userId, placeId);
      const response: ApiResponse = {
        success: true,
        message: 'Place deleted',
      };
      return reply.status(200).send(response);
    }
  );
}
