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
  loadOfferId?: string; // Reference to LoadOffer
  route?: Route;
  loadDetails?: {
    receiver: {
      name: string;
      phone: string;
      alternatePhone?: string;
    };
    parcel: {
      category: 'documents' | 'food' | 'fragile' | 'electronics' | 'other';
      description?: string;
      weightKg: number;
      fragile: boolean;
      dimensionsCm?: {
        length: number;
        width: number;
        height: number;
      };
      declaredValue?: number;
    };
    pickupOtp?: string;
    pickupOtpVerifiedAt?: Date;
    dropOtp?: string;
    dropOtpVerifiedAt?: Date;
    pickupProofUrl?: string;
    dropProofUrl?: string;
    pickupStatus?: 'pending' | 'reached' | 'verified';
    dropStatus?: 'pending' | 'reached' | 'verified';
  };
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
  coinsUsed?: number;
  coinDiscountAmount?: number;
  finalPayableAmount?: number;
  coinCompensationCredited?: boolean;
  coinCompensationCreditedAt?: Date;
  paymentMethod?: PaymentMethod; // Set at trip end when passenger chooses online or cash
  passengerStatus?: 'waiting' | 'got_in' | 'got_out'; // Track passenger boarding status
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentId?: string; // Reference to Payment
  passengers?: Array<{
    userId: string;
    name: string;
    status: 'confirmed' | 'cancelled';
  }>;
  seatsBooked?: number;
  coPassengers?: Array<{
    name: string;
    age: number;
    gender: 'Male' | 'Female' | 'Other';
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
  // Connected rides (multi-hop)
  connectedGroupId?: string;
  legOrder?: number;
  connectionPoint?: {
    address: string;
    lat: number;
    lng: number;
    city?: string;
  };
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
      enum: ['pooling', 'rental', 'loads'],
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
    loadOfferId: {
      type: String,
      ref: 'LoadOffer',
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
    loadDetails: {
      receiver: {
        name: String,
        phone: String,
        alternatePhone: String,
      },
      parcel: {
        category: {
          type: String,
          enum: ['documents', 'food', 'fragile', 'electronics', 'other'],
        },
        description: String,
        weightKg: Number,
        fragile: Boolean,
        dimensionsCm: {
          length: Number,
          width: Number,
          height: Number,
        },
        declaredValue: Number,
      },
      pickupOtp: String,
      pickupOtpVerifiedAt: Date,
      dropOtp: String,
      dropOtpVerifiedAt: Date,
      pickupProofUrl: String,
      dropProofUrl: String,
      pickupStatus: {
        type: String,
        enum: ['pending', 'reached', 'verified'],
        default: 'pending',
      },
      dropStatus: {
        type: String,
        enum: ['pending', 'reached', 'verified'],
        default: 'pending',
      },
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
        enum: ['car', 'bike', 'scooty'],
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
    coinsUsed: {
      type: Number,
      default: 0,
      min: 0,
    },
    coinDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalPayableAmount: {
      type: Number,
      min: 0,
    },
    coinCompensationCredited: {
      type: Boolean,
      default: false,
    },
    coinCompensationCreditedAt: {
      type: Date,
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
    seatsBooked: {
      type: Number,
      min: 1,
      default: 1,
    },
    coPassengers: [
      {
        name: {
          type: String,
          trim: true,
        },
        age: {
          type: Number,
          min: 1,
          max: 120,
        },
        gender: {
          type: String,
          enum: ['Male', 'Female', 'Other'],
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
      enum: ['user', 'driver', 'owner', 'admin', 'system'],
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
    // Connected rides (multi-hop)
    connectedGroupId: {
      type: String,
    },
    legOrder: {
      type: Number,
      min: 1,
      max: 3,
    },
    connectionPoint: {
      address: String,
      lat: Number,
      lng: Number,
      city: String,
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
bookingSchema.index({ loadOfferId: 1 });
bookingSchema.index({ paymentStatus: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ connectedGroupId: 1 });

// Ensure correct offer id is present based on serviceType
bookingSchema.pre('validate', function (next) {
  if (this.serviceType === 'pooling' && !this.poolingOfferId) {
    next(new Error('poolingOfferId is required for pooling service'));
  } else if (this.serviceType === 'rental' && !this.rentalOfferId) {
    next(new Error('rentalOfferId is required for rental service'));
  } else if (this.serviceType === 'loads' && !this.loadOfferId) {
    next(new Error('loadOfferId is required for loads service'));
  } else {
    next();
  }
});

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', bookingSchema);

export default Booking;
