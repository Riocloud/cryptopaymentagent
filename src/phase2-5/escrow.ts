/**
 * Phase 2.5: 托管 + 声誉系统
 * 解决信任问题
 */

import { prisma } from '../db/prisma.js';

// ==================== 类型定义 ====================

export interface CreateEscrowParams {
  payerId: string;
  payeeId: string;
  amountUSD: number;
  token: string;
  chain: string;
  paymentId?: string;
  groupId?: string;
}

export interface ReleaseEscrowParams {
  escrowId: string;
  release: boolean; // true = 释放给收款方, false = 退款给付款方
  reason?: string;
}

export interface CreateRatingParams {
  raterType: 'user' | 'agent';
  raterId: string;
  targetType: 'user' | 'agent';
  targetId: string;
  score: number; // 1-5 或 -1/0/1
  reason?: string;
  comment?: string;
  escrowId?: string;
}

export interface AgentBondParams {
  agentId: string;
  amountUSD: number;
}

// ==================== Escrow 托管 ====================

/**
 * 创建托管 (用户付款后锁定)
 */
export async function createEscrow(params: CreateEscrowParams) {
  const escrow = await prisma.escrow.create({
    data: {
      payerId: params.payerId,
      payeeId: params.payeeId,
      amountUSD: params.amountUSD,
      token: params.token,
      chain: params.chain,
      paymentId: params.paymentId || null,
      groupId: params.groupId || null,
      status: 'locked',
      lockedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
    }
  });
  
  return escrow;
}

/**
 * 释放托管
 */
export async function releaseEscrow(params: ReleaseEscrowParams) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: params.escrowId }
  });
  
  if (!escrow) {
    throw new Error('Escrow not found');
  }
  
  if (escrow.status !== 'locked') {
    throw new Error('Escrow is not in locked status');
  }
  
  const newStatus = params.release ? 'released' : 'refunded';
  
  await prisma.escrow.update({
    where: { id: params.escrowId },
    data: {
      status: newStatus,
      releasedAt: new Date()
    }
  });
  
  return {
    escrowId: params.escrowId,
    status: newStatus,
    amountUSD: escrow.amountUSD,
    releasedTo: params.release ? escrow.payeeId : escrow.payerId
  };
}

/**
 * 发起争议
 */
export async function disputeEscrow(escrowId: string, reason: string) {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId }
  });
  
  if (!escrow) {
    throw new Error('Escrow not found');
  }
  
  if (escrow.status !== 'locked') {
    throw new Error('Can only dispute locked escrow');
  }
  
  await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: 'disputed'
    }
  });
  
  return {
    escrowId,
    status: 'disputed',
    message: 'Dispute created. Awaiting arbitration.'
  };
}

/**
 * 仲裁决定 (简化版)
 */
export async function arbitrateEscrow(escrowId: string, winner: 'payer' | 'payee') {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId }
  });
  
  if (!escrow || escrow.status !== 'disputed') {
    throw new Error('Escrow not found or not disputed');
  }
  
  const newStatus = winner === 'payer' ? 'refunded' : 'released';
  
  await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: newStatus,
      releasedAt: new Date()
    }
  });
  
  return {
    escrowId,
    winner: winner === 'payer' ? escrow.payerId : escrow.payeeId,
    amountUSD: escrow.amountUSD
  };
}

/**
 * 获取托管状态
 */
export async function getEscrow(escrowId: string) {
  return prisma.escrow.findUnique({ where: { id: escrowId } });
}

// ==================== 声誉系统 ====================

/**
 * 获取/创建声誉记录
 */
export async function getOrCreateReputation(entityType: string, entityId: string) {
  let reputation = await prisma.reputation.findUnique({
    where: {
      entityType_entityId: { entityType, entityId }
    }
  });
  
  if (!reputation) {
    reputation = await prisma.reputation.create({
      data: {
        entityType,
        entityId,
        score: 50, // 默认 50 分
        totalRatings: 0,
        positiveRatings: 0,
        negativeRatings: 0
      }
    });
  }
  
  return reputation;
}

/**
 * 评分
 */
export async function createRating(params: CreateRatingParams) {
  // 创建评分记录
  const rating = await prisma.rating.create({
    data: {
      raterType: params.raterType,
      raterId: params.raterId,
      targetType: params.targetType,
      targetId: params.targetId,
      score: params.score,
      reason: params.reason || null,
      comment: params.comment || null,
      escrowId: params.escrowId || null
    }
  });
  
  // 更新目标声誉
  await updateReputation(params.targetType, params.targetId, params.score);
  
  return rating;
}

/**
 * 更新声誉分数
 */
async function updateReputation(entityType: string, entityId: string, newScore: number) {
  const reputation = await getOrCreateReputation(entityType, entityId);
  
  const isPositive = newScore >= 4 || newScore > 0;
  const isNegative = newScore <= 2 || newScore < 0;
  
  const updateData: any = {
    totalRatings: { increment: 1 }
  };
  
  if (isPositive) {
    updateData.positiveRatings = { increment: 1 };
  }
  if (isNegative) {
    updateData.negativeRatings = { increment: 1 };
  }
  
  await prisma.reputation.update({
    where: { id: reputation.id },
    data: updateData
  });
  
  // 重新计算分数: (positive - negative) / total * 100 + 50
  const updated = await prisma.reputation.findUnique({ where: { id: reputation.id } });
  if (updated) {
    const ratio = (updated.positiveRatings - updated.negativeRatings) / updated.totalRatings;
    const newScoreVal = Math.round(ratio * 50 + 50); // 0-100
    
    await prisma.reputation.update({
      where: { id: reputation.id },
      data: { score: newScoreVal }
    });
  }
  
  return updated;
}

/**
 * 获取声誉
 */
export async function getReputation(entityType: string, entityId: string) {
  return getOrCreateReputation(entityType, entityId);
}

/**
 * 计算匹配分数 (声誉加权)
 */
export function calculateMatchScore(baseScore: number, reputation: any): number {
  // 声誉权重 30%, 其他因素 70%
  const reputationWeight = 0.3;
  const reputationScore = reputation.score / 100; // 归一化
  
  return baseScore * (1 - reputationWeight) + reputationScore * baseScore * reputationWeight;
}

// ==================== Agent 保证金 ====================

/**
 * 缴纳保证金
 */
export async function depositBond(params: AgentBondParams) {
  const bond = await prisma.agentBond.upsert({
    where: { agentId: params.agentId },
    update: {
      bondAmountUSD: { increment: params.amountUSD },
      status: 'active',
      frozenReason: null,
      frozenAt: null
    },
    create: {
      agentId: params.agentId,
      bondAmountUSD: params.amountUSD,
      status: 'active'
    }
  });
  
  return bond;
}

/**
 * 冻结保证金 (违规处罚)
 */
export async function freezeBond(agentId: string, reason: string) {
  return prisma.agentBond.update({
    where: { agentId },
    data: {
      status: 'frozen',
      frozenReason: reason,
      frozenAt: new Date()
    }
  });
}

/**
 * 获取保证金状态
 */
export async function getBond(agentId: string) {
  let bond = await prisma.agentBond.findUnique({ where: { agentId } });
  
  if (!bond) {
    bond = await prisma.agentBond.create({
      data: {
        agentId,
        bondAmountUSD: 0,
        status: 'active'
      }
    });
  }
  
  return bond;
}

/**
 * 检查 Agent 是否可信 (有保证金 + 声誉好)
 */
export async function isTrustedAgent(agentId: string, minBond: number = 100, minReputation: number = 30): Promise<{trusted: boolean; reason?: string}> {
  const bond = await getBond(agentId);
  
  if (bond.status === 'frozen') {
    return { trusted: false, reason: 'Bond is frozen' };
  }
  
  if (bond.bondAmountUSD < minBond) {
    return { trusted: false, reason: `Insufficient bond: $${bond.bondAmountUSD} < $${minBond}` };
  }
  
  const reputation = await getReputation('agent', agentId);
  if (reputation.score < minReputation) {
    return { trusted: false, reason: `Low reputation: ${reputation.score} < ${minReputation}` };
  }
  
  return { trusted: true };
}
