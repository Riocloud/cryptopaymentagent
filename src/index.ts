import { fastify, initApp } from './api/server';
import { exchangeRoutes } from './api/exchange';
import { paymentRoutes } from './api/payment';
import { walletRoutes } from './api/wallet';
import { routerRoutes } from './api/router';
import { intentRoutes, agentRoutes, groupRoutes } from './api/phase2-ads';
import { yieldRoutes } from './api/phase3-yield';

// 注册路由
fastify.register(exchangeRoutes, { prefix: '/api/v1' });
fastify.register(paymentRoutes, { prefix: '/api/v1' });
fastify.register(walletRoutes, { prefix: '/api/v1' });
fastify.register(routerRoutes, { prefix: '/api/v1' });

// Phase 2: Intent & Matching & Ads
fastify.register(intentRoutes, { prefix: '/api/v1' });
fastify.register(agentRoutes, { prefix: '/api/v1' });
fastify.register(groupRoutes, { prefix: '/api/v1' });

// Phase 3: Yield (DeFi 收益)
fastify.register(yieldRoutes, { prefix: '/api/v1' });

// 启动服务
const start = async () => {
  try {
    await initApp();
    
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Server running on http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
