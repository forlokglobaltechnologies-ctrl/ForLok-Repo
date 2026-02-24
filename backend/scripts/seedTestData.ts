/**
 * Seed script: 15 vehicles + 10 connected pooling offers for testing
 *
 * Creates under the user "Venkatesh" (looked up by name):
 *   - 5 cars, 5 bikes, 5 scooties
 *   - 5 pooling offers: Vijayawada → Ongole
 *   - 5 pooling offers: Ongole → Gudur
 *
 * Usage:  npx ts-node scripts/seedTestData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Vehicle from '../src/models/Vehicle';
import PoolingOffer from '../src/models/PoolingOffer';
import User from '../src/models/User';
import { generateUserId } from '../src/utils/helpers';

dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Realistic coordinates ───────────────────────────────────────
const VIJ = { address: 'Vijayawada, Andhra Pradesh', lat: 16.5062, lng: 80.6480, city: 'Vijayawada', state: 'Andhra Pradesh' };
const ONG = { address: 'Ongole, Andhra Pradesh',     lat: 15.5057, lng: 80.0499, city: 'Ongole',      state: 'Andhra Pradesh' };
const GDR = { address: 'Gudur, Andhra Pradesh',      lat: 14.1487, lng: 79.8537, city: 'Gudur',       state: 'Andhra Pradesh' };

// Waypoints along Vij → Ongole (NH-16)
const VIJ_ONG_WAYPOINTS = [
  { address: 'Chilakaluripet', lat: 16.0899, lng: 80.1672, city: 'Chilakaluripet', order: 1 },
  { address: 'Bapatla',        lat: 15.9044, lng: 80.4675, city: 'Bapatla',        order: 2 },
  { address: 'Addanki',        lat: 15.8113, lng: 79.9730, city: 'Addanki',        order: 3 },
];

// Waypoints along Ongole → Gudur (NH-16)
const ONG_GDR_WAYPOINTS = [
  { address: 'Kavali',            lat: 14.9133, lng: 79.9939, city: 'Kavali',            order: 1 },
  { address: 'Singarayakonda',    lat: 15.2300, lng: 80.0270, city: 'Singarayakonda',    order: 2 },
  { address: 'Nellore',           lat: 14.4426, lng: 79.9865, city: 'Nellore',           order: 3 },
];

// Simplified polyline (a few key points)
const VIJ_ONG_POLYLINE = [
  { lat: 16.5062, lng: 80.6480, index: 0 },
  { lat: 16.3000, lng: 80.4300, index: 1 },
  { lat: 16.0899, lng: 80.1672, index: 2 },
  { lat: 15.9044, lng: 80.4675, index: 3 },
  { lat: 15.8113, lng: 79.9730, index: 4 },
  { lat: 15.5057, lng: 80.0499, index: 5 },
];

const ONG_GDR_POLYLINE = [
  { lat: 15.5057, lng: 80.0499, index: 0 },
  { lat: 15.2300, lng: 80.0270, index: 1 },
  { lat: 14.9133, lng: 79.9939, index: 2 },
  { lat: 14.4426, lng: 79.9865, index: 3 },
  { lat: 14.1487, lng: 79.8537, index: 4 },
];

// ── Vehicle data ────────────────────────────────────────────────
const CARS = [
  { brand: 'Maruti Suzuki', model: 'Swift',      color: 'White',  number: 'AP39TA0001', fuel: 'Petrol',   trans: 'Manual',    seats: 4, year: 2022 },
  { brand: 'Hyundai',       model: 'i20',         color: 'Red',    number: 'AP39TA0002', fuel: 'Petrol',   trans: 'Automatic', seats: 4, year: 2023 },
  { brand: 'Tata',          model: 'Nexon',       color: 'Blue',   number: 'AP39TA0003', fuel: 'Diesel',   trans: 'Manual',    seats: 4, year: 2023 },
  { brand: 'Kia',           model: 'Seltos',      color: 'Silver', number: 'AP39TA0004', fuel: 'Petrol',   trans: 'Automatic', seats: 4, year: 2024 },
  { brand: 'Honda',         model: 'City',        color: 'Black',  number: 'AP39TA0005', fuel: 'Petrol',   trans: 'Manual',    seats: 4, year: 2022 },
];

const BIKES = [
  { brand: 'Royal Enfield', model: 'Classic 350', color: 'Black',   number: 'AP39TB0001', fuel: 'Petrol', trans: 'Manual', seats: 1, year: 2023 },
  { brand: 'Bajaj',         model: 'Pulsar 150',  color: 'Blue',    number: 'AP39TB0002', fuel: 'Petrol', trans: 'Manual', seats: 1, year: 2022 },
  { brand: 'Honda',         model: 'Shine',       color: 'Red',     number: 'AP39TB0003', fuel: 'Petrol', trans: 'Manual', seats: 1, year: 2023 },
  { brand: 'TVS',           model: 'Apache 200',  color: 'White',   number: 'AP39TB0004', fuel: 'Petrol', trans: 'Manual', seats: 1, year: 2024 },
  { brand: 'Yamaha',        model: 'FZ-S',        color: 'Grey',    number: 'AP39TB0005', fuel: 'Petrol', trans: 'Manual', seats: 1, year: 2023 },
];

const SCOOTIES = [
  { brand: 'Honda',   model: 'Activa 6G',    color: 'White',  number: 'AP39TC0001', fuel: 'Petrol',   trans: 'Automatic', seats: 1, year: 2023 },
  { brand: 'TVS',     model: 'Jupiter',      color: 'Blue',   number: 'AP39TC0002', fuel: 'Petrol',   trans: 'Automatic', seats: 1, year: 2022 },
  { brand: 'Suzuki',  model: 'Access 125',   color: 'Grey',   number: 'AP39TC0003', fuel: 'Petrol',   trans: 'Automatic', seats: 1, year: 2023 },
  { brand: 'Ather',   model: '450X',         color: 'Green',  number: 'AP39TC0004', fuel: 'Electric', trans: 'Automatic', seats: 1, year: 2024 },
  { brand: 'Ola',     model: 'S1 Pro',       color: 'Black',  number: 'AP39TC0005', fuel: 'Electric', trans: 'Automatic', seats: 1, year: 2024 },
];

// ── Helpers ─────────────────────────────────────────────────────
function futureDate(daysAhead: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function cleanupOldSeeded() {
  const nums = [
    ...CARS.map(c => c.number),
    ...BIKES.map(b => b.number),
    ...SCOOTIES.map(s => s.number),
  ];
  const delOffers = await PoolingOffer.deleteMany({ 'vehicle.number': { $in: nums } });
  if (delOffers.deletedCount) console.log(`   🗑️  Deleted ${delOffers.deletedCount} old seeded offers`);
}

function timeStr(hour: number): string {
  const hh = hour.toString().padStart(2, '0');
  return `${hh}:00`;
}

// ── Main ────────────────────────────────────────────────────────
async function seed() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { console.error('MONGODB_URI not set'); process.exit(1); }

  await mongoose.connect(mongoUri, { dbName: process.env.MONGODB_DB_NAME || 'forlok' });
  console.log('✅ Connected to MongoDB\n');

  // Find Venkatesh
  const user = await User.findOne({ name: { $regex: /venkatesh/i } });
  if (!user) {
    console.error('❌ User "Venkatesh" not found. Listing all users:');
    const all = await User.find({}).limit(20).select('userId name phone');
    all.forEach(u => console.log(`   ${u.name} (${u.userId}) — ${u.phone}`));
    await mongoose.disconnect();
    process.exit(1);
  }
  const driverId = user.userId;
  const driverName = user.name;
  console.log(`👤 Driver: ${driverName} (${driverId})\n`);

  // ── 0. Cleanup previous seeded offers ─────────────────────────
  console.log('🗑️  Cleaning up old seeded offers...');
  await cleanupOldSeeded();

  // ── 1. Seed Vehicles ─────────────────────────────────────────
  const createdVehicles: { type: string; brand: string; number: string }[] = [];

  const makeVehicle = async (v: any, type: 'car' | 'bike' | 'scooty') => {
    const exists = await Vehicle.findOne({ number: v.number });
    if (exists) {
      console.log(`   ⏩ ${type} ${v.number} already exists, skipping`);
      createdVehicles.push({ type, brand: `${v.brand} ${v.model}`, number: v.number });
      return;
    }
    await Vehicle.create({
      vehicleId: generateUserId('VEH'),
      userId: driverId,
      type,
      brand: v.brand,
      vehicleModel: v.model,
      year: v.year,
      color: v.color,
      number: v.number,
      plateType: 'white',
      seats: v.seats,
      fuelType: v.fuel as any,
      transmission: v.trans as any,
      photos: {},
      documents: {},
      status: 'active',
      isVerified: true,
    });
    createdVehicles.push({ type, brand: `${v.brand} ${v.model}`, number: v.number });
    console.log(`   ✅ Created ${type}: ${v.brand} ${v.model} (${v.number})`);
  };

  console.log('🚗 Creating 5 Cars...');
  for (const c of CARS) await makeVehicle(c, 'car');

  console.log('🏍️  Creating 5 Bikes...');
  for (const b of BIKES) await makeVehicle(b, 'bike');

  console.log('🛵 Creating 5 Scooties...');
  for (const s of SCOOTIES) await makeVehicle(s, 'scooty');

  console.log(`\n   Total vehicles: ${createdVehicles.length}\n`);

  // ── 2. Seed Pooling Offers ────────────────────────────────────
  console.log('📍 Creating 5 Pooling Offers: Vijayawada → Ongole...');
  const vijOngOfferIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const veh = createdVehicles[i]; // use cars for first 5
    const offerId = generateUserId('POL');
    const depHour = 6 + i * 2; // 06:00, 08:00, 10:00, 12:00, 14:00

    await PoolingOffer.create({
      offerId,
      driverId,
      driverName,
      driverGender: 'Male',
      rating: 4.5,
      totalReviews: 10 + i,
      route: {
        from: VIJ,
        to: ONG,
        waypoints: VIJ_ONG_WAYPOINTS,
        distance: 280,
        duration: 240,
        polyline: VIJ_ONG_POLYLINE,
      },
      date: futureDate(0, depHour),
      time: timeStr(depHour),
      vehicle: {
        type: veh.type as any,
        brand: veh.brand,
        number: veh.number,
        photos: [],
      },
      availableSeats: veh.type === 'car' ? 3 : 1,
      totalSeats: veh.type === 'car' ? 4 : 1,
      notes: `Vij→Ong ride #${i + 1}`,
      status: 'active',
      passengers: [],
      views: 0,
      bookingRequests: 0,
    });
    vijOngOfferIds.push(offerId);
    console.log(`   ✅ ${offerId} — departs ${timeStr(depHour)} — ${veh.brand} (${veh.number})`);
  }

  console.log('\n📍 Creating 5 Pooling Offers: Ongole → Gudur...');
  const ongGdrOfferIds: string[] = [];
  for (let i = 0; i < 5; i++) {
    const vehIdx = 5 + i; // use bikes for next 5
    const veh = createdVehicles[vehIdx];
    const offerId = generateUserId('POL');
    const depHour = 10 + i * 2; // 10:00, 12:00, 14:00, 16:00, 18:00

    await PoolingOffer.create({
      offerId,
      driverId,
      driverName,
      driverGender: 'Male',
      rating: 4.5,
      totalReviews: 8 + i,
      route: {
        from: ONG,
        to: GDR,
        waypoints: ONG_GDR_WAYPOINTS,
        distance: 185,
        duration: 180,
        polyline: ONG_GDR_POLYLINE,
      },
      date: futureDate(0, depHour),
      time: timeStr(depHour),
      vehicle: {
        type: veh.type as any,
        brand: veh.brand,
        number: veh.number,
        photos: [],
      },
      availableSeats: 1,
      totalSeats: 1,
      notes: `Ong→Gdr ride #${i + 1}`,
      status: 'active',
      passengers: [],
      views: 0,
      bookingRequests: 0,
    });
    ongGdrOfferIds.push(offerId);
    console.log(`   ✅ ${offerId} — departs ${timeStr(depHour)} — ${veh.brand} (${veh.number})`);
  }

  // ── Summary ───────────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════');
  console.log('  SEED COMPLETE');
  console.log('════════════════════════════════════════════');
  console.log(`  Driver      : ${driverName} (${driverId})`);
  console.log(`  Vehicles    : 5 cars + 5 bikes + 5 scooties = 15`);
  console.log(`  Vij → Ong   : ${vijOngOfferIds.length} offers`);
  console.log(`  Ong → Gudur : ${ongGdrOfferIds.length} offers`);
  console.log('════════════════════════════════════════════');
  console.log('\n🧪 Test connected ride: search Bapatla → Gudur');
  console.log('   Leg 1 should match Vij → Ong (Bapatla is a waypoint)');
  console.log('   Leg 2 should match Ong → Gudur\n');

  await mongoose.disconnect();
  console.log('Done!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
