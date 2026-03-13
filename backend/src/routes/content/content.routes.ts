import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import ContentPage from '../../models/ContentPage';
import { ApiResponse } from '../../types';

export async function contentRoutes(fastify: FastifyInstance) {
  fastify.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const pages = await ContentPage.find({ isPublished: true })
      .select('key title description payload version updatedAt')
      .sort({ key: 1 })
      .lean();

    const response: ApiResponse = {
      success: true,
      message: 'Content pages retrieved successfully',
      data: { pages },
    };
    return reply.status(200).send(response);
  });

  fastify.get('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const { key } = request.params as { key: string };
    const page = await ContentPage.findOne({ key: key.toLowerCase(), isPublished: true }).lean();
    if (!page) {
      return reply.status(404).send({
        success: false,
        message: 'Content page not found',
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Content page retrieved successfully',
      data: page,
    };
    return reply.status(200).send(response);
  });
}

