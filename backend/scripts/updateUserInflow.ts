/**
 * Script to update user wallet balance (credit wallet)
 * Usage: npx ts-node scripts/updateUserInflow.ts
 * 
 * UPDATED: Now uses centralized wallet instead of inflowAmount
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/User';
import Wallet from '../src/models/Wallet';
import { generateUserId } from '../src/utils/helpers';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function updateUserWallet() {
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

    // Find user by phone or name
    const phone = '6300043759';
    const username = 'Venkyiiit2021';

    let user = await User.findOne({ phone });
    if (!user) {
      user = await User.findOne({ name: username });
    }

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log(`\nFound User:`);
    console.log(`   User ID: ${user.userId}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Cancellation Count: ${user.cancellationCount || 0}`);

    // Get or create wallet
    let wallet = await Wallet.findOne({ userId: user.userId });
    if (!wallet) {
      wallet = await Wallet.create({
        walletId: generateUserId('WAL'),
        userId: user.userId,
        balance: 0,
        transactions: [],
      });
      console.log('   Created new wallet');
    }

    console.log(`   Current Wallet Balance: ₹${wallet.balance}`);

    // Credit wallet
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
    console.log('\nDone');
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

updateUserWallet();
