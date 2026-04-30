import LoadOffer from '../models/LoadOffer';
import User from '../models/User';
import { calculateDistance } from '../utils/helpers';
import { ConflictError, NotFoundError } from '../utils/errors';
import logger from '../utils/logger';

type LoadEstimateInput = {
  pickup: { lat: number; lng: number };
  drop: { lat: number; lng: number };
  weightKg: number;
  fragile?: boolean;
};

class LoadService {
  private estimateFare(input: LoadEstimateInput) {
    const distanceKm = calculateDistance(input.pickup.lat, input.pickup.lng, input.drop.lat, input.drop.lng);
    const base = 30;
    const distanceCharge = distanceKm * 8;
    const weightCharge = Math.max(0, input.weightKg - 1) * 4;
    const fragileCharge = input.fragile ? 20 : 0;
    const amount = Math.round(base + distanceCharge + weightCharge + fragileCharge);
    const platformFee = 0;
    return {
      distanceKm: Number(distanceKm.toFixed(2)),
      amount,
      platformFee,
      totalAmount: amount + platformFee,
    };
  }

  getEstimate(input: LoadEstimateInput) {
    return this.estimateFare(input);
  }

  async createInstantRequest(data: {
    senderId: string;
    pickup: { address: string; lat: number; lng: number; city?: string; state?: string };
    drop: { address: string; lat: number; lng: number; city?: string; state?: string };
    parcel: {
      category: 'documents' | 'food' | 'fragile' | 'electronics' | 'other';
      description?: string;
      weightKg: number;
      fragile?: boolean;
      dimensionsCm?: { length: number; width: number; height: number };
      declaredValue?: number;
    };
    receiver: { name: string; phone: string; alternatePhone?: string };
    scheduleAt?: Date;
    notes?: string;
  }) {
    const sender = await User.findOne({ userId: data.senderId });
    if (!sender) throw new NotFoundError('Sender not found');

    const estimate = this.estimateFare({
      pickup: data.pickup,
      drop: data.drop,
      weightKg: data.parcel.weightKg,
      fragile: data.parcel.fragile,
    });

    const offer = await LoadOffer.create({
      offerType: 'instant',
      senderId: data.senderId,
      senderName: sender.name,
      senderPhone: sender.phone,
      pickup: data.pickup,
      drop: data.drop,
      parcel: {
        ...data.parcel,
        fragile: !!data.parcel.fragile,
      },
      receiver: data.receiver,
      fareEstimate: {
        amount: estimate.amount,
        platformFee: estimate.platformFee,
        totalAmount: estimate.totalAmount,
      },
      scheduleAt: data.scheduleAt,
      notes: data.notes,
    });

    return offer.toJSON();
  }

  async createOffer(data: {
    senderId: string;
    pickup: { address: string; lat: number; lng: number; city?: string; state?: string };
    drop: { address: string; lat: number; lng: number; city?: string; state?: string };
    parcel: {
      category: 'documents' | 'food' | 'fragile' | 'electronics' | 'other';
      description?: string;
      weightKg: number;
      fragile?: boolean;
      dimensionsCm?: { length: number; width: number; height: number };
      declaredValue?: number;
    };
    receiver: { name: string; phone: string; alternatePhone?: string };
    scheduleAt?: Date;
    expiresAt?: Date;
    notes?: string;
  }) {
    const sender = await User.findOne({ userId: data.senderId });
    if (!sender) throw new NotFoundError('Sender not found');

    const estimate = this.estimateFare({
      pickup: data.pickup,
      drop: data.drop,
      weightKg: data.parcel.weightKg,
      fragile: data.parcel.fragile,
    });

    const offer = await LoadOffer.create({
      offerType: 'offer',
      senderId: data.senderId,
      senderName: sender.name,
      senderPhone: sender.phone,
      pickup: data.pickup,
      drop: data.drop,
      parcel: {
        ...data.parcel,
        fragile: !!data.parcel.fragile,
      },
      receiver: data.receiver,
      fareEstimate: {
        amount: estimate.amount,
        platformFee: estimate.platformFee,
        totalAmount: estimate.totalAmount,
      },
      scheduleAt: data.scheduleAt,
      expiresAt: data.expiresAt,
      notes: data.notes,
    });

    return offer.toJSON();
  }

  async searchOpenOffers(filters: {
    lat?: number;
    lng?: number;
    maxDistanceKm?: number;
    category?: 'documents' | 'food' | 'fragile' | 'electronics' | 'other';
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;
    const query: any = {
      offerType: 'offer',
      status: 'open',
    };
    if (filters.category) query['parcel.category'] = filters.category;

    let offers = await LoadOffer.find(query).sort({ createdAt: -1 });
    if (filters.lat !== undefined && filters.lng !== undefined) {
      const maxDistance = filters.maxDistanceKm || 20;
      offers = offers.filter((offer) => {
        const dist = calculateDistance(filters.lat!, filters.lng!, offer.pickup.lat, offer.pickup.lng);
        return dist <= maxDistance;
      });
    }

    const total = offers.length;
    const paged = offers.slice(skip, skip + limit).map((o) => o.toJSON());
    return { offers: paged, total, page, limit };
  }

  async getMyRequests(senderId: string) {
    const offers = await LoadOffer.find({ senderId }).sort({ createdAt: -1 }).limit(50);
    return offers.map((o) => o.toJSON());
  }

  async getById(loadOfferId: string) {
    const offer = await LoadOffer.findOne({ loadOfferId });
    if (!offer) throw new NotFoundError('Load offer not found');
    return offer.toJSON();
  }

  async acceptRequest(loadOfferId: string, driverId: string) {
    const offer = await LoadOffer.findOne({ loadOfferId });
    if (!offer) throw new NotFoundError('Load offer not found');
    if (offer.status !== 'open') throw new ConflictError('Load offer is not open');

    const driver = await User.findOne({ userId: driverId });
    if (!driver) throw new NotFoundError('Driver not found');

    offer.assignedDriverId = driverId;
    offer.assignedDriverName = driver.name;
    offer.assignedDriverPhone = driver.phone;
    offer.status = 'accepted';
    await offer.save();

    logger.info(`Load request accepted: ${loadOfferId} by driver ${driverId}`);
    return offer.toJSON();
  }

  async cancel(loadOfferId: string, requesterId: string) {
    const offer = await LoadOffer.findOne({ loadOfferId });
    if (!offer) throw new NotFoundError('Load offer not found');
    if (offer.senderId !== requesterId && offer.assignedDriverId !== requesterId) {
      throw new ConflictError('You are not authorized to cancel this load');
    }
    if (offer.status === 'completed') throw new ConflictError('Completed load cannot be cancelled');

    offer.status = 'cancelled';
    await offer.save();
    return offer.toJSON();
  }
}

export const loadService = new LoadService();
export default loadService;
