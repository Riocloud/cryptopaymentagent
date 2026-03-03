import { FastifyInstance } from 'fastify';
import {
  getOrCreateYieldAccount,
  deposit,
  withdraw,
  getRecommendedStrategy,
  calculateProjectedReturns,
  compound,
  setRiskLevel,
  setAutoCompound,
  type YieldConfig,
  type DepositParams,
  type WithdrawParams
} from '../phase3/yield.js';

// ==================== Yield API ====================

export async function yieldRoutes(fastify: FastifyInstance) {
  
  // 获取/创建收益账户
  fastify.post<{
    Body: YieldConfig;
  }>('/yield', async (request, reply) => {
    const { userId, riskLevel, autoCompound } = request.body;
    
    if (!userId) {
      return reply.status(400).send({ error: 'Missing userId' });
    }
    
    const account = await getOrCreateYieldAccount(userId, riskLevel || 'moderate');
    
    return {
      id: account.id,
      userId: account.userId,
      riskLevel: account.riskLevel,
      autoCompound: account.autoCompound,
      totalValueUSD: account.totalValueUSD
    };
  });
  
  // 存入代币
  fastify.post<{
    Body: DepositParams;
  }>('/yield/deposit', async (request, reply) => {
    const { userId, token, chain, amount } = request.body;
    
    if (!userId || !token || !chain || !amount) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    try {
      const result = await deposit({ userId, token, chain, amount });
      
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // 提现
  fastify.post<{
    Body: WithdrawParams;
  }>('/yield/withdraw', async (request, reply) => {
    const { userId, amountUSD, token } = request.body;
    
    if (!userId || !amountUSD) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    try {
      const result = await withdraw({ userId, amountUSD, token });
      
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // 获取账户详情
  fastify.get<{
    Params: { userId: string };
  }>('/yield/:userId', async (request, reply) => {
    const { userId } = request.params;
    
    const account = await getOrCreateYieldAccount(userId);
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const holdings = await prisma.yieldHolding.findMany({
      where: { accountId: account.id }
    });
    
    const records = await prisma.yieldRecord.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    return {
      id: account.id,
      userId: account.userId,
      riskLevel: account.riskLevel,
      autoCompound: account.autoCompound,
      totalValueUSD: account.totalValueUSD,
      holdings: holdings.map(h => ({
        token: h.token,
        chain: h.chain,
        amount: h.amount,
        valueUSD: h.valueUSD,
        protocol: h.protocol,
        apy: h.apy
      })),
      recentYields: records.map(r => ({
        amountUSD: r.amountUSD,
        source: r.source,
        date: r.createdAt
      }))
    };
  });
  
  // 获取推荐策略
  fastify.get<{
    Params: { riskLevel: string };
  }>('/yield/strategy/:riskLevel', async (request, reply) => {
    const { riskLevel } = request.params;
    
    const strategy = getRecommendedStrategy(riskLevel);
    
    return {
      riskLevel,
      allocations: strategy,
      message: `Recommended allocation for ${riskLevel} risk profile`
    };
  });
  
  // 计算预期收益
  fastify.get<{
    Params: { userId: string };
    Querystring: { days?: number };
  }>('/yield/projections/:userId', async (request, reply) => {
    const { userId } = request.params;
    const { days = 30 } = request.query;
    
    const projection = await calculateProjectedReturns(userId, Number(days));
    
    return {
      ...projection,
      periodDays: days,
      summary: {
        currentBalance: `$${projection.totalValueUSD.toFixed(2)}`,
        projectedEarnings: `$${projection.projectedYield.toFixed(2)}`,
        effectiveAPY: `${(projection.apy * 100).toFixed(1)}%`
      }
    };
  });
  
  // 复投
  fastify.post<{
    Body: { userId: string };
  }>('/yield/compound', async (request, reply) => {
    const { userId } = request.body;
    
    try {
      const result = await compound(userId);
      return result;
    } catch (error: any) {
      return reply.status(500).send({ error: error.message });
    }
  });
  
  // 设置风险级别
  fastify.post<{
    Body: { userId: string; riskLevel: string };
  }>('/yield/risk', async (request, reply) => {
    const { userId, riskLevel } = request.body;
    
    const validLevels = ['conservative', 'moderate', 'aggressive'];
    if (!validLevels.includes(riskLevel)) {
      return reply.status(400).send({ error: 'Invalid risk level' });
    }
    
    const result = await setRiskLevel(userId, riskLevel);
    return result;
  });
  
  // 设置自动复投
  fastify.post<{
    Body: { userId: string; enabled: boolean };
  }>('/yield/auto-compound', async (request, reply) => {
    const { userId, enabled } = request.body;
    
    const result = await setAutoCompound(userId, enabled);
    return result;
  });
}
