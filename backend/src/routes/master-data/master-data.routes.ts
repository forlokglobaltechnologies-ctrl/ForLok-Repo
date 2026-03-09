import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import MasterDataItem from '../../models/MasterDataItem';
import { ApiResponse } from '../../types';

export async function masterDataRoutes(fastify: FastifyInstance) {
  fastify.get('/:type', async (request: FastifyRequest, reply: FastifyReply) => {
    const { type } = request.params as { type: string };
    const items = await MasterDataItem.find({ type: type.toLowerCase(), isActive: true })
      .sort({ sortOrder: 1, label: 1 })
      .lean();

    const response: ApiResponse = {
      success: true,
      message: 'Master data retrieved successfully',
      data: { items },
    };
    return reply.status(200).send(response);
  });
}

