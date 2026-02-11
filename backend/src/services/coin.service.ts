import CoinWallet, { ICoinWallet, ICoinTransaction } from '../models/CoinWallet';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { PRICING_CONFIG } from '../config/pricing.config';
import logger from '../utils/logger';

class CoinService {
  /**
   * Get or create coin wallet for a user (lazy creation)
   */
  async getOrCreateCoinWallet(userId: string): Promise<ICoinWallet> {
    let wallet = await CoinWallet.findOne({ userId });
    if (!wallet) {
      wallet = await CoinWallet.create({
        coinWalletId: generateUserId('CWL'),
        userId,
        balance: 0,
        totalEarned: 0,
        totalRedeemed: 0,
        transactions: [],
      });
      logger.info(`🪙 Created coin wallet for user ${userId}`);
    }
    return wallet;
  }

  /**
   * Random coins within a range
   */
  randomCoins(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Earn coins — credit to coin wallet
   */
  async earnCoins(
    userId: string,
    amount: number,
    reason: ICoinTransaction['reason'],
    description?: string,
    referenceId?: string
  ): Promise<{ wallet: ICoinWallet; coinsEarned: number }> {
    if (amount <= 0) throw new Error('Coin amount must be positive');

    const wallet = await this.getOrCreateCoinWallet(userId);
    const config = PRICING_CONFIG.COIN;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.EXPIRY_DAYS);

    const transaction: ICoinTransaction = {
      transactionId: generateUserId('CTX'),
      type: 'earn',
      amount,
      reason,
      description: description || `Earned ${amount} coins`,
      referenceId,
      expiresAt,
      createdAt: new Date(),
    };

    wallet.balance += amount;
    wallet.totalEarned += amount;
    wallet.transactions.push(transaction);
    await wallet.save();

    logger.info(`🪙 +${amount} coins to user ${userId} | Reason: ${reason} | Balance: ${wallet.balance}`);
    return { wallet, coinsEarned: amount };
  }

  /**
   * Redeem coins — debit from coin wallet
   */
  async redeemCoins(
    userId: string,
    amount: number,
    reason: ICoinTransaction['reason'],
    description?: string,
    referenceId?: string
  ): Promise<{ wallet: ICoinWallet; coinsRedeemed: number }> {
    if (amount <= 0) throw new Error('Coin amount must be positive');

    const wallet = await this.getOrCreateCoinWallet(userId);

    if (wallet.balance < amount) {
      throw new Error(`Insufficient coins. Available: ${wallet.balance}, Requested: ${amount}`);
    }

    const transaction: ICoinTransaction = {
      transactionId: generateUserId('CTX'),
      type: 'redeem',
      amount,
      reason,
      description: description || `Redeemed ${amount} coins`,
      referenceId,
      createdAt: new Date(),
    };

    wallet.balance -= amount;
    wallet.totalRedeemed += amount;
    wallet.transactions.push(transaction);
    await wallet.save();

    logger.info(`🪙 -${amount} coins from user ${userId} | Reason: ${reason} | Balance: ${wallet.balance}`);
    return { wallet, coinsRedeemed: amount };
  }

  /**
   * Get coin balance
   */
  async getBalance(userId: string): Promise<{
    balance: number;
    totalEarned: number;
    totalRedeemed: number;
    worthInRupees: number;
  }> {
    const wallet = await this.getOrCreateCoinWallet(userId);
    return {
      balance: wallet.balance,
      totalEarned: wallet.totalEarned,
      totalRedeemed: wallet.totalRedeemed,
      worthInRupees: Math.floor(wallet.balance / PRICING_CONFIG.COIN.CONVERSION_RATE * 100) / 100,
    };
  }

  /**
   * Get paginated coin transactions
   */
  async getTransactions(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: ICoinTransaction[]; total: number; page: number; limit: number }> {
    const wallet = await this.getOrCreateCoinWallet(userId);
    const sorted = wallet.transactions.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const total = sorted.length;
    const start = (page - 1) * limit;
    const transactions = sorted.slice(start, start + limit);
    return { transactions, total, page, limit };
  }

  /**
   * Award signup bonus (one-time only)
   */
  async awardSignupBonus(userId: string): Promise<number> {
    const wallet = await this.getOrCreateCoinWallet(userId);

    // Check if already received signup bonus
    const hasSignupBonus = wallet.transactions.some((t) => t.reason === 'signup_bonus');
    if (hasSignupBonus) {
      logger.warn(`🪙 User ${userId} already received signup bonus`);
      return 0;
    }

    const config = PRICING_CONFIG.COIN.SIGNUP_BONUS;
    const coins = this.randomCoins(config.min, config.max);

    await this.earnCoins(userId, coins, 'signup_bonus', `Welcome bonus! You earned ${coins} coins`);
    logger.info(`🪙 Signup bonus: ${coins} coins to user ${userId}`);
    return coins;
  }

  /**
   * Award ride completion coins
   */
  async awardRideCoins(userId: string, bookingId: string): Promise<number> {
    const config = PRICING_CONFIG.COIN.RIDE_BONUS;
    const coins = this.randomCoins(config.min, config.max);

    await this.earnCoins(
      userId,
      coins,
      'ride_completion',
      `Earned ${coins} coins for completing a ride`,
      bookingId
    );
    return coins;
  }

  /**
   * Award milestone badge + coins if eligible
   */
  async awardMilestoneIfEligible(userId: string): Promise<{ badge: string; coins: number } | null> {
    const user = await User.findOne({ userId });
    if (!user) return null;

    const milestones = PRICING_CONFIG.COIN.MILESTONES;
    const userBadgeNames = (user.badges || []).map((b: any) => b.name);

    for (const milestone of milestones) {
      if (user.totalTrips >= milestone.rides && !userBadgeNames.includes(milestone.badge)) {
        // Award badge
        user.badges = user.badges || [];
        user.badges.push({
          name: milestone.badge,
          earnedAt: new Date(),
          milestone: milestone.rides,
        });
        await user.save();

        // Award coins
        await this.earnCoins(
          userId,
          milestone.coins,
          'milestone',
          `Milestone: ${milestone.badge} (${milestone.rides} rides) — ${milestone.coins} bonus coins!`
        );

        logger.info(`🏅 Milestone "${milestone.badge}" awarded to user ${userId} with ${milestone.coins} coins`);
        return { badge: milestone.badge, coins: milestone.coins };
      }
    }

    return null;
  }

  /**
   * Award promo coins based on platform
   */
  async awardPromoCoins(
    userId: string,
    submissionId: string,
    platform: 'instagram_story' | 'instagram_reel' | 'youtube_short'
  ): Promise<number> {
    const config = PRICING_CONFIG.COIN;
    let range: { min: number; max: number };

    if (platform === 'instagram_story') {
      range = config.PROMO_INSTAGRAM_STORY;
    } else {
      range = config.PROMO_REEL_SHORT;
    }

    const coins = this.randomCoins(range.min, range.max);

    await this.earnCoins(
      userId,
      coins,
      'promo_reward',
      `Earned ${coins} coins for ${platform.replace(/_/g, ' ')} promotion`,
      submissionId
    );

    return coins;
  }

  /**
   * Calculate maximum coin discount for a ride
   */
  calculateCoinDiscount(
    coinBalance: number,
    rideAmount: number
  ): { maxCoins: number; maxDiscount: number; discountedAmount: number } {
    const config = PRICING_CONFIG.COIN;
    const maxDiscountPercent = config.MAX_RIDE_DISCOUNT_PERCENT / 100;
    const maxDiscountInr = rideAmount * maxDiscountPercent;
    const maxCoinsForDiscount = Math.floor(maxDiscountInr * config.CONVERSION_RATE);
    const maxCoins = Math.min(coinBalance, maxCoinsForDiscount);
    const maxDiscount = Math.floor((maxCoins / config.CONVERSION_RATE) * 100) / 100;
    const discountedAmount = Math.max(0, rideAmount - maxDiscount);

    return { maxCoins, maxDiscount, discountedAmount };
  }

  /**
   * Get milestones progress for a user
   */
  async getMilestones(userId: string): Promise<{
    totalTrips: number;
    milestones: Array<{
      rides: number;
      badge: string;
      coins: number;
      achieved: boolean;
      achievedAt?: Date;
    }>;
    nextMilestone: { rides: number; badge: string; coins: number; ridesRemaining: number } | null;
  }> {
    const user = await User.findOne({ userId });
    if (!user) throw new Error('User not found');

    const userBadges = user.badges || [];
    const milestones = PRICING_CONFIG.COIN.MILESTONES.map((m) => {
      const earned = userBadges.find((b: any) => b.name === m.badge);
      return {
        rides: m.rides,
        badge: m.badge,
        coins: m.coins,
        achieved: !!earned,
        achievedAt: earned?.earnedAt,
      };
    });

    const next = PRICING_CONFIG.COIN.MILESTONES.find(
      (m) => user.totalTrips < m.rides
    );

    return {
      totalTrips: user.totalTrips,
      milestones,
      nextMilestone: next
        ? { ...next, ridesRemaining: next.rides - user.totalTrips }
        : null,
    };
  }
}

export const coinService = new CoinService();
