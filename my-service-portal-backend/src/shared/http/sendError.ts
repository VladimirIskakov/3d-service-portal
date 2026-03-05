import type { FastifyReply } from 'fastify';

export const sendError = (
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
) => {
  return reply.code(statusCode).send({
    error: {
      code,
      message,
    },
  });
};

