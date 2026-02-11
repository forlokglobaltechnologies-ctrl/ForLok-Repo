import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { foodService } from '../../services/food.service';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { ApiResponse } from '../../types';

// Request schemas
const getFoodByCategorySchema = z.object({
  category: z.enum(['tiffin', 'lunch', 'dinner', 'breakfast', 'snacks']),
  lat: z.coerce.number().min(-90).max(90), // coerce converts string to number
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).optional().default(10),
});

const getFoodNearLocationSchema = z.object({
  lat: z.coerce.number().min(-90).max(90), // coerce converts string to number
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(50).optional().default(10),
});

const getFoodAlongRouteSchema = z.object({
  fromLat: z.coerce.number().min(-90).max(90), // coerce converts string to number
  fromLng: z.coerce.number().min(-180).max(180),
  toLat: z.coerce.number().min(-90).max(90),
  toLng: z.coerce.number().min(-180).max(180),
  category: z.enum(['tiffin', 'lunch', 'dinner', 'breakfast', 'snacks']).optional(),
}).passthrough(); // passthrough allows extra fields to be ignored

const createOrderSchema = z.object({
  foodId: z.string(),
  quantity: z.number().min(1).max(10),
  deliveryLocation: z.object({
    address: z.string(),
    lat: z.number(),
    lng: z.number(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }),
  paymentMethod: z.enum(['upi', 'card', 'wallet', 'net_banking', 'cash']),
});

export async function foodRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/food/sample-data
   * Initialize sample food data (development only)
   * Query param: ?force=true to delete and re-insert all data
   */
  fastify.get(
    '/sample-data',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { force } = request.query as { force?: string };
      const shouldForce = force === 'true';
      
      await foodService.initializeSampleData(shouldForce);
      
      const count = await foodService.getFoodCount();

      const response: ApiResponse = {
        success: true,
        message: shouldForce 
          ? 'Sample food data re-initialized' 
          : 'Sample food data initialized',
        data: { count },
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/food/category/:category
   * Get food items by category near user location
   */
  fastify.get(
    '/category/:category',
    {
      preHandler: [validate(getFoodByCategorySchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { category } = request.params as { category: string };
      const { lat, lng, radius } = request.query as {
        lat: number;
        lng: number;
        radius?: number;
      };

      const foods = await foodService.getFoodByCategoryAndLocation(
        category as any,
        { address: '', lat, lng } as any, // address not needed for distance calculation
        radius || 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Food items retrieved successfully',
        data: foods,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/food/nearby
   * Get all food items near user location
   */
  fastify.get(
    '/nearby',
    {
      preHandler: [validate(getFoodNearLocationSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng, radius } = request.query as {
        lat: number;
        lng: number;
        radius?: number;
      };

      const foods = await foodService.getFoodNearLocation(
        { address: '', lat, lng } as any, // address not needed for distance calculation
        radius || 10
      );

      const response: ApiResponse = {
        success: true,
        message: 'Food items retrieved successfully',
        data: foods,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/food/along-route
   * Get food shops along a route (from-to locations)
   */
  fastify.get(
    '/along-route',
    {
      preHandler: [validate(getFoodAlongRouteSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Get validated query parameters (validation middleware handles coercion)
      const query = request.query as any;
      
      // Parse coordinates (validation ensures they're valid numbers)
      const fromLat = Number(query.fromLat);
      const fromLng = Number(query.fromLng);
      const toLat = Number(query.toLat);
      const toLng = Number(query.toLng);
      
      // Handle category - only use if it's a valid enum value
      let category: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks' | undefined = undefined;
      if (query.category && 
          query.category !== 'undefined' && 
          query.category !== 'null' && 
          query.category !== '' &&
          typeof query.category === 'string') {
        const validCategories: string[] = ['tiffin', 'lunch', 'dinner', 'breakfast', 'snacks'];
        if (validCategories.includes(query.category)) {
          category = query.category as any;
        }
      }

      const foods = await foodService.getFoodAlongRoute(
        { address: '', lat: fromLat, lng: fromLng } as any,
        { address: '', lat: toLat, lng: toLng } as any,
        category
      );

      const response: ApiResponse = {
        success: true,
        message: 'Food shops along route retrieved successfully',
        data: foods,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/food/:foodId
   * Get food item by ID
   */
  fastify.get(
    '/:foodId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { foodId } = request.params as { foodId: string };

      const food = await foodService.getFoodById(foodId);

      const response: ApiResponse = {
        success: true,
        message: 'Food item retrieved successfully',
        data: food,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * POST /api/food/order
   * Create food order (authenticated)
   */
  fastify.post(
    '/order',
    {
      preHandler: [authenticate, validate(createOrderSchema)],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;
      const data = request.body as {
        foodId: string;
        quantity: number;
        deliveryLocation: any;
        paymentMethod: string;
      };

      const order = await foodService.createOrder({
        userId,
        ...data,
      });

      const response: ApiResponse = {
        success: true,
        message: 'Order created successfully',
        data: order,
      };

      return reply.status(201).send(response);
    }
  );

  /**
   * GET /api/food/orders
   * Get user's food orders (authenticated)
   */
  fastify.get(
    '/orders',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.userId;

      const orders = await foodService.getUserOrders(userId);

      const response: ApiResponse = {
        success: true,
        message: 'Orders retrieved successfully',
        data: orders,
      };

      return reply.status(200).send(response);
    }
  );

  /**
   * GET /api/food/orders/:orderId
   * Get order by ID (authenticated)
   */
  fastify.get(
    '/orders/:orderId',
    {
      preHandler: [authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { orderId } = request.params as { orderId: string };

      const order = await foodService.getOrderById(orderId);

      const response: ApiResponse = {
        success: true,
        message: 'Order retrieved successfully',
        data: order,
      };

      return reply.status(200).send(response);
    }
  );
}
