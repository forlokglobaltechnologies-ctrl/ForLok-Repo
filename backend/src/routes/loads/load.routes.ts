import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { ApiResponse } from '../../types';
import { loadService } from '../../services/load.service';
import { bookingService } from '../../services/booking.service';

const locationSchema = z.object({
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  city: z.string().optional(),
  state: z.string().optional(),
});

const parcelSchema = z.object({
  category: z.enum(['documents', 'food', 'fragile', 'electronics', 'other']),
  description: z.string().optional(),
  weightKg: z.number().positive(),
  fragile: z.boolean().optional(),
  dimensionsCm: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().positive(),
    })
    .optional(),
  declaredValue: z.number().min(0).optional(),
});

const receiverSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(8),
  alternatePhone: z.string().min(8).optional(),
});

export async function loadRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/estimate',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            pickup: z.object({ lat: z.number(), lng: z.number() }),
            drop: z.object({ lat: z.number(), lng: z.number() }),
            weightKg: z.number().positive(),
            fragile: z.boolean().optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const data = request.body as any;
      const estimate = loadService.getEstimate(data);
      const response: ApiResponse = { success: true, message: 'Loads estimate generated', data: estimate };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/instant',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            pickup: locationSchema,
            drop: locationSchema,
            parcel: parcelSchema,
            receiver: receiverSchema,
            scheduleAt: z.string().datetime().optional(),
            notes: z.string().max(500).optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const senderId = (request as any).user.userId;
      const body = request.body as any;
      const offer = await loadService.createInstantRequest({
        senderId,
        ...body,
        scheduleAt: body.scheduleAt ? new Date(body.scheduleAt) : undefined,
      });
      const response: ApiResponse = { success: true, message: 'Instant load request created', data: offer };
      return reply.status(201).send(response);
    }
  );

  fastify.post(
    '/offers',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            pickup: locationSchema,
            drop: locationSchema,
            parcel: parcelSchema,
            receiver: receiverSchema,
            scheduleAt: z.string().datetime().optional(),
            expiresAt: z.string().datetime().optional(),
            notes: z.string().max(500).optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const senderId = (request as any).user.userId;
      const body = request.body as any;
      const offer = await loadService.createOffer({
        senderId,
        ...body,
        scheduleAt: body.scheduleAt ? new Date(body.scheduleAt) : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      });
      const response: ApiResponse = { success: true, message: 'Load offer created', data: offer };
      return reply.status(201).send(response);
    }
  );

  fastify.get('/offers/search', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as any;
    const result = await loadService.searchOpenOffers({
      lat: query.lat ? parseFloat(query.lat) : undefined,
      lng: query.lng ? parseFloat(query.lng) : undefined,
      maxDistanceKm: query.maxDistanceKm ? parseFloat(query.maxDistanceKm) : undefined,
      category: query.category,
      page: query.page ? parseInt(query.page, 10) : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    const response: ApiResponse = { success: true, message: 'Load offers retrieved', data: result };
    return reply.status(200).send(response);
  });

  fastify.get('/offers/my', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const senderId = (request as any).user.userId;
    const result = await loadService.getMyRequests(senderId);
    const response: ApiResponse = { success: true, message: 'My loads retrieved', data: result };
    return reply.status(200).send(response);
  });

  fastify.get('/offers/:loadOfferId', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { loadOfferId } = request.params as { loadOfferId: string };
    const result = await loadService.getById(loadOfferId);
    const response: ApiResponse = { success: true, message: 'Load offer retrieved', data: result };
    return reply.status(200).send(response);
  });

  fastify.post(
    '/offers/:loadOfferId/accept',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { loadOfferId } = request.params as { loadOfferId: string };
      const driverId = (request as any).user.userId;
      const result = await loadService.acceptRequest(loadOfferId, driverId);
      const response: ApiResponse = { success: true, message: 'Load accepted', data: result };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/bookings',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            loadOfferId: z.string(),
            paymentMethod: z.enum(['upi', 'card', 'wallet', 'net_banking', 'offline_cash']).optional(),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const body = request.body as { loadOfferId: string; paymentMethod?: any };
      const booking = await bookingService.createLoadBooking({
        userId,
        loadOfferId: body.loadOfferId,
        paymentMethod: body.paymentMethod,
      });
      const response: ApiResponse = { success: true, message: 'Loads booking created', data: booking };
      return reply.status(201).send(response);
    }
  );

  fastify.post(
    '/bookings/:bookingId/pickup/reached',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const driverId = (request as any).user.userId;
      const result = await bookingService.markLoadPickupReached(bookingId, driverId);
      const response: ApiResponse = { success: true, message: 'Pickup reached', data: result };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/bookings/:bookingId/pickup/verify-otp',
    {
      preHandler: [authenticate, validate(z.object({ otp: z.string().length(4) }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const driverId = (request as any).user.userId;
      const { otp } = request.body as { otp: string };
      const result = await bookingService.verifyLoadPickupOtp(bookingId, driverId, otp);
      const response: ApiResponse = { success: true, message: 'Pickup OTP verified', data: result };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/bookings/:bookingId/drop/reached',
    { preHandler: [authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const driverId = (request as any).user.userId;
      const result = await bookingService.markLoadDropReached(bookingId, driverId);
      const response: ApiResponse = { success: true, message: 'Drop reached', data: result };
      return reply.status(200).send(response);
    }
  );

  // Reuses pooling parity flow (got-out -> choose-payment -> end-trip with OTP)
  fastify.post(
    '/bookings/:bookingId/drop/choose-payment',
    { preHandler: [authenticate, validate(z.object({ paymentMethod: z.enum(['offline_cash']) }))] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const userId = (request as any).user.userId;
      const { paymentMethod } = request.body as { paymentMethod: 'offline_cash' };
      const result = await bookingService.choosePaymentMethod(bookingId, userId, paymentMethod);
      const response: ApiResponse = { success: true, message: result.message, data: result };
      return reply.status(200).send(response);
    }
  );

  fastify.post(
    '/bookings/:bookingId/drop/verify-otp',
    { preHandler: [authenticate, validate(z.object({ otp: z.string().length(4) }))] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { bookingId } = request.params as { bookingId: string };
      const driverId = (request as any).user.userId;
      const { otp } = request.body as { otp: string };
      const result = await bookingService.endPassengerTrip(bookingId, driverId, otp, 'offline_cash');
      const response: ApiResponse = { success: true, message: result.message, data: result };
      return reply.status(200).send(response);
    }
  );

  fastify.get('/bookings/:bookingId/cancel-preview', { preHandler: [authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = (request as any).user.userId;
    const { bookingId } = request.params as { bookingId: string };
    const preview = await bookingService.previewCancellationFee(bookingId, userId);
    const response: ApiResponse = { success: true, message: 'Cancellation preview fetched', data: preview };
    return reply.status(200).send(response);
  });

  fastify.put(
    '/bookings/:bookingId/cancel',
    { preHandler: [authenticate, validate(z.object({ reason: z.string().optional() }))] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { reason } = request.body as { reason?: string };
      const booking = await bookingService.cancelBooking(bookingId, userId, reason);
      const response: ApiResponse = { success: true, message: 'Loads booking cancelled', data: booking };
      return reply.status(200).send(response);
    }
  );
}

