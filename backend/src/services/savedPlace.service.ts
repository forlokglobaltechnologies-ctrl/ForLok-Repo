import SavedPlace, { ISavedPlace } from '../models/SavedPlace';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

class SavedPlaceService {
  async upsertPlace(
    userId: string,
    data: {
      label: 'home' | 'work' | 'custom';
      customLabel?: string;
      address: string;
      lat: number;
      lng: number;
      city?: string;
      state?: string;
    }
  ): Promise<ISavedPlace> {
    try {
      if (data.label === 'home' || data.label === 'work') {
        const place = await SavedPlace.findOneAndUpdate(
          { userId, label: data.label },
          { ...data, userId, lastUsedAt: new Date() },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        return place;
      }

      const customCount = await SavedPlace.countDocuments({ userId, label: 'custom' });
      if (customCount >= 10) {
        throw new ConflictError('Maximum 10 custom saved places allowed');
      }

      const place = await SavedPlace.create({ ...data, userId });
      return place;
    } catch (error) {
      logger.error('Error upserting saved place:', error);
      throw error;
    }
  }

  async getUserPlaces(userId: string): Promise<ISavedPlace[]> {
    try {
      return SavedPlace.find({ userId }).sort({ label: 1, usageCount: -1 }).limit(12);
    } catch (error) {
      logger.error('Error getting saved places:', error);
      throw error;
    }
  }

  async deletePlace(userId: string, placeId: string): Promise<void> {
    try {
      const result = await SavedPlace.findOneAndDelete({ _id: placeId, userId });
      if (!result) throw new NotFoundError('Saved place not found');
    } catch (error) {
      logger.error('Error deleting saved place:', error);
      throw error;
    }
  }

  async incrementUsage(userId: string, placeId: string): Promise<void> {
    try {
      await SavedPlace.findOneAndUpdate(
        { _id: placeId, userId },
        { $inc: { usageCount: 1 }, lastUsedAt: new Date() }
      );
    } catch (error) {
      logger.error('Error incrementing place usage:', error);
    }
  }
}

export const savedPlaceService = new SavedPlaceService();
export default savedPlaceService;
