import Block, { IBlock } from '../models/Block';
import User from '../models/User';
import { generateUserId } from '../utils/helpers';
import { NotFoundError, ConflictError } from '../utils/errors';
import logger from '../utils/logger';

class BlockService {
  /**
   * Block a user
   */
  async blockUser(
    blockerId: string,
    blockedId: string,
    options?: {
      reason?: string;
      reasonCategory?: IBlock['reasonCategory'];
      bookingId?: string;
    }
  ): Promise<IBlock> {
    try {
      // Cannot block yourself
      if (blockerId === blockedId) {
        throw new ConflictError('Cannot block yourself');
      }

      // Check if blocker exists
      const blocker = await User.findOne({ userId: blockerId });
      if (!blocker) {
        throw new NotFoundError('User not found');
      }

      // Check if user to block exists
      const blocked = await User.findOne({ userId: blockedId });
      if (!blocked) {
        throw new NotFoundError('User to block not found');
      }

      // Check if already blocked
      const existingBlock = await Block.findOne({
        blockerId,
        blockedId,
        isActive: true,
      });

      if (existingBlock) {
        throw new ConflictError('User is already blocked');
      }

      // Check if there's an inactive block record and reactivate it
      const inactiveBlock = await Block.findOne({
        blockerId,
        blockedId,
        isActive: false,
      });

      if (inactiveBlock) {
        inactiveBlock.isActive = true;
        inactiveBlock.reason = options?.reason;
        inactiveBlock.reasonCategory = options?.reasonCategory;
        inactiveBlock.bookingId = options?.bookingId;
        await inactiveBlock.save();
        logger.info(`User ${blockerId} re-blocked ${blockedId}`);
        return inactiveBlock;
      }

      // Create new block
      const block = await Block.create({
        blockId: generateUserId('BLK'),
        blockerId,
        blockedId,
        reason: options?.reason,
        reasonCategory: options?.reasonCategory,
        bookingId: options?.bookingId,
        isActive: true,
      });

      logger.info(`User ${blockerId} blocked ${blockedId}`);
      return block;
    } catch (error) {
      logger.error('Error blocking user:', error);
      throw error;
    }
  }

  /**
   * Unblock a user
   */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    try {
      const block = await Block.findOne({
        blockerId,
        blockedId,
        isActive: true,
      });

      if (!block) {
        throw new NotFoundError('Block record not found');
      }

      block.isActive = false;
      await block.save();

      logger.info(`User ${blockerId} unblocked ${blockedId}`);
    } catch (error) {
      logger.error('Error unblocking user:', error);
      throw error;
    }
  }

  /**
   * Get list of users blocked by someone
   */
  async getBlockedUsers(blockerId: string): Promise<
    Array<{
      userId: string;
      name: string;
      photo?: string;
      blockedAt: Date;
      reason?: string;
    }>
  > {
    try {
      const blocks = await Block.find({ blockerId, isActive: true }).sort({
        createdAt: -1,
      });

      const blockedUserIds = blocks.map((b) => b.blockedId);

      if (blockedUserIds.length === 0) {
        return [];
      }

      const users = await User.find({ userId: { $in: blockedUserIds } }).select(
        'userId name profilePhoto'
      );

      const userMap = new Map(users.map((u) => [u.userId, u]));

      return blocks.map((block) => {
        const user = userMap.get(block.blockedId);
        return {
          userId: block.blockedId,
          name: user?.name || 'Unknown User',
          photo: user?.profilePhoto,
          blockedAt: block.createdAt,
          reason: block.reason,
        };
      });
    } catch (error) {
      logger.error('Error getting blocked users:', error);
      throw error;
    }
  }

  /**
   * Check if two users have blocked each other (either direction)
   */
  async isBlocked(userId1: string, userId2: string): Promise<boolean> {
    try {
      const block = await Block.findOne({
        $or: [
          { blockerId: userId1, blockedId: userId2, isActive: true },
          { blockerId: userId2, blockedId: userId1, isActive: true },
        ],
      });

      return !!block;
    } catch (error) {
      logger.error('Error checking block status:', error);
      throw error;
    }
  }

  /**
   * Check if user A has blocked user B
   */
  async hasBlocked(blockerId: string, blockedId: string): Promise<boolean> {
    try {
      const block = await Block.findOne({
        blockerId,
        blockedId,
        isActive: true,
      });

      return !!block;
    } catch (error) {
      logger.error('Error checking if blocked:', error);
      throw error;
    }
  }

  /**
   * Get all user IDs to exclude from queries (blocked by me + who blocked me)
   */
  async getExcludedUserIds(userId: string): Promise<string[]> {
    try {
      // Users I blocked
      const blockedByMe = await Block.find({
        blockerId: userId,
        isActive: true,
      }).select('blockedId');

      // Users who blocked me
      const whoBlockedMe = await Block.find({
        blockedId: userId,
        isActive: true,
      }).select('blockerId');

      const excludedIds = new Set([
        ...blockedByMe.map((b) => b.blockedId),
        ...whoBlockedMe.map((b) => b.blockerId),
      ]);

      return Array.from(excludedIds);
    } catch (error) {
      logger.error('Error getting excluded user IDs:', error);
      throw error;
    }
  }

  /**
   * Get block statistics for admin
   */
  async getBlockStats(): Promise<{
    totalBlocks: number;
    activeBlocks: number;
    byCategory: Record<string, number>;
  }> {
    try {
      const totalBlocks = await Block.countDocuments();
      const activeBlocks = await Block.countDocuments({ isActive: true });

      const categoryAggregation = await Block.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$reasonCategory', count: { $sum: 1 } } },
      ]);

      const byCategory: Record<string, number> = {};
      categoryAggregation.forEach((item) => {
        byCategory[item._id || 'unspecified'] = item.count;
      });

      return { totalBlocks, activeBlocks, byCategory };
    } catch (error) {
      logger.error('Error getting block stats:', error);
      throw error;
    }
  }
}

export const blockService = new BlockService();
export default blockService;
