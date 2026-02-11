import mongoose from 'mongoose';
import { config } from './env';
import logger from '../utils/logger';

class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('Database already connected');
      return;
    }

    try {
      // Validate connection string
      if (!config.database.uri) {
        throw new Error('MONGODB_URI is not set in environment variables');
      }

      const options: mongoose.ConnectOptions = {
        dbName: config.database.dbName,
        serverSelectionTimeoutMS: 10000, // 10 seconds timeout
        socketTimeoutMS: 45000, // 45 seconds socket timeout
        connectTimeoutMS: 10000, // 10 seconds connection timeout
        retryWrites: true,
        w: 'majority',
      };

      logger.info(`Attempting to connect to MongoDB...`);
      logger.info(`Database: ${config.database.dbName}`);
      logger.info(`URI: ${config.database.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`); // Hide credentials in logs

      await mongoose.connect(config.database.uri, options);

      this.isConnected = true;
      logger.info(`✅ MongoDB connected: ${config.database.dbName}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

      // Handle process termination
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });
    } catch (error: any) {
      logger.error('Failed to connect to MongoDB:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('querySrv')) {
        logger.error('\n❌ MongoDB Connection Failed - Troubleshooting Steps:');
        logger.error('1. Check MongoDB Atlas IP Whitelist:');
        logger.error('   - Go to: https://cloud.mongodb.com/');
        logger.error('   - Navigate to: Network Access → Add IP Address');
        logger.error('   - Add your current IP or use: 0.0.0.0/0 (for development only)');
        logger.error('');
        logger.error('2. Verify Connection String in .env file:');
        logger.error('   - Format: mongodb+srv://username:password@cluster.mongodb.net/dbname');
        logger.error('   - Make sure password is URL-encoded if it contains special characters');
        logger.error('');
        logger.error('3. Check if MongoDB Atlas cluster is running:');
        logger.error('   - Free tier clusters auto-pause after inactivity');
        logger.error('   - Go to MongoDB Atlas → Resume cluster if paused');
        logger.error('');
        logger.error('4. Check network/firewall settings');
        logger.error('   - Ensure port 27017 is not blocked');
        logger.error('   - Try from a different network');
      }
      
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default Database.getInstance();
