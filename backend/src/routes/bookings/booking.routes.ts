import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { bookingService } from '../../services/booking.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse, PaymentMethod, Route } from '../../types';

// Request schemas
const createPoolingBookingSchema = z.object({
  poolingOfferId: z.string(),
  paymentMethod: z.enum(['upi', 'card', 'wallet', 'net_banking', 'offline_cash']).optional(), // Payment method selected at trip end
  passengerRoute: z.object({
    from: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
    to: z.object({
      address: z.string(),
      lat: z.number(),
      lng: z.number(),
      city: z.string().optional(),
      state: z.string().optional(),
    }),
  }),
  calculatedPrice: z.object({
    finalPrice: z.number(),
    platformFee: z.number(),
    totalAmount: z.number(),
  }).optional(),
});

const createRentalBookingSchema = z.object({
  rentalOfferId: z.string(),
  duration: z.number().min(1).optional(),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm format
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm format
  paymentMethod: z.enum(['upi', 'card', 'wallet', 'net_banking', 'offline_cash']).optional(), // Payment method selected at trip end
}).refine(
  (data) => data.duration || (data.startTime && data.endTime),
  {
    message: 'Either duration or both startTime and endTime must be provided',
  }
);

const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});

export async function bookingRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/bookings/pooling
   * Create pooling booking (authenticated)
   */
  fastify.post(
    '/pooling',
    {
      preHandler: [authenticate, validate(createPoolingBookingSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as {
        poolingOfferId: string;
        paymentMethod: PaymentMethod;
        passengerRoute: Route;
        calculatedPrice?: {
          finalPrice: number;
          platformFee: number;
          totalAmount: number;
        };
      };

      const booking = await bookingService.createPoolingBooking({
        userId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Booking created successfully',
        data: booking,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * POST /api/bookings/rental
   * Create rental booking (authenticated)
   */
  fastify.post(
    '/rental',
    {
      preHandler: [authenticate, validate(createRentalBookingSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as {
        rentalOfferId: string;
        duration?: number;
        startTime?: string;
        endTime?: string;
        paymentMethod: PaymentMethod;
      };

      const booking = await bookingService.createRentalBooking({
        userId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Booking created successfully',
        data: booking,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/bookings
   * Get user bookings (authenticated)
   */
  fastify.get(
    '/',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const query = request.query as {
        status?: string;
        serviceType?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.serviceType) filters.serviceType = query.serviceType;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await bookingService.getUserBookings(userId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Bookings retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/:bookingId
   * Get booking details (authenticated)
   */
  fastify.get(
    '/:bookingId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const booking = await bookingService.getBookingById(bookingId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Booking retrieved successfully',
        data: booking,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/bookings/:bookingId/status
   * Update booking status (authenticated - driver/owner only)
   */
  fastify.put(
    '/:bookingId/status',
    {
      preHandler: [authenticate, validate(z.object({
        status: z.enum(['in_progress', 'completed']),
      }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { status } = request.body as { status: 'in_progress' | 'completed' };

      const booking = await bookingService.updateBookingStatus(bookingId, status, userId);

      const response: ApiResponse = {
        success: true,
        message: `Booking status updated to ${status}`,
        data: booking,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/driver
   * Get bookings where user is driver/owner (authenticated)
   */
  fastify.get(
    '/driver',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const driverId = (request as any).user.userId;
      const query = request.query as {
        status?: string;
        serviceType?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {};
      if (query.status) filters.status = query.status;
      if (query.serviceType) filters.serviceType = query.serviceType;
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await bookingService.getDriverBookings(driverId, filters);

      const response: ApiResponse = {
        success: true,
        message: 'Driver bookings retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/by-offer/:offerId/all
   * Get all bookings for an offer (for owners to manage multiple bookings)
   * IMPORTANT: This route must be registered BEFORE /by-offer/:offerId to avoid route conflicts
   */
  fastify.get(
    '/by-offer/:offerId/all',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ownerId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };
      const query = request.query as { serviceType?: string };

      const serviceType = (query.serviceType as 'pooling' | 'rental') || 'rental';

      try {
        const bookings = await bookingService.getBookingsByOfferId(offerId, serviceType, ownerId);

        const response: ApiResponse = {
          success: true,
          message: 'Bookings retrieved successfully',
          data: bookings,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: error.message || 'Failed to get bookings',
          error: error.message,
        };
        return reply.status(error.statusCode || 400).send(response);
      }
    }
  );

  /**
   * GET /api/bookings/:bookingId/cancel-preview
   * Preview cancellation fee before cancelling (authenticated)
   */
  fastify.get(
    '/:bookingId/cancel-preview',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const preview = await bookingService.previewCancellationFee(bookingId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Cancellation fee preview',
        data: preview,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/bookings/:bookingId/cancel
   * Cancel booking (authenticated)
   */
  fastify.put(
    '/:bookingId/cancel',
    {
      preHandler: [authenticate, validate(cancelBookingSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { reason } = request.body as { reason?: string };

      const booking = await bookingService.cancelBooking(bookingId, userId, reason);

      const response: ApiResponse = {
        success: true,
        message: 'Booking cancelled successfully',
        data: booking,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/history
   * Get booking history (authenticated)
   */
  fastify.get(
    '/history',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const history = await bookingService.getBookingHistory(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Booking history retrieved successfully',
        data: history,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/upcoming
   * Get upcoming bookings (authenticated)
   */
  fastify.get(
    '/upcoming',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const result = await bookingService.getUserBookings(userId, {
        status: 'pending' as any,
        page: 1,
        limit: 20,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Upcoming bookings retrieved successfully',
        data: result.bookings,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/past
   * Get past bookings (authenticated)
   */
  fastify.get(
    '/past',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const result = await bookingService.getUserBookings(userId, {
        status: 'completed' as any,
        page: 1,
        limit: 20,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Past bookings retrieved successfully',
        data: result.bookings,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/cancelled
   * Get cancelled bookings (authenticated)
   */
  fastify.get(
    '/cancelled',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const result = await bookingService.getUserBookings(userId, {
        status: 'cancelled' as any,
        page: 1,
        limit: 20,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Cancelled bookings retrieved successfully',
        data: result.bookings,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/bookings/trip/:offerId/passengers
   * Get all passengers for a driver's active trip (authenticated - driver only)
   */
  fastify.get(
    '/trip/:offerId/passengers',
    {
      preHandler: [authenticate, validate(z.object({
        serviceType: z.enum(['pooling', 'rental']),
      }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };
      const { serviceType } = request.query as { serviceType: 'pooling' | 'rental' };

      const passengers = await bookingService.getTripPassengers(offerId, userId, serviceType);

      const response: ApiResponse = {
        success: true,
        message: 'Passengers retrieved successfully',
        data: passengers,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/end-trip
   * End trip for a specific passenger with code verification (authenticated - driver only)
   * Body: { passengerCode: string, paymentMethod?: 'offline_cash' | 'upi' | 'card' | 'net_banking' }
   * If paymentMethod is 'offline_cash', cash payment is recorded immediately.
   * Otherwise, a Razorpay order is created for online payment.
   */
  fastify.post(
    '/:bookingId/end-trip',
    {
      preHandler: [authenticate, validate(z.object({
        passengerCode: z.string().length(4),
        paymentMethod: z.enum(['upi', 'card', 'wallet', 'net_banking', 'offline_cash']).optional(),
      }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { passengerCode, paymentMethod } = request.body as { passengerCode: string; paymentMethod?: string };

      const result = await bookingService.endPassengerTrip(bookingId, userId, passengerCode, paymentMethod);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/settlement/approve
   * Approve settlement (authenticated - admin only)
   */
  fastify.post(
    '/:bookingId/settlement/approve',
    {
      preHandler: [authenticate], // TODO: Add admin check middleware
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const result = await bookingService.approveSettlement(bookingId, adminId);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/settlement/reject
   * Reject settlement (authenticated - admin only)
   */
  fastify.post(
    '/:bookingId/settlement/reject',
    {
      preHandler: [authenticate, validate(z.object({
        reason: z.string().min(1),
      }))], // TODO: Add admin check middleware
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const adminId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { reason } = request.body as { reason: string };

      const result = await bookingService.rejectSettlement(bookingId, adminId, reason);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/passenger/got-in
   * Mark passenger as got in (authenticated - driver only)
   */
  fastify.post(
    '/:bookingId/passenger/got-in',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const result = await bookingService.markPassengerGotIn(bookingId, userId);

      const response: ApiResponse = {
        success: true,
        message: 'Passenger marked as got in',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/passenger/got-out
   * Mark passenger as got out and generate code (authenticated - driver only)
   */
  fastify.post(
    '/:bookingId/passenger/got-out',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const result = await bookingService.markPassengerGotOut(bookingId, userId);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/choose-payment
   * Passenger chooses payment method after trip ends (authenticated - passenger only)
   * Body: { paymentMethod: 'online' | 'offline_cash' }
   * Online → Razorpay order created, passenger pays
   * Cash → 4-digit code generated, passenger shows to driver
   */
  fastify.post(
    '/:bookingId/choose-payment',
    {
      preHandler: [authenticate, validate(z.object({
        paymentMethod: z.enum(['online', 'offline_cash']),
      }))],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };
      const { paymentMethod } = request.body as { paymentMethod: 'online' | 'offline_cash' };

      const result = await bookingService.choosePaymentMethod(bookingId, userId, paymentMethod);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/start-trip
   * Start trip with time validation (authenticated - driver only)
   */
  fastify.post(
    '/start-trip',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            offerId: z.string(),
            serviceType: z.enum(['pooling', 'rental']),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { offerId, serviceType } = request.body as {
        offerId: string;
        serviceType: 'pooling' | 'rental';
      };

      const result = await bookingService.startTrip(offerId, userId, serviceType);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/end-trip
   * End entire trip for an offer (mark all bookings as completed) (authenticated - driver only)
   */
  fastify.post(
    '/end-trip',
    {
      preHandler: [
        authenticate,
        validate(
          z.object({
            offerId: z.string(),
            serviceType: z.enum(['pooling', 'rental']),
          })
        ),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { offerId, serviceType } = request.body as {
        offerId: string;
        serviceType: 'pooling' | 'rental';
      };

      const result = await bookingService.endTrip(offerId, userId, serviceType);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/bookings/:bookingId/withdraw
   * Request withdrawal (authenticated - driver only)
   */
  fastify.post(
    '/:bookingId/withdraw',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const { bookingId } = request.params as { bookingId: string };

      const result = await bookingService.requestWithdrawal(bookingId, userId);

      const response: ApiResponse = {
        success: true,
        message: result.message,
        data: result,
      };

      return reply.status(200).send(response);
    }
  );
}
