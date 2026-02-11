import Food from '../models/Food';
import FoodOrder from '../models/FoodOrder';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';
import { calculateDistance, calculatePlatformFee } from '../utils/helpers';
import { Location } from '../types';

// Sample food data - will be replaced with real data later
const SAMPLE_FOOD_DATA = [
  {
    foodId: 'FOOD001',
    vendorId: 'VENDOR001',
    vendorName: 'Sri Krishna Tiffins',
    name: 'South Indian Tiffin Combo',
    category: 'tiffin' as const,
    description: 'Delicious idli, vada, dosa with sambar and chutney',
    price: 80,
    location: {
      address: 'MG Road, Bangalore',
      lat: 12.9716,
      lng: 77.5946,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
    availableFrom: '07:00',
    availableUntil: '11:00',
    isAvailable: true,
    rating: 4.5,
    totalReviews: 120,
    totalOrders: 500,
    preparationTime: 15,
    cuisine: 'South Indian',
    isVeg: true,
    tags: ['popular', 'breakfast'],
  },
  {
    foodId: 'FOOD002',
    vendorId: 'VENDOR002',
    vendorName: 'Biryani House',
    name: 'Chicken Biryani',
    category: 'lunch' as const,
    description: 'Authentic Hyderabadi biryani with raita and salad',
    price: 250,
    location: {
      address: 'Koramangala, Bangalore',
      lat: 12.9352,
      lng: 77.6245,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560095',
    },
    availableFrom: '12:00',
    availableUntil: '15:00',
    isAvailable: true,
    rating: 4.8,
    totalReviews: 200,
    totalOrders: 800,
    preparationTime: 25,
    cuisine: 'Mughlai',
    isVeg: false,
    tags: ['popular', 'spicy'],
  },
  {
    foodId: 'FOOD003',
    vendorId: 'VENDOR003',
    vendorName: 'Vegetarian Delight',
    name: 'Thali Special',
    category: 'lunch' as const,
    description: 'Complete vegetarian thali with rice, roti, dal, sabzi, salad, and dessert',
    price: 150,
    location: {
      address: 'Indiranagar, Bangalore',
      lat: 12.9784,
      lng: 77.6408,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
    },
    availableFrom: '12:00',
    availableUntil: '15:00',
    isAvailable: true,
    rating: 4.3,
    totalReviews: 150,
    totalOrders: 600,
    preparationTime: 20,
    cuisine: 'North Indian',
    isVeg: true,
    tags: ['thali', 'complete meal'],
  },
  {
    foodId: 'FOOD004',
    vendorId: 'VENDOR004',
    vendorName: 'Dinner Express',
    name: 'North Indian Dinner Combo',
    category: 'dinner' as const,
    description: 'Roti, dal, paneer curry, rice, and dessert',
    price: 180,
    location: {
      address: 'Whitefield, Bangalore',
      lat: 12.9698,
      lng: 77.7499,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066',
    },
    availableFrom: '19:00',
    availableUntil: '22:00',
    isAvailable: true,
    rating: 4.6,
    totalReviews: 180,
    totalOrders: 700,
    preparationTime: 30,
    cuisine: 'North Indian',
    isVeg: true,
    tags: ['dinner', 'combo'],
  },
  {
    foodId: 'FOOD005',
    vendorId: 'VENDOR005',
    vendorName: 'Street Food Corner',
    name: 'Pav Bhaji',
    category: 'snacks' as const,
    description: 'Spicy pav bhaji with butter and onions',
    price: 100,
    location: {
      address: 'Jayanagar, Bangalore',
      lat: 12.9279,
      lng: 77.5931,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560011',
    },
    availableFrom: '16:00',
    availableUntil: '20:00',
    isAvailable: true,
    rating: 4.4,
    totalReviews: 90,
    totalOrders: 400,
    preparationTime: 10,
    cuisine: 'Street Food',
    isVeg: true,
    tags: ['snacks', 'street food'],
  },
  {
    foodId: 'FOOD006',
    vendorId: 'VENDOR001',
    vendorName: 'Sri Krishna Tiffins',
    name: 'Masala Dosa',
    category: 'breakfast' as const,
    description: 'Crispy dosa with potato masala',
    price: 60,
    location: {
      address: 'MG Road, Bangalore',
      lat: 12.9716,
      lng: 77.5946,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
    availableFrom: '07:00',
    availableUntil: '11:00',
    isAvailable: true,
    rating: 4.7,
    totalReviews: 250,
    totalOrders: 1000,
    preparationTime: 12,
    cuisine: 'South Indian',
    isVeg: true,
    tags: ['popular', 'breakfast'],
  },
  {
    foodId: 'FOOD007',
    vendorId: 'VENDOR006',
    vendorName: 'Mumbai Street Food',
    name: 'Vada Pav',
    category: 'snacks' as const,
    description: 'Spicy potato vada in bread bun with chutney',
    price: 30,
    location: {
      address: 'Mumbai Central, Mumbai',
      lat: 19.0760,
      lng: 72.8777,
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400008',
    },
    availableFrom: '10:00',
    availableUntil: '22:00',
    isAvailable: true,
    rating: 4.6,
    totalReviews: 300,
    totalOrders: 1200,
    preparationTime: 5,
    cuisine: 'Street Food',
    isVeg: true,
    tags: ['popular', 'snacks'],
  },
  {
    foodId: 'FOOD008',
    vendorId: 'VENDOR007',
    vendorName: 'Delhi Dhaba',
    name: 'Butter Chicken',
    category: 'dinner' as const,
    description: 'Creamy butter chicken with naan and rice',
    price: 280,
    location: {
      address: 'Connaught Place, New Delhi',
      lat: 28.6304,
      lng: 77.2177,
      city: 'New Delhi',
      state: 'Delhi',
      pincode: '110001',
    },
    availableFrom: '18:00',
    availableUntil: '23:00',
    isAvailable: true,
    rating: 4.9,
    totalReviews: 450,
    totalOrders: 1500,
    preparationTime: 35,
    cuisine: 'North Indian',
    isVeg: false,
    tags: ['popular', 'non-veg'],
  },
  {
    foodId: 'FOOD009',
    vendorId: 'VENDOR008',
    vendorName: 'Chennai Tiffin Center',
    name: 'Pongal & Vadai',
    category: 'tiffin' as const,
    description: 'Traditional South Indian pongal with crispy vadai',
    price: 70,
    location: {
      address: 'T Nagar, Chennai',
      lat: 13.0418,
      lng: 80.2341,
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600017',
    },
    availableFrom: '07:00',
    availableUntil: '11:00',
    isAvailable: true,
    rating: 4.5,
    totalReviews: 180,
    totalOrders: 750,
    preparationTime: 18,
    cuisine: 'South Indian',
    isVeg: true,
    tags: ['traditional', 'breakfast'],
  },
  {
    foodId: 'FOOD010',
    vendorId: 'VENDOR009',
    vendorName: 'Hyderabad Biryani Point',
    name: 'Mutton Biryani',
    category: 'lunch' as const,
    description: 'Authentic Hyderabadi mutton biryani with raita',
    price: 320,
    location: {
      address: 'Hitech City, Hyderabad',
      lat: 17.4486,
      lng: 78.3908,
      city: 'Hyderabad',
      state: 'Telangana',
      pincode: '500081',
    },
    availableFrom: '12:00',
    availableUntil: '16:00',
    isAvailable: true,
    rating: 4.8,
    totalReviews: 320,
    totalOrders: 1100,
    preparationTime: 30,
    cuisine: 'Hyderabadi',
    isVeg: false,
    tags: ['popular', 'spicy'],
  },
  {
    foodId: 'FOOD011',
    vendorId: 'VENDOR010',
    vendorName: 'Pune Breakfast Hub',
    name: 'Misal Pav',
    category: 'breakfast' as const,
    description: 'Spicy misal curry with pav and farsan',
    price: 90,
    location: {
      address: 'Koregaon Park, Pune',
      lat: 18.5448,
      lng: 73.8966,
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    },
    availableFrom: '08:00',
    availableUntil: '12:00',
    isAvailable: true,
    rating: 4.7,
    totalReviews: 200,
    totalOrders: 850,
    preparationTime: 15,
    cuisine: 'Maharashtrian',
    isVeg: true,
    tags: ['popular', 'spicy'],
  },
  {
    foodId: 'FOOD012',
    vendorId: 'VENDOR011',
    vendorName: 'Kolkata Street Eats',
    name: 'Kathi Roll',
    category: 'snacks' as const,
    description: 'Spicy chicken kathi roll with onions and chutney',
    price: 120,
    location: {
      address: 'Park Street, Kolkata',
      lat: 22.5448,
      lng: 88.3426,
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
    },
    availableFrom: '14:00',
    availableUntil: '21:00',
    isAvailable: true,
    rating: 4.6,
    totalReviews: 150,
    totalOrders: 600,
    preparationTime: 12,
    cuisine: 'Bengali',
    isVeg: false,
    tags: ['popular', 'street food'],
  },
  // Additional food items for better coverage
  {
    foodId: 'FOOD013',
    vendorId: 'VENDOR012',
    vendorName: 'Coastal Delights',
    name: 'Fish Curry Rice',
    category: 'lunch' as const,
    description: 'Fresh fish curry with steamed rice and pickle',
    price: 200,
    location: {
      address: 'Marina Beach Road, Chennai',
      lat: 13.0475,
      lng: 80.2827,
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600005',
    },
    availableFrom: '12:00',
    availableUntil: '15:00',
    isAvailable: true,
    rating: 4.7,
    totalReviews: 180,
    totalOrders: 720,
    preparationTime: 20,
    cuisine: 'Coastal',
    isVeg: false,
    tags: ['seafood', 'traditional'],
  },
  {
    foodId: 'FOOD014',
    vendorId: 'VENDOR013',
    vendorName: 'Gujarati Thali House',
    name: 'Gujarati Thali',
    category: 'lunch' as const,
    description: 'Complete Gujarati thali with dal, sabzi, roti, rice, and sweets',
    price: 160,
    location: {
      address: 'Ahmedabad City Center',
      lat: 23.0225,
      lng: 72.5714,
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380009',
    },
    availableFrom: '12:00',
    availableUntil: '15:00',
    isAvailable: true,
    rating: 4.6,
    totalReviews: 220,
    totalOrders: 900,
    preparationTime: 25,
    cuisine: 'Gujarati',
    isVeg: true,
    tags: ['thali', 'traditional'],
  },
  {
    foodId: 'FOOD015',
    vendorId: 'VENDOR014',
    vendorName: 'Punjabi Dhaba',
    name: 'Butter Naan with Dal Makhani',
    category: 'dinner' as const,
    description: 'Creamy dal makhani with butter naan and pickle',
    price: 140,
    location: {
      address: 'Ludhiana Main Road',
      lat: 30.9010,
      lng: 75.8573,
      city: 'Ludhiana',
      state: 'Punjab',
      pincode: '141001',
    },
    availableFrom: '18:00',
    availableUntil: '23:00',
    isAvailable: true,
    rating: 4.8,
    totalReviews: 280,
    totalOrders: 1100,
    preparationTime: 20,
    cuisine: 'Punjabi',
    isVeg: true,
    tags: ['popular', 'comfort food'],
  },
  {
    foodId: 'FOOD016',
    vendorId: 'VENDOR015',
    vendorName: 'Rajasthani Kitchen',
    name: 'Dal Baati Churma',
    category: 'dinner' as const,
    description: 'Traditional Rajasthani dal baati with churma and ghee',
    price: 180,
    location: {
      address: 'Jaipur City Palace Area',
      lat: 26.9124,
      lng: 75.7873,
      city: 'Jaipur',
      state: 'Rajasthan',
      pincode: '302002',
    },
    availableFrom: '19:00',
    availableUntil: '22:00',
    isAvailable: true,
    rating: 4.7,
    totalReviews: 190,
    totalOrders: 750,
    preparationTime: 30,
    cuisine: 'Rajasthani',
    isVeg: true,
    tags: ['traditional', 'specialty'],
  },
  {
    foodId: 'FOOD017',
    vendorId: 'VENDOR016',
    vendorName: 'South Indian Express',
    name: 'Rava Dosa',
    category: 'breakfast' as const,
    description: 'Crispy rava dosa with coconut chutney and sambar',
    price: 65,
    location: {
      address: 'Commercial Street, Bangalore',
      lat: 12.9716,
      lng: 77.5946,
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
    },
    availableFrom: '07:00',
    availableUntil: '11:00',
    isAvailable: true,
    rating: 4.5,
    totalReviews: 140,
    totalOrders: 580,
    preparationTime: 10,
    cuisine: 'South Indian',
    isVeg: true,
    tags: ['breakfast', 'quick'],
  },
  {
    foodId: 'FOOD018',
    vendorId: 'VENDOR017',
    vendorName: 'Chinese Corner',
    name: 'Hakka Noodles',
    category: 'lunch' as const,
    description: 'Spicy hakka noodles with vegetables',
    price: 110,
    location: {
      address: 'Park Street, Kolkata',
      lat: 22.5448,
      lng: 88.3426,
      city: 'Kolkata',
      state: 'West Bengal',
      pincode: '700016',
    },
    availableFrom: '12:00',
    availableUntil: '15:00',
    isAvailable: true,
    rating: 4.4,
    totalReviews: 160,
    totalOrders: 650,
    preparationTime: 15,
    cuisine: 'Chinese',
    isVeg: true,
    tags: ['popular', 'quick'],
  },
  {
    foodId: 'FOOD019',
    vendorId: 'VENDOR018',
    vendorName: 'Kerala Breakfast Hub',
    name: 'Appam with Stew',
    category: 'breakfast' as const,
    description: 'Soft appam with coconut milk stew',
    price: 85,
    location: {
      address: 'Fort Kochi, Kochi',
      lat: 9.9312,
      lng: 76.2673,
      city: 'Kochi',
      state: 'Kerala',
      pincode: '682001',
    },
    availableFrom: '07:00',
    availableUntil: '11:00',
    isAvailable: true,
    rating: 4.6,
    totalReviews: 170,
    totalOrders: 680,
    preparationTime: 18,
    cuisine: 'Kerala',
    isVeg: true,
    tags: ['traditional', 'breakfast'],
  },
  {
    foodId: 'FOOD020',
    vendorId: 'VENDOR019',
    vendorName: 'Street Food Paradise',
    name: 'Chole Bhature',
    category: 'breakfast' as const,
    description: 'Spicy chole with fluffy bhature and pickle',
    price: 95,
    location: {
      address: 'Chandni Chowk, Delhi',
      lat: 28.6517,
      lng: 77.2219,
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110006',
    },
    availableFrom: '08:00',
    availableUntil: '12:00',
    isAvailable: true,
    rating: 4.8,
    totalReviews: 350,
    totalOrders: 1400,
    preparationTime: 12,
    cuisine: 'North Indian',
    isVeg: true,
    tags: ['popular', 'street food'],
  },
];

class FoodService {
  /**
   * Initialize sample food data (for development)
   * This ensures mock data is always available
   * @param force - If true, will delete existing data and re-insert
   */
  async initializeSampleData(force: boolean = false): Promise<void> {
    try {
      const count = await Food.countDocuments();
      
      if (force) {
        // Delete all existing food items
        await Food.deleteMany({});
        logger.info('🗑️ Deleted all existing food items');
      }
      
      if (count === 0 || force) {
        // Generate foodId for each item if not present
        const foodsWithIds = SAMPLE_FOOD_DATA.map((food, index) => ({
          ...food,
          foodId: food.foodId || `FOOD${String(index + 1).padStart(3, '0')}`,
        }));
        
        // Use insertMany with ordered: false to skip duplicates
        try {
          await Food.insertMany(foodsWithIds, { ordered: false });
          logger.info(`✅ Initialized ${foodsWithIds.length} sample food items`);
        } catch (error: any) {
          // If there are duplicate key errors, count successful inserts
          if (error.code === 11000) {
            const inserted = foodsWithIds.length - (error.writeErrors?.length || 0);
            logger.info(`✅ Initialized ${inserted} sample food items (${foodsWithIds.length - inserted} already existed)`);
          } else {
            throw error;
          }
        }
      } else {
        logger.info(`ℹ️ Food collection already has ${count} items`);
      }
    } catch (error) {
      logger.error('Error initializing sample food data:', error);
      throw error;
    }
  }

  /**
   * Get food items by category and location
   * For now, returns ALL shops regardless of distance (will add radius filtering later)
   */
  async getFoodByCategoryAndLocation(
    category: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks',
    userLocation: Location,
    _radiusKm: number = 10 // Unused for now, will be used for radius filtering later
  ): Promise<any[]> {
    try {
      const foods = await Food.find({
        category,
        isAvailable: true,
      });

      // Calculate distance for all foods but don't filter (show all for now)
      const nearbyFoods = foods
        .map((food) => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            food.location.lat,
            food.location.lng
          );
          return {
            ...food.toJSON(),
            distance: parseFloat(distance.toFixed(2)),
          };
        })
        // Don't filter by radius - show all shops for now
        .sort((a, b) => a.distance - b.distance);

      return nearbyFoods;
    } catch (error) {
      logger.error('Error getting food by category:', error);
      throw error;
    }
  }

  /**
   * Get food shops along a route (from-to locations)
   * Returns food items grouped by intermediate locations
   * For now, returns ALL shops regardless of distance (will add radius filtering later)
   */
  async getFoodAlongRoute(
    fromLocation: Location,
    toLocation: Location,
    category?: 'tiffin' | 'lunch' | 'dinner' | 'breakfast' | 'snacks'
  ): Promise<any[]> {
    try {
      // Ensure sample data is initialized
      await this.initializeSampleData();
      
      // Build query
      const query: any = {
        isAvailable: true,
      };

      if (category) {
        query.category = category;
      }

      // Get all available foods (no distance filtering for now)
      const foods = await Food.find(query);

      // Calculate distances for all foods (for future use, but don't filter)
      const routeFoods = foods
        .map((food) => {
          // Calculate distance from route midpoint
          const midLat = (fromLocation.lat + toLocation.lat) / 2;
          const midLng = (fromLocation.lng + toLocation.lng) / 2;
          
          const distanceFromMidpoint = calculateDistance(
            midLat,
            midLng,
            food.location.lat,
            food.location.lng
          );

          // Calculate distance from start point
          const distanceFromStart = calculateDistance(
            fromLocation.lat,
            fromLocation.lng,
            food.location.lat,
            food.location.lng
          );

          // Calculate distance from end point
          const distanceFromEnd = calculateDistance(
            toLocation.lat,
            toLocation.lng,
            food.location.lat,
            food.location.lng
          );

          // Use minimum distance (closest point on route)
          const minDistance = Math.min(distanceFromMidpoint, distanceFromStart, distanceFromEnd);

          return {
            ...food.toJSON(),
            distance: parseFloat(minDistance.toFixed(2)),
          };
        })
        // Don't filter by distance - show all shops for now
        .sort((a, b) => a.distance - b.distance);

      // Group by location (city/area)
      const groupedByLocation: Record<string, any[]> = {};
      routeFoods.forEach((food) => {
        const locationKey = food.location.city || food.location.address.split(',')[0] || 'Other';
        if (!groupedByLocation[locationKey]) {
          groupedByLocation[locationKey] = [];
        }
        groupedByLocation[locationKey].push(food);
      });

      // Convert to array format for frontend
      const result = Object.entries(groupedByLocation).map(([locationName, shops]) => ({
        location: {
          name: locationName,
          state: shops[0]?.location?.state || 'Karnataka',
        },
        shops: shops.map((shop) => ({
          id: shop.foodId,
          name: shop.vendorName,
          category: shop.category,
          address: shop.location.address,
          timing: `${shop.availableFrom} - ${shop.availableUntil}`,
          rating: shop.rating.toFixed(1),
          phone: '+91 9876543210', // Mock phone - can be added to Food model later
          price: shop.price,
          description: shop.description,
          preparationTime: shop.preparationTime,
          cuisine: shop.cuisine,
          isVeg: shop.isVeg,
        })),
      }));

      logger.info(`Found ${routeFoods.length} food items along route, grouped into ${result.length} locations`);
      return result;
    } catch (error) {
      logger.error('Error getting food along route:', error);
      throw error;
    }
  }

  /**
   * Get all food items near user location
   * For now, returns ALL shops regardless of distance (will add radius filtering later)
   */
  async getFoodNearLocation(userLocation: Location, _radiusKm: number = 10): Promise<any[]> {
    try {
      const foods = await Food.find({
        isAvailable: true,
      });

      // Calculate distance for all foods but don't filter (show all for now)
      const nearbyFoods = foods
        .map((food) => {
          const distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            food.location.lat,
            food.location.lng
          );
          return {
            ...food.toJSON(),
            distance: parseFloat(distance.toFixed(2)),
          };
        })
        // Don't filter by radius - show all shops for now
        .sort((a, b) => a.distance - b.distance);

      return nearbyFoods;
    } catch (error) {
      logger.error('Error getting food near location:', error);
      throw error;
    }
  }

  /**
   * Get food by ID
   */
  async getFoodById(foodId: string): Promise<any> {
    try {
      const food = await Food.findOne({ foodId });
      if (!food) {
        throw new NotFoundError('Food item not found');
      }
      return food.toJSON();
    } catch (error) {
      logger.error('Error getting food by ID:', error);
      throw error;
    }
  }

  /**
   * Create food order
   */
  async createOrder(data: {
    userId: string;
    foodId: string;
    quantity: number;
    deliveryLocation: Location;
    paymentMethod: string;
  }): Promise<any> {
    try {
      const food = await Food.findOne({ foodId: data.foodId });
      if (!food) {
        throw new NotFoundError('Food item not found');
      }

      if (!food.isAvailable) {
        throw new ConflictError('Food item is not available');
      }

      // Calculate amounts
      const price = food.price;
      const totalAmount = price * data.quantity;
      const deliveryFee = this.calculateDeliveryFee(
        food.location,
        data.deliveryLocation
      );
      const platformFee = calculatePlatformFee(totalAmount);
      const finalAmount = totalAmount + deliveryFee + platformFee;

      // Create order
      const order = await FoodOrder.create({
        userId: data.userId,
        foodId: food.foodId,
        vendorId: food.vendorId,
        quantity: data.quantity,
        price: price,
        totalAmount: totalAmount,
        deliveryFee: deliveryFee,
        platformFee: platformFee,
        finalAmount: finalAmount,
        deliveryLocation: data.deliveryLocation,
        paymentMethod: data.paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
      });

      logger.info(`Food order created: ${order.orderId}`);

      return order.toJSON();
    } catch (error) {
      logger.error('Error creating food order:', error);
      throw error;
    }
  }

  /**
   * Calculate delivery fee based on distance
   */
  private calculateDeliveryFee(vendorLocation: Location, deliveryLocation: Location): number {
    const distance = calculateDistance(
      vendorLocation.lat,
      vendorLocation.lng,
      deliveryLocation.lat,
      deliveryLocation.lng
    );

    // Base fee: ₹20, then ₹5 per km
    if (distance <= 2) {
      return 20;
    }
    return 20 + (distance - 2) * 5;
  }

  /**
   * Get user orders
   */
  async getUserOrders(userId: string): Promise<any[]> {
    try {
      const orders = await FoodOrder.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);

      return orders.map((order) => order.toJSON());
    } catch (error) {
      logger.error('Error getting user orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<any> {
    try {
      const order = await FoodOrder.findOne({ orderId });
      if (!order) {
        throw new NotFoundError('Order not found');
      }
      return order.toJSON();
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Get total count of food items
   */
  async getFoodCount(): Promise<number> {
    try {
      return await Food.countDocuments();
    } catch (error) {
      logger.error('Error getting food count:', error);
      return 0;
    }
  }
}

export const foodService = new FoodService();
export default foodService;
