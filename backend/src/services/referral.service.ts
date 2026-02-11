import ReferralCode from '../models/ReferralCode';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { coinService } from './coin.service';
import { PRICING_CONFIG } from '../config/pricing.config';
import logger from '../utils/logger';
import crypto from 'crypto';

class ReferralService {
  /**
   * Generate a unique referral code for a user
   */
  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a referral code
    const existing = await ReferralCode.findOne({ userId });
    if (existing) {
      return existing.code;
    }

    // Generate unique code: FORLOK-XXXXXX
    let code: string;
    let attempts = 0;
    do {
      const random = crypto.randomBytes(3).toString('hex').toUpperCase();
      code = `FORLOK-${random}`;
      attempts++;
    } while ((await ReferralCode.findOne({ code })) && attempts < 10);

    const referral = await ReferralCode.create({
      referralId: generateUserId('REF'),
      userId,
      code,
      usedBy: [],
      totalReferrals: 0,
      totalCoinsEarned: 0,
      isActive: true,
    });

    // Also store on User model for quick access
    await User.findOneAndUpdate({ userId }, { referralCode: code });

    logger.info(`🔗 Referral code created: ${code} for user ${userId}`);
    return referral.code;
  }

  /**
   * Validate and apply a referral code during registration
   */
  async validateAndApplyReferral(
    referralCode: string,
    newUserId: string
  ): Promise<{ valid: boolean; coinsAwarded: number; referrerUserId?: string }> {
    const code = referralCode.toUpperCase().trim();

    const referral = await ReferralCode.findOne({ code, isActive: true });
    if (!referral) {
      logger.warn(`🔗 Invalid referral code: ${code}`);
      return { valid: false, coinsAwarded: 0 };
    }

    // Prevent self-referral
    if (referral.userId === newUserId) {
      logger.warn(`🔗 Self-referral attempt by user ${newUserId}`);
      return { valid: false, coinsAwarded: 0 };
    }

    // Check if new user already used a referral
    const alreadyUsed = referral.usedBy.some((u) => u.userId === newUserId);
    if (alreadyUsed) {
      logger.warn(`🔗 User ${newUserId} already used referral ${code}`);
      return { valid: false, coinsAwarded: 0 };
    }

    // Award coins to referrer
    const config = PRICING_CONFIG.COIN.REFERRAL_BONUS;
    const coins = coinService.randomCoins(config.min, config.max);

    await coinService.earnCoins(
      referral.userId,
      coins,
      'referral',
      `Referral bonus! A friend joined using your code ${code}`,
      newUserId
    );

    // Update referral record
    referral.usedBy.push({ userId: newUserId, registeredAt: new Date() });
    referral.totalReferrals += 1;
    referral.totalCoinsEarned += coins;
    await referral.save();

    // Mark the new user as referred
    await User.findOneAndUpdate({ userId: newUserId }, { referredBy: referral.userId });

    // Send referral_reward notification to the referrer
    try {
      const { notificationService } = await import('./notification.service');
      await notificationService.createNotification({
        userId: referral.userId,
        type: 'referral_reward',
        title: 'Referral Reward!',
        message: `A friend joined using your code ${code}. You earned ${coins} coins!`,
        data: { coins, referralCode: code, newUserId },
      });
    } catch (notifError) {
      logger.error('Failed to send referral notification:', notifError);
    }

    logger.info(`🔗 Referral applied: ${code} | Referrer ${referral.userId} earned ${coins} coins`);
    return { valid: true, coinsAwarded: coins, referrerUserId: referral.userId };
  }

  /**
   * Get referral stats for a user
   */
  async getReferralStats(userId: string): Promise<{
    code: string;
    totalReferrals: number;
    totalCoinsEarned: number;
    referrals: Array<{ userId: string; registeredAt: Date }>;
  }> {
    let referral = await ReferralCode.findOne({ userId });
    if (!referral) {
      // Generate one if not exists
      await this.generateReferralCode(userId);
      referral = await ReferralCode.findOne({ userId });
    }

    return {
      code: referral!.code,
      totalReferrals: referral!.totalReferrals,
      totalCoinsEarned: referral!.totalCoinsEarned,
      referrals: referral!.usedBy,
    };
  }

  /**
   * Get or generate referral code for a user
   */
  async getUserReferralCode(userId: string): Promise<string> {
    const referral = await ReferralCode.findOne({ userId });
    if (referral) return referral.code;
    return await this.generateReferralCode(userId);
  }

  /**
   * Validate referral code (check if valid, without applying)
   */
  async validateCode(code: string): Promise<{ valid: boolean; referrerName?: string }> {
    const referral = await ReferralCode.findOne({
      code: code.toUpperCase().trim(),
      isActive: true,
    });

    if (!referral) return { valid: false };

    const user = await User.findOne({ userId: referral.userId });
    return {
      valid: true,
      referrerName: user?.name || 'Forlok User',
    };
  }
}

export const referralService = new ReferralService();
