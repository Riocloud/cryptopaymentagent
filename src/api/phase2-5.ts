import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  createEscrow,
  releaseEscrow,
  disputeEscrow,
  arbitrateEscrow,
  getEscrow,
  createRating,
  getReputation,
  depositBond,
  freezeBond,
  getBond,
  isTrustedAgent,
  calculateMatchScore,
  type CreateEscrowParams,
  type ReleaseEscrowParams,
  type CreateRatingParams,
  type AgentBondParams
} from '../phase2-5/escrow.js';

// ==================== Escrow API ====================

export async function escrowRoutes(fastify: FastifyInstance) {
  
  // 创建托管
  fastify.post<{
    Body: CreateEscrowParams;
  }>('/escrow', async (request, reply) => {
    const params = request.body;
    
    if (!params.payerId || !params.payeeId || !params.amountUSD) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const escrow = await createEscrow(params);
    
    return {
      escrowId: escrow.id,
      status: escrow.status,
      amountUSD: escrow.amountUSD,
      message: `托管已创建，金额 $${escrow.amountUSD} 已锁定`
    };
  });
  
  // 获取托管状态
  fastify.get<{
    Params: { escrowId: string };
  }>('/escrow/:escrowId', async (request, reply) => {
    const { escrowId } = request.params;
    
    const escrow = await getEscrow(escrowId);
    if (!escrow) {
      return reply.status(404).send({ error: 'Escrow not found' });
    }
    
    return { escrow };
  });
  
  // 释放托管 (完成交易)
  fastify.post<{
    Body: { escrowId: string; release: boolean; reason?: string };
  }>('/escrow/release', async (request, reply) => {
    const { escrowId, release, reason } = request.body;
    
    try {
      const result = await releaseEscrow({ escrowId, release, reason });
      
      return {
        ...result,
        message: release ? '已释放给收款方' : '已退款给付款方'
      };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
  
  // 发起争议
  fastify.post<{
    Body: { escrowId: string; reason: string };
  }>('/escrow/dispute', async (request, reply) => {
    const { escrowId, reason } = request.body;
    
    try {
      const result = await disputeEscrow(escrowId, reason);
      return result;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
  
  // 仲裁决定 (简化: 管理员调用)
  fastify.post<{
    Body: { escrowId: string; winner: 'payer' | 'payee' };
  }>('/escrow/arbitrate', async (request, reply) => {
    const { escrowId, winner } = request.body;
    
    try {
      const result = await arbitrateEscrow(escrowId, winner);
      return {
        ...result,
        message: `仲裁完成，$ ${result.amountUSD} 判给 ${result.winner}`
      };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
  
  // 获取用户的托管列表
  fastify.get<{
    Querystring: { userId: string; role?: string };
  }>('/escrow', async (request, reply) => {
    const { userId, role } = request.query;
    
    const where: any = {};
    if (role === 'payer') {
      where.payerId = userId;
    } else if (role === 'payee') {
      where.payeeId = userId;
    } else {
      where.OR = [{ payerId: userId }, { payeeId: userId }];
    }
    
    const escrows = await prisma.escrow.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    return { escrows };
  });
}

// ==================== Reputation API ====================

export async function reputationRoutes(fastify: FastifyInstance) {
  
  // 评分
  fastify.post<{
    Body: CreateRatingParams;
  }>('/rating', async (request, reply) => {
    const params = request.body;
    
    if (!params.raterId || !params.targetId || params.score === undefined) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    // 验证分数范围
    if (params.score < -1 || params.score > 5) {
      return reply.status(400).send({ error: 'Score must be between -1 and 5' });
    }
    
    const rating = await createRating(params);
    
    // 获取更新后的声誉
    const reputation = await getReputation(params.targetType, params.targetId);
    
    return {
      ratingId: rating.id,
      score: rating.score,
      reputation: {
        score: reputation.score,
        totalRatings: reputation.totalRatings
      }
    };
  });
  
  // 获取声誉
  fastify.get<{
    Params: { entityType: string; entityId: string };
  }>('/reputation/:entityType/:entityId', async (request, reply) => {
    const { entityType, entityId } = request.params;
    
    const reputation = await getReputation(entityType, entityId);
    
    return {
      entityType,
      entityId,
      score: reputation.score,
      totalRatings: reputation.totalRatings,
      positiveRatings: reputation.positiveRatings,
      negativeRatings: reputation.negativeRatings,
      disputes: reputation.disputes,
      level: getReputationLevel(reputation.score)
    };
  });
  
  // 计算匹配分数 (声誉加权)
  fastify.get<{
    Querystring: { baseScore: number; entityType: string; entityId: string };
  }>('/reputation/match-score', async (request, reply) => {
    const { baseScore, entityType, entityId } = request.query;
    
    const reputation = await getReputation(entityType, entityId);
    const matchScore = calculateMatchScore(Number(baseScore), reputation);
    
    return {
      baseScore: Number(baseScore),
      reputationScore: reputation.score,
      matchScore: Math.round(matchScore)
    };
  });
}

// ==================== Agent Bond API ====================

export async function bondRoutes(fastify: FastifyInstance) {
  
  // 缴纳保证金
  fastify.post<{
    Body: AgentBondParams;
  }>('/bond/deposit', async (request, reply) => {
    const params = request.body;
    
    if (!params.agentId || !params.amountUSD) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const bond = await depositBond(params);
    
    return {
      agentId: bond.agentId,
      bondAmountUSD: bond.bondAmountUSD,
      status: bond.status,
      message: `保证金已缴纳: $${bond.bondAmountUSD}`
    };
  });
  
  // 获取保证金
  fastify.get<{
    Params: { agentId: string };
  }>('/bond/:agentId', async (request, reply) => {
    const { agentId } = request.params;
    
    const bond = await getBond(agentId);
    
    return {
      agentId: bond.agentId,
      bondAmountUSD: bond.bondAmountUSD,
      status: bond.status,
      frozenReason: bond.frozenReason
    };
  });
  
  // 检查 Agent 是否可信
  fastify.get<{
    Params: { agentId: string };
    Querystring: { minBond?: number; minReputation?: number };
  }>('/bond/:agentId/trusted', async (request, reply) => {
    const { agentId } = request.params;
    const { minBond = 100, minReputation = 30 } = request.query;
    
    const result = await isTrustedAgent(agentId, Number(minBond), Number(minReputation));
    
    return {
      agentId,
      ...result,
      requirements: {
        minBond: Number(minBond),
        minReputation: Number(minReputation)
      }
    };
  });
  
  // 冻结保证金 (管理员)
  fastify.post<{
    Body: { agentId: string; reason: string };
  }>('/bond/freeze', async (request, reply) => {
    const { agentId, reason } = request.body;
    
    const bond = await freezeBond(agentId, reason);
    
    return {
      agentId: bond.agentId,
      status: bond.status,
      frozenReason: bond.frozenReason,
      message: `保证金已冻结: ${reason}`
    };
  });
}

// ==================== 辅助函数 ====================

function getReputationLevel(score: number): string {
  if (score >= 90) return '⭐⭐⭐⭐⭐ 超级可信';
  if (score >= 70) return '⭐⭐⭐⭐ 非常可信';
  if (score >= 50) return '⭐⭐⭐ 可信';
  if (score >= 30) return '⭐⭐ 一般';
  return '⭐ 待改进';
}
