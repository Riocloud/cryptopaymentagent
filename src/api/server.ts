import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({
  logger: true
});

// 基础错误处理
fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  fastify.log.error(error);
  
  if (error.validation) {
    return reply.status(400).send({
      error: 'Validation Error',
      message: error.message
    });
  }
  
  reply.status(500).send({
    error: 'Internal Server Error',
    message: error.message
  });
});

export { fastify };

// 初始化函数
export async function initApp() {
  // 注册 CORS
  await fastify.register(cors, {
    origin: true,
    credentials: true
  });
  
  // 健康检查
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });
}
