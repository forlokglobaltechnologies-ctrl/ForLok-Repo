import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import websocketPlugin from '@fastify/websocket';
import { config } from './config/env';
import database from './config/database';
import { initializeFirebase } from './config/firebase';
import { initializeCloudinary } from './config/cloudinary';
import logger from './utils/logger';

const app: FastifyInstance = Fastify({
  logger: false, // We use winston instead
  requestIdLogLabel: 'reqId',
  disableRequestLogging: false,
});

// Register plugins
async function registerPlugins() {
  // WebSocket support
  await app.register(websocketPlugin);

  // CORS - allow all origins in development (Expo Go, different IPs, etc.)
  await app.register(cors, {
    origin: config.server.nodeEnv === 'development' ? true : config.server.frontendUrl,
    credentials: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  // Register error handler
  app.setErrorHandler(async (error, request, reply) => {
    const { errorHandler } = await import('./middleware/error.middleware');
    return errorHandler(error, request, reply);
  });

  // Register WebSocket routes
  await app.register(async function (fastify) {
    const { chatWebSocket } = await import('./routes/websocket/chat.websocket');
    await chatWebSocket(fastify);
  });

  // Register routes
  const { registerRoutes } = await import('./routes/index');
  await registerRoutes(app);
}

// Health check route
app.get('/health', async (_request, _reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: database.getConnectionStatus() ? 'connected' : 'disconnected',
  };
});

// Root route
app.get('/', async (_request, _reply) => {
  return {
    message: 'FORLOK Backend API',
    version: '1.0.0',
    status: 'running',
  };
});

// Start server
async function start() {
  try {
    // Initialize services
    logger.info('🚀 Starting FORLOK Backend...');

    // Connect to database
    await database.connect();

    // Initialize Firebase (for OTP)
    if (config.otp.provider === 'firebase') {
      initializeFirebase();
    }

    // Initialize Cloudinary
    initializeCloudinary();

    // Initialize email service
    try {
      const { emailService } = await import('./services/email.service');
      emailService.initialize();
    } catch (error) {
      logger.warn('Email service initialization failed:', error);
    }

    // Initialize Razorpay (optional)
    if (config.payment.provider === 'razorpay') {
      try {
        const { initializeRazorpay } = await import('./config/razorpay');
        initializeRazorpay();
      } catch (error) {
        logger.warn('Razorpay initialization skipped:', error);
      }
    }

    // Register plugins
    await registerPlugins();

    // Initialize admin user (hardcoded credentials)
    try {
      const Admin = (await import('./models/Admin')).default;
      const adminEmail = 'forlok@gmail.com';
      const adminUsername = 'forlok';
      const adminPassword = 'forlok123';
      const adminName = 'FORLOK Admin';

      let admin = await Admin.findOne({
        $or: [
          { email: adminEmail },
          { username: adminUsername },
        ],
      });

      if (admin) {
        // Update existing admin to ensure correct credentials
        admin.password = adminPassword; // Will be hashed by pre-save hook
        admin.email = adminEmail;
        admin.username = adminUsername;
        admin.name = adminName;
        admin.isActive = true;
        admin.role = 'super_admin';
        admin.permissions = ['*'];
        await admin.save();
        logger.info(`✅ Admin user updated: ${adminUsername}`);
      } else {
        // Create new admin
        admin = await Admin.create({
          username: adminUsername,
          email: adminEmail,
          password: adminPassword, // Will be hashed by pre-save hook
          name: adminName,
          role: 'super_admin',
          permissions: ['*'],
          isActive: true,
        });
        logger.info(`✅ Admin user created: ${adminUsername}`);
      }
    } catch (error) {
      logger.warn('Could not initialize admin user:', error);
    }

    // Initialize default admin roles
    try {
      const AdminRole = (await import('./models/AdminRole')).default;
      const { ADMIN_PERMISSIONS } = await import('./constants/admin-permissions');
      const baseRoles = [
        {
          roleKey: 'admin',
          name: 'Admin',
          description: 'General admin operations access',
          permissions: [
            ADMIN_PERMISSIONS.DASHBOARD_VIEW,
            ADMIN_PERMISSIONS.USERS_VIEW,
            ADMIN_PERMISSIONS.BOOKINGS_VIEW,
            ADMIN_PERMISSIONS.OFFERS_VIEW,
            ADMIN_PERMISSIONS.CONTENT_VIEW,
            ADMIN_PERMISSIONS.CONTENT_MANAGE,
          ],
        },
        {
          roleKey: 'moderator',
          name: 'Moderator',
          description: 'Review and moderation focused access',
          permissions: [
            ADMIN_PERMISSIONS.DASHBOARD_VIEW,
            ADMIN_PERMISSIONS.FEEDBACK_VIEW,
            ADMIN_PERMISSIONS.FEEDBACK_MANAGE,
            ADMIN_PERMISSIONS.PROMOS_REVIEW,
          ],
        },
      ];

      for (const role of baseRoles) {
        await AdminRole.findOneAndUpdate(
          { roleKey: role.roleKey },
          {
            ...role,
            isSystem: true,
            isActive: true,
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      }
      logger.info('✅ Default admin roles initialized');
    } catch (error) {
      logger.warn('Could not initialize admin roles:', error);
    }

    // Initialize sample food data (development only)
    // Always initialize to ensure data is available
    try {
      const { foodService } = await import('./services/food.service');
      await foodService.initializeSampleData();
      const count = await foodService.getFoodCount();
      logger.info(`🍔 Food database initialized with ${count} items`);
    } catch (error) {
      logger.warn('Could not initialize sample food data:', error);
    }

    // Start trip scheduler for time-based auto-start
    try {
      const { tripSchedulerService } = await import('./services/tripScheduler.service');
      tripSchedulerService.start();
      logger.info('⏰ Trip scheduler started');
    } catch (error) {
      logger.warn('Could not start trip scheduler:', error);
    }

    // Start server
    const address = await app.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    logger.info(`✅ Server listening on ${address}`);
    logger.info(`📝 Environment: ${config.server.nodeEnv}`);
    logger.info(`🌐 API Base URL: ${config.server.apiBaseUrl}`);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  try {
    const { tripSchedulerService } = await import('./services/tripScheduler.service');
    tripSchedulerService.stop();
  } catch (error) {
    // Ignore if service not loaded
  }
  await app.close();
  await database.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  try {
    const { tripSchedulerService } = await import('./services/tripScheduler.service');
    tripSchedulerService.stop();
  } catch (error) {
    // Ignore if service not loaded
  }
  await app.close();
  await database.disconnect();
  process.exit(0);
});

// Start the server
start();

export default app;