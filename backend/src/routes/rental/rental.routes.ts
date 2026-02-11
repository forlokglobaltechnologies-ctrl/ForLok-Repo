import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { rentalService } from '../../services/rental.service';
import { rentalPricingService } from '../../services/rental-pricing.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';
import Vehicle from '../../models/Vehicle';
import RentalOffer from '../../models/RentalOffer';
import logger from '../../utils/logger';

// Request schemas
const createOfferSchema = z.object({
  ownerType: z.enum(['individual', 'company']),
  vehicleId: z.string(),
  location: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }),
  date: z.string().datetime(),
  availableFrom: z.string(),
  availableUntil: z.string(),
  pricePerHour: z.number().min(0),
  minimumHours: z.number().min(1),
  notes: z.string().optional(),
});

const updateOfferSchema = z.object({
  location: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }).optional(),
  date: z.string().datetime().optional(),
  availableFrom: z.string().optional(),
  availableUntil: z.string().optional(),
  pricePerHour: z.number().min(0).optional(),
  minimumHours: z.number().min(1).optional(),
  notes: z.string().optional(),
  status: z.enum(['active', 'pending', 'expired', 'completed', 'cancelled', 'suspended']).optional(),
});

const checkAvailabilitySchema = z.object({
  date: z.string().datetime(),
  fromTime: z.string(),
  toTime: z.string(),
});

export async function rentalRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/rental/offers
   * Create rental offer (authenticated)
   */
  fastify.post(
    '/offers',
    {
      preHandler: [authenticate, validate(createOfferSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const userType = (request as any).user.userType;
      const data = request.body as any;

      // Determine owner type - prioritize JWT userType over request body
      // This ensures company users are always treated as company, even if frontend sends wrong value
      const ownerType = userType === 'company' ? 'company' : (data.ownerType || 'individual');
      
      logger.info(`📋 Creating rental offer: userType=${userType}, ownerType=${ownerType}, userId=${userId}, data.ownerType=${data.ownerType}`);

      // For company users, get the actual companyId
      let ownerId = userId;
      if (ownerType === 'company') {
        const Company = (await import('../../models/Company')).default;
        const company = await Company.findOne({ userId });
        if (!company) {
          logger.error(`❌ Company not found for userId: ${userId}`);
          return reply.status(404).send({
            success: false,
            message: 'Company profile not found',
          });
        }
        ownerId = company.companyId;
        logger.info(`✅ Found company: companyId=${ownerId}, userId=${userId}`);
      }

      // Convert date string to Date
      if (data.date) {
        data.date = new Date(data.date);
      }

      // Prepare offer data - ensure ownerType and ownerId are not overwritten by spread
      const offerData = {
        ...data,
        ownerId, // Override with correct ownerId (companyId for companies, userId for individuals)
        ownerType, // Override with correct ownerType from JWT token
      };
      
      logger.info(`📤 Calling rentalService.createOffer with: ownerId=${offerData.ownerId}, ownerType=${offerData.ownerType}`);
      
      const offer = await rentalService.createOffer(offerData);

      const response: ApiResponse = {
        success: true,
        message: 'Rental offer created successfully',
        data: offer,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * POST /api/rental/offers/calculate-price
   * Calculate suggested rental price based on vehicle details and factors
   */
  const calculatePriceSchema = z.object({
    vehicleId: z.string().optional(),
    vehicleType: z.enum(['car', 'bike']).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().optional(),
    seats: z.number().optional(),
    fuelType: z.enum(['Petrol', 'Diesel', 'Electric', 'CNG']).optional(),
    transmission: z.enum(['Manual', 'Automatic']).optional(),
    location: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
    }).optional(),
    date: z.string().datetime().optional(),
    availableFrom: z.string().optional(),
    availableUntil: z.string().optional(),
  });

  fastify.post(
    '/offers/calculate-price',
    {
      preHandler: [authenticate, validate(calculatePriceSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = request.body as any;
        const userId = (request as any).user.userId;

        let vehicleData: any = {};

        // If vehicleId is provided, fetch vehicle details
        if (data.vehicleId) {
          const vehicle = await Vehicle.findOne({ vehicleId: data.vehicleId });
          if (!vehicle) {
            return reply.status(404).send({
              success: false,
              message: 'Vehicle not found',
            });
          }

          // Verify vehicle belongs to user
          const userType = (request as any).user.userType;
          let isAuthorized = false;

          if (userType === 'company') {
            // For company users, check if vehicle belongs to their company
            const Company = (await import('../../models/Company')).default;
            const company = await Company.findOne({ userId });
            if (company && vehicle.companyId === company.companyId) {
              isAuthorized = true;
            }
          } else {
            // For individual users, check if vehicle belongs to them
            if (vehicle.userId === userId) {
              isAuthorized = true;
            }
          }

          if (!isAuthorized) {
            return reply.status(403).send({
              success: false,
              message: 'You are not authorized to access this vehicle',
            });
          }

          vehicleData = {
            vehicleType: vehicle.type,
            brand: vehicle.brand,
            model: vehicle.vehicleModel,
            year: vehicle.year,
            seats: vehicle.seats,
            fuelType: vehicle.fuelType,
            transmission: vehicle.transmission,
          };
        } else {
          // Use provided data directly
          vehicleData = {
            vehicleType: data.vehicleType,
            brand: data.brand,
            model: data.model,
            year: data.year,
            seats: data.seats,
            fuelType: data.fuelType,
            transmission: data.transmission,
          };
        }

        // Validate required fields
        if (!vehicleData.vehicleType || !vehicleData.brand || !vehicleData.seats || !vehicleData.fuelType || !vehicleData.transmission) {
          return reply.status(400).send({
            success: false,
            message: 'Missing required vehicle information',
          });
        }

        // Count available rentals for supply/demand calculation
        let availableRentalsCount = 0;
        if (data.location && data.date && data.availableFrom) {
          try {
            const offerDate = new Date(data.date);
            const startOfDay = new Date(offerDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(offerDate);
            endOfDay.setHours(23, 59, 59, 999);

            // Find rentals in same location and date
            const similarOffers = await RentalOffer.find({
              status: { $in: ['active', 'pending'] },
              date: {
                $gte: startOfDay,
                $lte: endOfDay,
              },
              'location.city': data.location.city,
              'location.state': data.location.state,
            });

            // Filter by time overlap if availableFrom is provided
            if (data.availableFrom && data.availableUntil) {
              // Count offers that overlap with the requested time slot
              availableRentalsCount = similarOffers.filter((offer) => {
                // Simple time overlap check (can be enhanced)
                return offer.availableFrom && offer.availableUntil;
              }).length;
            } else {
              availableRentalsCount = similarOffers.length;
            }
          } catch (error) {
            // If counting fails, continue with default (0 = high demand)
            console.error('Error counting available rentals:', error);
          }
        }

        // Calculate price
        const priceCalculation = rentalPricingService.calculateRentalPrice({
          vehicleType: vehicleData.vehicleType,
          brand: vehicleData.brand,
          model: vehicleData.model,
          year: vehicleData.year,
          seats: vehicleData.seats,
          fuelType: vehicleData.fuelType,
          transmission: vehicleData.transmission,
          location: data.location,
          date: data.date ? new Date(data.date) : undefined,
          availableFrom: data.availableFrom,
          availableUntil: data.availableUntil,
          availableRentalsCount,
        });

        const response: ApiResponse = {
          success: true,
          message: 'Price calculated successfully',
          data: priceCalculation,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        return reply.status(500).send({
          success: false,
          message: error.message || 'Failed to calculate price',
        });
      }
    }
  );

  /**
   * GET /api/rental/offers
   * Get user's rental offers (authenticated)
   */
  fastify.get(
    '/offers',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const userType = (request as any).user.userType;
      const ownerType = userType === 'company' ? 'company' : 'individual';

      const offers = await rentalService.getUserOffers(userId, ownerType);

      const response: ApiResponse = {
        success: true,
        message: 'Offers retrieved successfully',
        data: offers,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/rental/offers/:offerId
   * Get offer details
   */
  fastify.get(
    '/offers/:offerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };

      const offer = await rentalService.getOfferById(offerId);

      const response: ApiResponse = {
        success: true,
        message: 'Offer retrieved successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/rental/offers/search
   * Search rental offers
   */
  fastify.get(
    '/offers/search',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const query = request.query as any;

      const filters: any = {};
      if (query.lat) filters.lat = parseFloat(query.lat);
      if (query.lng) filters.lng = parseFloat(query.lng);
      if (query.date) filters.date = new Date(query.date);
      if (query.vehicleType) filters.vehicleType = query.vehicleType;
      if (query.minPrice) filters.minPrice = parseFloat(query.minPrice);
      if (query.maxPrice) filters.maxPrice = parseFloat(query.maxPrice);
      if (query.maxDistance) filters.maxDistance = parseFloat(query.maxDistance);
      if (query.page) filters.page = parseInt(query.page);
      if (query.limit) filters.limit = parseInt(query.limit);

      const result = await rentalService.searchOffers(filters);

      const response: ApiResponse = {
        success: true,
        message: 'Offers retrieved successfully',
        data: result,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/rental/offers/nearby
   * Get nearby rental offers
   */
  fastify.get(
    '/offers/nearby',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, radius } = request.query as {
        lat: string;
        lng: string;
        radius?: string;
      };

      if (!lat || !lng) {
        return reply.status(400).send({
          success: false,
          message: 'Latitude and longitude are required',
          error: 'MISSING_COORDINATES',
        });
      }

      const offers = await rentalService.getNearbyOffers(
        parseFloat(lat),
        parseFloat(lng),
        radius ? parseFloat(radius) : 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Nearby offers retrieved successfully',
        data: offers,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/rental/offers/:offerId/availability
   * Check offer availability
   */
  fastify.get(
    '/offers/:offerId/availability',
    {
      preHandler: [validate(checkAvailabilitySchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };
      const { date, fromTime, toTime } = request.query as {
        date: string;
        fromTime: string;
        toTime: string;
      };

      const available = await rentalService.checkAvailability(
        offerId,
        new Date(date),
        fromTime,
        toTime
      );

      const response: ApiResponse = {
        success: true,
        message: 'Availability checked successfully',
        data: { available },
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * PUT /api/rental/offers/:offerId
   * Update rental offer (authenticated)
   */
  fastify.put(
    '/offers/:offerId',
    {
      preHandler: [authenticate, validate(updateOfferSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ownerId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };
      const data = request.body as any;

      // Convert date string to Date if provided
      if (data.date) {
        data.date = new Date(data.date);
      }

      const offer = await rentalService.updateOffer(offerId, ownerId, data);

      const response: ApiResponse = {
        success: true,
        message: 'Offer updated successfully',
        data: offer,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * DELETE /api/rental/offers/:offerId
   * Cancel rental offer (authenticated)
   */
  fastify.delete(
    '/offers/:offerId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const ownerId = (request as any).user.userId;
      const { offerId } = request.params as { offerId: string };

      await rentalService.cancelOffer(offerId, ownerId);

      const response: ApiResponse = {
        success: true,
        message: 'Offer cancelled successfully',
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/rental/offers/:offerId/available-slots
   * Get available time slots for a rental offer
   */
  fastify.get(
    '/offers/:offerId/available-slots',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };
      const { date } = request.query as { date?: string };

      if (!date) {
        const response: ApiResponse = {
          success: false,
          message: 'Date parameter is required',
        };
        return reply.status(400).send(response);
      }

      try {
        const dateObj = new Date(date);
        const slots = await rentalService.getAvailableTimeSlots(offerId, dateObj);

        const response: ApiResponse = {
          success: true,
          message: 'Available time slots retrieved successfully',
          data: slots,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: error.message || 'Failed to get available time slots',
        };
        return reply.status(400).send(response);
      }
    }
  );

  /**
   * GET /api/rental/offers/company/:companyId
   * Get all rental offers for a company (authenticated)
   */
  fastify.get(
    '/offers/company/:companyId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { companyId } = request.params as { companyId: string };
      const userId = (request as any).user.userId;
      const { status, date, page, limit } = request.query as any;

      // Verify user owns the company
      const Company = (await import('../../models/Company')).default;
      const company = await Company.findOne({ companyId });
      if (!company || company.userId !== userId) {
        return reply.status(403).send({
          success: false,
          message: 'You do not have permission to access this company',
        });
      }

      try {
        const filters: any = {};
        if (status) filters.status = status;
        if (date) filters.date = new Date(date);
        if (page) filters.page = parseInt(page);
        if (limit) filters.limit = parseInt(limit);

        const result = await rentalService.getCompanyOffers(companyId, filters);

        const response: ApiResponse = {
          success: true,
          message: 'Company offers retrieved successfully',
          data: result,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: error.message || 'Failed to get company offers',
        };
        return reply.status(400).send(response);
      }
    }
  );

  /**
   * GET /api/rental/offers/:offerId/bookings
   * Get all bookings for a rental offer (authenticated)
   */
  fastify.get(
    '/offers/:offerId/bookings',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { offerId } = request.params as { offerId: string };
      const ownerId = (request as any).user.userId;

      try {
        const bookings = await rentalService.getOfferBookings(offerId, ownerId);

        const response: ApiResponse = {
          success: true,
          message: 'Offer bookings retrieved successfully',
          data: bookings,
        };

        return reply.status(200).send(response);
      } catch (error: any) {
        const response: ApiResponse = {
          success: false,
          message: error.message || 'Failed to get offer bookings',
        };
        return reply.status(400).send(response);
      }
    }
  );
}
