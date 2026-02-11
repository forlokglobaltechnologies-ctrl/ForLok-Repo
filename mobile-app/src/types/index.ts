export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  rating: number;
  totalReviews: number;
  totalTrips: number;
  totalEarnings: number;
  totalSpent: number;
  profilePhoto: string;
  vehicles: Vehicle[];
  documents: UserDocuments;
  verificationStatus: 'verified' | 'pending' | 'rejected';
}

export interface Vehicle {
  id: string;
  type: 'Car' | 'Bike';
  brand: string;
  number: string;
  plateType?: 'white' | 'yellow';
  photos: {
    front: string;
    back: string;
  };
  insuranceExpiry?: string;
  status: 'active' | 'inactive';
}

export interface UserDocuments {
  drivingLicense?: {
    front: string;
    back: string;
  };
  aadhar: {
    front: string;
    back: string;
  };
  vehicle?: string;
}

export interface PoolingOffer {
  id: string;
  driverId: string;
  driverName: string;
  driverPhoto: string;
  rating: number;
  totalReviews: number;
  route: {
    from: string;
    to: string;
    fromLat: number;
    fromLng: number;
    toLat: number;
    toLng: number;
  };
  date: string;
  time: string;
  vehicle: {
    type: 'Car' | 'Bike';
    brand: string;
    number: string;
    photos: string[];
  };
  availableSeats: number;
  totalSeats: number;
  price: number;
  notes?: string;
  passengers: Passenger[];
  status: 'active' | 'pending' | 'expired' | 'suspended';
  views: number;
  bookingRequests: number;
}

export interface Passenger {
  id: string;
  name: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

export interface RentalOffer {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhoto: string;
  rating: number;
  totalReviews: number;
  vehicle: {
    type: 'Car' | 'Bike';
    brand: string;
    year: number;
    number: string;
    seats: number;
    fuel: string;
    transmission: string;
    photos: string[];
  };
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  date: string;
  availableFrom: string;
  availableUntil: string;
  pricePerHour: number;
  minimumHours: number;
  notes?: string;
  totalBookings: number;
  completed: number;
  cancelled: number;
  revenue: number;
  status: 'active' | 'pending' | 'expired' | 'suspended';
}

export interface Booking {
  id: string;
  bookingId: string;
  type: 'pooling' | 'rental';
  route?: {
    from: string;
    to: string;
  };
  date: string;
  time?: string;
  duration?: number;
  driver?: {
    name: string;
    photo: string;
    phone: string;
  };
  owner?: {
    name: string;
    photo: string;
  };
  vehicle: {
    type: 'Car' | 'Bike';
    brand: string;
    number: string;
  };
  amount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'pending' | 'failed';
  status: 'confirmed' | 'completed' | 'cancelled';
  passengers?: Passenger[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionRequired: boolean;
}

export interface Feedback {
  id: string;
  type: string;
  user: string;
  userId: string;
  subject: string;
  description: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  priority: 'high' | 'medium' | 'low';
  submitted: string;
}











