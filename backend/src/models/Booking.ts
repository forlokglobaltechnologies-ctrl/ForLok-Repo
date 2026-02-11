import mongoose, { Schema, Document, Model } from 'mongoose';
import { BookingStatus, ServiceType, PaymentMethod, Route } from '../types';
import { generateBookingId } from '../utils/helpers';

export interface IBooking extends Document {
  bookingId: string;
  bookingNumber: string; // Display ID like #YA20240115001
  userId: string; // Reference to User
  serviceType: ServiceType;
  poolingOfferId?: string; // Reference to PoolingOffer
  rentalOfferId?: string; // Reference to RentalOffer
  route?: Route;
  date: Date;
  time?: string;
  duration?: number; // For rental, in hours
  startTime?: string; // For rental, start time in HH:mm format (e.g., "09:00")
  endTime?: string; // For rental, end time in HH:mm format (e.g., "17:00")
  driver?: {
    userId: string;
    name: string;
    photo?: string;
    phone: string;
  };
  owner?: {
    userId: string;
    name: string;
    photo?: string;
  };
  vehicle: {
    type: 'car' | 'bike';
    brand: string;
    number: string;
  };
  amount: number;
  platformFee: number;
  totalAmount: number;
  paymentMethod?: PaymentMethod; // Set at trip end when passenger chooses online or cash
  passengerStatus?: 'waiting' | 'got_in' | 'got_out'; // Track passenger boarding status
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string; // Reference to Payment
  passengers?: Array<{
    userId: string;
    name: string;
    status: 'confirmed' | 'cancelled';
  }>;
  status: BookingStatus;
  cancellationReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationFee?: number;
  // Code generation for passenger verification
  passengerCode?: string; // 4-digit code generated when passenger gets out
  codeGeneratedAt?: Date;
  // Settlement fields
  settlementStatus?: 'pending' | 'driver_requested' | 'admin_approved' | 'settled' | 'rejected';
  driverSettlementAmount?: number; // Amount driver receives (totalAmount - platformFee)
  settlementRequestedAt?: Date;
  settlementApprovedAt?: Date;
  settlementRejectedReason?: string;
  // Road-aware matching: passenger pickup/drop segments
  passengerPickupSegment?: {
    roadId: string;
    roadName?: string;
    estimatedTime: Date;
    lat: number;
    lng: number;
    segmentIndex: number;
  };
  passengerDropSegment?: {
    roadId: string;
    roadName?: string;
    estimatedTime: Date;
    lat: number;
    lng: number;
    segmentIndex: number;
  };
  tripStartedAt?: Date; // When trip actually started
  tripCompletedAt?: Date; // When passenger reached destination
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      default: () => generateBookingId(),
    },
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      default: () => generateBookingId(),
    },
    userId: {
      type: String,
      required: true,
      ref: 'User',
    },
    serviceType: {
      type: String,
      enum: ['pooling', 'rental'],
      required: true,
    },
    poolingOfferId: {
      type: String,
      ref: 'PoolingOffer',
    },
    rentalOfferId: {
      type: String,
      ref: 'RentalOffer',
    },
    route: {
      from: {
        address: String,
        lat: Number,
        lng: Number,
        city: String,
        state: String,
      },
      to: {
        address: String,
        lat: Number,
        lng: Number,
        city: String,
        state: String,
      },
      distance: Number,
      duration: Number,
      polyline: [{
        lat: Number,
        lng: Number,
        index: Number,
      }], // Polyline coordinates for route matching
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
    },
    duration: {
      type: Number,
      min: 1,
    },
    startTime: {
      type: String, // HH:mm format for rental bookings
    },
    endTime: {
      type: String, // HH:mm format for rental bookings
    },
    driver: {
      userId: String,
      name: String,
      photo: String,
      phone: String,
    },
    owner: {
      userId: String,
      name: String,
      photo: String,
    },
    vehicle: {
      type: {
        type: String,
        enum: ['car', 'bike'],
        required: true,
      },
      brand: {
        type: String,
        required: true,
      },
      number: {
        type: String,
        required: true,
      },
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'card', 'wallet', 'net_banking', 'offline_cash'],
      required: false, // Set at trip end when passenger chooses payment method
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentId: {
      type: String,
      ref: 'Payment',
    },
    passengers: [
      {
        userId: String,
        name: String,
        status: {
          type: String,
          enum: ['confirmed', 'cancelled'],
          default: 'confirmed',
        },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
      default: 'pending',
    },
    cancellationReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
      enum: ['user', 'driver', 'owner', 'admin'],
    },
    cancellationFee: {
      type: Number,
      default: 0,
    },
    // Code generation for passenger verification
    passengerCode: {
      type: String,
      length: 4,
    },
    passengerStatus: {
      type: String,
      enum: ['waiting', 'got_in', 'got_out'],
      default: 'waiting',
    },
    codeGeneratedAt: {
      type: Date,
    },
    // Settlement fields
    settlementStatus: {
      type: String,
      enum: ['pending', 'driver_requested', 'admin_approved', 'settled', 'rejected'],
      default: 'pending',
    },
    driverSettlementAmount: {
      type: Number,
      min: 0,
    },
    settlementRequestedAt: {
      type: Date,
    },
    settlementApprovedAt: {
      type: Date,
    },
    settlementRejectedReason: {
      type: String,
    },
    // Road-aware matching: passenger pickup/drop segments
    passengerPickupSegment: {
      roadId: String,
      roadName: String,
      estimatedTime: Date,
      lat: Number,
      lng: Number,
      segmentIndex: Number,
    },
    passengerDropSegment: {
      roadId: String,
      roadName: String,
      estimatedTime: Date,
      lat: Number,
      lng: Number,
      segmentIndex: Number,
    },
    tripStartedAt: {
      type: Date,
    },
    tripCompletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ bookingId: 1 }, { unique: true });
bookingSchema.index({ bookingNumber: 1 }, { unique: true });
bookingSchema.index({ date: 1, status: 1 });
bookingSchema.index({ serviceType: 1, status: 1 });
bookingSchema.index({ poolingOfferId: 1 });
bookingSchema.index({ rentalOfferId: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });

// Ensure either poolingOfferId or rentalOfferId is present based on serviceType
bookingSchema.pre('validate', function (next) {
  if (this.serviceType === 'pooling' && !this.poolingOfferId) {
    next(new Error('poolingOfferId is required for pooling service'));
  } else if (this.serviceType === 'rental' && !this.rentalOfferId) {
    next(new Error('rentalOfferId is required for rental service'));
  } else {
    next();
  }
});

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
