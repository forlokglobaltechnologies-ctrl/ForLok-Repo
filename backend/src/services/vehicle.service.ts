import Vehicle from '../models/Vehicle';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { uploadFromBuffer } from '../config/cloudinary';
import { VehicleType } from '../types';

class VehicleService {
  /**
   * Add new vehicle
   */
  async addVehicle(data: {
    userId?: string;
    companyId?: string;
    type: VehicleType;
    brand: string;
    model?: string;
    year?: number;
    color?: string;
    number: string;
    plateType?: 'white' | 'yellow' | 'green';
    seats: number;
    fuelType: string;
    transmission: 'Manual' | 'Automatic';
    insuranceExpiry?: Date;
  }): Promise<any> {
    try {
      // Check if vehicle number already exists
      const existingVehicle = await Vehicle.findOne({
        number: data.number.toUpperCase(),
      });
      if (existingVehicle) {
        throw new ConflictError('Vehicle with this registration number already exists');
      }

      // Generate vehicle ID
      const vehicleId = generateUserId('V');

      // Create vehicle
      const vehicle = await Vehicle.create({
        vehicleId,
        userId: data.userId,
        companyId: data.companyId,
        type: data.type,
        brand: data.brand,
        vehicleModel: data.model,
        year: data.year,
        color: data.color,
        number: data.number.toUpperCase(),
        plateType: data.plateType,
        seats: data.seats,
        fuelType: data.fuelType,
        transmission: data.transmission,
        insuranceExpiry: data.insuranceExpiry,
        status: 'active',
        isVerified: false,
      });

      logger.info(`Vehicle added: ${vehicle.vehicleId}`);

      return vehicle.toJSON();
    } catch (error) {
      logger.error('Error adding vehicle:', error);
      throw error;
    }
  }

  /**
   * Get user's vehicles
   */
  async getUserVehicles(userId: string): Promise<any[]> {
    try {
      const vehicles = await Vehicle.find({ userId }).sort({ createdAt: -1 });
      return vehicles.map((v) => v.toJSON());
    } catch (error) {
      logger.error('Error getting user vehicles:', error);
      throw error;
    }
  }

  /**
   * Get company's vehicles
   */
  async getCompanyVehicles(companyId: string): Promise<any[]> {
    try {
      const vehicles = await Vehicle.find({ companyId }).sort({ createdAt: -1 });
      return vehicles.map((v) => v.toJSON());
    } catch (error) {
      logger.error('Error getting company vehicles:', error);
      throw error;
    }
  }

  /**
   * Get vehicle by ID
   */
  async getVehicleById(vehicleId: string): Promise<any> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }
      return vehicle.toJSON();
    } catch (error) {
      logger.error('Error getting vehicle by ID:', error);
      throw error;
    }
  }

  /**
   * Update vehicle
   */
  async updateVehicle(
    vehicleId: string,
    data: {
      brand?: string;
      model?: string;
      year?: number;
      color?: string;
      seats?: number;
      fuelType?: string;
      transmission?: 'Manual' | 'Automatic';
      status?: 'active' | 'inactive' | 'under_maintenance';
      insuranceExpiry?: Date;
    }
  ): Promise<any> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Update fields
      if (data.brand !== undefined) vehicle.brand = data.brand;
      if (data.model !== undefined) vehicle.vehicleModel = data.model;
      if (data.year !== undefined) vehicle.year = data.year;
      if (data.color !== undefined) vehicle.color = data.color;
      if (data.seats !== undefined) vehicle.seats = data.seats;
      if (data.fuelType !== undefined) vehicle.fuelType = data.fuelType;
      if (data.transmission !== undefined) vehicle.transmission = data.transmission;
      if (data.status !== undefined) vehicle.status = data.status;
      if (data.insuranceExpiry !== undefined) vehicle.insuranceExpiry = data.insuranceExpiry;

      await vehicle.save();

      logger.info(`Vehicle updated: ${vehicleId}`);

      return vehicle.toJSON();
    } catch (error) {
      logger.error('Error updating vehicle:', error);
      throw error;
    }
  }

  /**
   * Upload vehicle photo
   */
  async uploadVehiclePhoto(
    vehicleId: string,
    photoType: 'front' | 'back' | 'side' | 'interior',
    file: Buffer,
    _mimeType: string
  ): Promise<any> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Upload photo
      const uploadResult: any = await uploadFromBuffer(file, `forlok/vehicles/${vehicleId}`, {
        public_id: `${photoType}_${Date.now()}`,
      });

      // Update vehicle photos
      if (!vehicle.photos) {
        vehicle.photos = {};
      }
      vehicle.photos[photoType] = uploadResult.secure_url;
      await vehicle.save();

      logger.info(`Vehicle photo uploaded: ${vehicleId} - ${photoType}`);

      return {
        photoType,
        url: uploadResult.secure_url,
      };
    } catch (error) {
      logger.error('Error uploading vehicle photo:', error);
      throw error;
    }
  }

  /**
   * Upload vehicle document
   */
  async uploadVehicleDocument(
    vehicleId: string,
    documentType: 'registrationCertificate' | 'insurance' | 'pollutionCertificate' | 'taxiServicePapers',
    file: Buffer,
    _mimeType: string
  ): Promise<any> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Upload document
      const uploadResult: any = await uploadFromBuffer(file, `forlok/vehicles/${vehicleId}/documents`, {
        public_id: `${documentType}_${Date.now()}`,
      });

      // Update vehicle documents
      if (!vehicle.documents) {
        vehicle.documents = {};
      }
      vehicle.documents[documentType] = uploadResult.secure_url;
      await vehicle.save();

      logger.info(`Vehicle document uploaded: ${vehicleId} - ${documentType}`);

      return {
        documentType,
        url: uploadResult.secure_url,
      };
    } catch (error) {
      logger.error('Error uploading vehicle document:', error);
      throw error;
    }
  }

  /**
   * Delete vehicle
   */
  async deleteVehicle(vehicleId: string): Promise<void> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        throw new NotFoundError('Vehicle not found');
      }

      // Soft delete - mark as inactive
      vehicle.status = 'inactive';
      await vehicle.save();

      logger.info(`Vehicle deleted (soft): ${vehicleId}`);
    } catch (error) {
      logger.error('Error deleting vehicle:', error);
      throw error;
    }
  }

  /**
   * Verify vehicle ownership
   */
  async verifyVehicleOwnership(vehicleId: string, userId: string, companyId?: string): Promise<boolean> {
    try {
      const vehicle = await Vehicle.findOne({ vehicleId });
      if (!vehicle) {
        return false;
      }

      if (vehicle.userId === userId) {
        return true;
      }

      if (companyId && vehicle.companyId === companyId) {
        return true;
      }

      return false;
    } catch (error) {
      logger.error('Error verifying vehicle ownership:', error);
      return false;
    }
  }
}

export const vehicleService = new VehicleService();
export default vehicleService;
