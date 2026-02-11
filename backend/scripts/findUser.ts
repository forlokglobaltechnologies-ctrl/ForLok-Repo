/**
 * Script to find user and show wallet details
 * Usage: npx ts-node scripts/findUser.ts
 * 
 * UPDATED: Now shows wallet balance instead of inflow/outflow
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import Wallet from '../src/models/Wallet';
import { generateUserId } from '../src/utils/helpers';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function findUser() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri, {
      dbName: process.env.MONGODB_DB_NAME || 'forlok',
    });

    console.log('Connected to MongoDB');

    // Find user by phone
    const phone = process.argv[2] || '6300043759';
    let user = await User.findOne({ phone });

    if (!user) {
      // Try by name
      user = await User.findOne({ name: phone });
    }

    if (!user) {
      // Try by userId
      user = await User.findOne({ userId: phone });
    }

    // List all users if still not found
    if (!user) {
      console.log('User not found. Listing all users:\n');
      const allUsers = await User.find({}).limit(20).select('userId name phone cancellationCount');
      for (const u of allUsers) {
        const wallet = await Wallet.findOne({ userId: u.userId });
        console.log(`  - ${u.name} (${u.userId}) | Phone: ${u.phone} | Wallet: ₹${wallet?.balance || 0} | Cancellations: ${u.cancellationCount || 0}`);
      }
      await mongoose.disconnect();
      process.exit(1);
    }

    // Get wallet
    let wallet = await Wallet.findOne({ userId: user.userId });

    console.log(`\nFound User:`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Cancellation Count: ${user.cancellationCount || 0}`);
    console.log(`   Wallet Balance: ₹${wallet?.balance || 0}`);
    console.log(`   Can Book Ride: ${(wallet?.balance || 0) >= 100 ? 'YES' : 'NO (need ₹100 min)'}`);

    // Credit wallet with ₹2000 for testing
    if (!wallet) {
      wallet = await Wallet.create({
        walletId: generateUserId('WAL'),
        userId: user.userId,
        balance: 0,
        transactions: [],
      });
    }

    const creditAmount = 2000;
    wallet.balance += creditAmount;
    wallet.totalCredits += creditAmount;
    wallet.transactions.push({
      transactionId: generateUserId('WTX'),
      type: 'credit',
      amount: creditAmount,
      reason: 'top_up',
      description: `Admin top-up of ₹${creditAmount}`,
      balanceAfter: wallet.balance,
      createdAt: new Date(),
    });
    await wallet.save();

    console.log(`\nWallet Updated:`);
    console.log(`   Added: ₹${creditAmount}`);
    console.log(`   New Balance: ₹${wallet.balance}`);

    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

findUser();
