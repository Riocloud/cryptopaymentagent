import { FastifyInstance } from 'fastify';
import { RouterEngine, PaymentRouteRequest } from '../router/engine.js';

const router = new RouterEngine();

export async function routerRoutes(fastify: FastifyInstance) {
  
  // 获取支付路由
  fastify.post<{
    Body: PaymentRouteRequest;
  }>('/router/routes', async (request, reply) => {
    const { amountUSD, fromChain, toChain, token, urgency } = request.body;
    
    // 验证链
    if (!fromChain || !toChain) {
      return reply.status(400).send({ error: 'Missing fromChain or toChain' });
    }
    
    try {
      const routes = await router.getRoutes({
        amountUSD,
        fromChain,
        toChain,
        token,
        urgency
      });
      
      return { routes };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // 获取支持链列表
  fastify.get('/router/chains', async () => {
    const { CHAIN_CONFIG } = await import('../router/engine.js');
    
    const chains = Object.entries(CHAIN_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      tokens: config.tokens,
      gasEstimateUSD: config.gasEstimate
    }));
    
    return { chains };
  });
}
