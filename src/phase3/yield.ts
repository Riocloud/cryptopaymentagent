/**
 * Phase 3: DeFi 收益系统
 * 核心功能: 用户的钱自动生利，Agent 规划投资
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ==================== 类型定义 ====================

export interface YieldConfig {
  userId: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoCompound: boolean;
}

export interface DepositParams {
  userId: string;
  token: string;
  chain: string;
  amount: number;
}

export interface WithdrawParams {
  userId: string;
  amountUSD: number;
  token?: string;
}

export interface RebalanceParams {
  userId: string;
  targetAllocations: Allocation[];
}

export interface Allocation {
  token: string;
  chain: string;
  percent: number; // 0-100
}

// 模拟协议 APY (生产应该从 DeFi Llama 等获取)
const PROTOCOL_YPY: Record<string, number> = {
  // 借贷协议
  'aave-eth-usdc': 0.05,      // 5%
  'aave-arb-usdc': 0.06,      // 6%
  'port-sol-usdc': 0.08,      // 8%
  'radiant-arb-usdc': 0.055,   // 5.5%
  'sky-base-usdc': 0.065,     // 6.5%
  
  // 流动性协议
  'raydium-sol-usdc': 0.15,   // 15%
  'orca-sol-usdt': 0.12,       // 12%
  'uniswap-arb-usdceth': 0.20, // 20%
};

// ==================== 账户操作 ====================

/**
 * 创建/获取收益账户
 */
export async function getOrCreateYieldAccount(userId: string, riskLevel: string = 'moderate') {
  let account = await prisma.yieldAccount.findUnique({ where: { userId } });
  
  if (!account) {
    account = await prisma.yieldAccount.create({
      data: {
        userId,
        riskLevel,
        autoCompound: false,
        totalValueUSD: 0
      }
    });
  }
  
  return account;
}

/**
 * 充值 (存入代币)
 */
export async function deposit(params: DepositParams) {
  const account = await getOrCreateYieldAccount(params.userId);
  
  // 查找最佳协议
  const protocol = findBestProtocol(params.chain, params.token, account.riskLevel);
  const apy = PROTOCOL_YPY[protocol] || 0.05;
  
  // 创建持仓
  const holding = await prisma.yieldHolding.create({
    data: {
      accountId: account.id,
      token: params.token,
      chain: params.chain,
      amount: params.amount,
      protocol,
      apy,
      valueUSD: params.amount // 简化: 1:1 USD
    }
  });
  
  // 更新总资产
  await prisma.yieldAccount.update({
    where: { id: account.id },
    data: {
      totalValueUSD: { increment: params.amount }
    }
  });
  
  return {
    holding,
    apy,
    protocol,
    message: `Deposited ${params.amount} ${params.token} to ${protocol} at ${(apy * 100).toFixed(1)}% APY`
  };
}

/**
 * 提现
 */
export async function withdraw(params: WithdrawParams) {
  const account = await prisma.yieldAccount.findUnique({ 
    where: { userId: params.userId } 
  });
  
  if (!account) {
    throw new Error('Yield account not found');
  }
  
  if (account.totalValueUSD < params.amountUSD) {
    throw new Error('Insufficient balance');
  }
  
  // 查找持仓 (按 APY 从低到高提，保留高收益)
  const holdings = await prisma.yieldHolding.findMany({
    where: { accountId: account.id },
    orderBy: { apy: 'asc' }
  });
  
  let remaining = params.amountUSD;
  const withdrawn: any[] = [];
  
  for (const holding of holdings) {
    if (remaining <= 0) break;
    
    const withdrawFromHolding = Math.min(holding.valueUSD, remaining);
    
    await prisma.yieldHolding.update({
      where: { id: holding.id },
      data: {
        amount: { decrement: withdrawFromHolding },
        valueUSD: { decrement: withdrawFromHolding }
      }
    });
    
    withdrawn.push({ token: holding.token, amount: withdrawFromHolding });
    remaining -= withdrawFromHolding;
  }
  
  // 更新总资产
  await prisma.yieldAccount.update({
    where: { id: account.id },
    data: {
      totalValueUSD: { decrement: params.amountUSD }
    }
  });
  
  return {
    withdrawn,
    remainingBalance: account.totalValueUSD - params.amountUSD
  };
}

// ==================== 策略 ====================

/**
 * 查找最佳协议
 */
function findBestProtocol(chain: string, token: string, riskLevel: string): string {
  const key = `${chain}-${token}`;
  
  // 按风险级别筛选
  let candidates: string[] = [];
  
  if (riskLevel === 'conservative') {
    // 只选借贷协议
    candidates = Object.keys(PROTOCOL_YPY).filter(p => 
      p.includes('aave') || p.includes('port') || p.includes('radiant') || p.includes('sky')
    );
  } else if (riskLevel === 'moderate') {
    candidates = Object.keys(PROTOCOL_YPY);
  } else {
    // aggressive: 包括高收益流动性
    candidates = Object.keys(PROTOCOL_YPY).filter(p => 
      p.includes('raydium') || p.includes('orca') || p.includes('uniswap')
    );
  }
  
  // 按 APY 排序
  candidates.sort((a, b) => PROTOCOL_YPY[b] - PROTOCOL_YPY[a]);
  
  return candidates[0] || 'aave-eth-usdc';
}

/**
 * 获取推荐策略
 */
export function getRecommendedStrategy(riskLevel: string): Allocation[] {
  if (riskLevel === 'conservative') {
    return [
      { token: 'USDC', chain: 'ethereum', percent: 40 },
      { token: 'USDC', chain: 'arbitrum', percent: 30 },
      { token: 'USDC', chain: 'solana', percent: 30 }
    ];
  } else if (riskLevel === 'moderate') {
    return [
      { token: 'USDC', chain: 'ethereum', percent: 30 },
      { token: 'USDC', chain: 'arbitrum', percent: 30 },
      { token: 'USDC', chain: 'solana', percent: 25 },
      { token: 'USDT', chain: 'solana', percent: 15 }
    ];
  } else {
    return [
      { token: 'USDC', chain: 'solana', percent: 40 },
      { token: 'USDC', chain: 'arbitrum', percent: 30 },
      { token: 'USDT', chain: 'solana', percent: 30 }
    ];
  }
}

/**
 * 计算预期收益
 */
export async function calculateProjectedReturns(userId: string, days: number = 30) {
  const account = await prisma.yieldAccount.findUnique({
    where: { userId },
    include: { holdings: true }
  });
  
  if (!account || account.holdings.length === 0) {
    return { totalValueUSD: 0, projectedYield: 0, apy: 0 };
  }
  
  // 计算加权平均 APY
  let totalValue = 0;
  let weightedApy = 0;
  
  for (const h of account.holdings) {
    totalValue += h.valueUSD;
    weightedApy += h.valueUSD * h.apy;
  }
  
  const avgApy = totalValue > 0 ? weightedApy / totalValue : 0;
  const dailyYield = totalValue * (avgApy / 365);
  const projectedYield = dailyYield * days;
  
  return {
    totalValueUSD: totalValue,
    projectedYield: projectedYield,
    apy: avgApy,
    dailyYield,
    breakdown: account.holdings.map(h => ({
      token: h.token,
      chain: h.chain,
      valueUSD: h.valueUSD,
      apy: h.apy,
      dailyYield: h.valueUSD * (h.apy / 365)
    }))
  };
}

/**
 * 自动复投
 */
export async function compound(userId: string) {
  const account = await prisma.yieldAccount.findUnique({
    where: { userId },
    include: { holdings: true }
  });
  
  if (!account || !account.autoCompound) {
    return { message: 'Auto-compound not enabled' };
  }
  
  // 简化的复投逻辑: 把收益再加到本金
  const yields = await prisma.yieldRecord.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    take: 30 // 最近 30 天
  });
  
  const totalYield = yields.reduce((sum, r) => sum + r.amountUSD, 0);
  
  if (totalYield > 0) {
    // 更新持仓
    for (const holding of account.holdings) {
      const share = holding.valueUSD / account.totalValueUSD;
      const yieldShare = totalYield * share;
      
      await prisma.yieldHolding.update({
        where: { id: holding.id },
        data: {
          amount: { increment: yieldShare },
          valueUSD: { increment: yieldShare }
        }
      });
    }
    
    // 记录复投
    await prisma.yieldRecord.create({
      data: {
        accountId: account.id,
        amountUSD: totalYield,
        source: 'compound'
      }
    });
  }
  
  return { 
    compounded: totalYield,
    newTotal: account.totalValueUSD + totalYield
  };
}

/**
 * 切换风险级别
 */
export async function setRiskLevel(userId: string, riskLevel: string) {
  const account = await getOrCreateYieldAccount(userId, riskLevel);
  
  await prisma.yieldAccount.update({
    where: { id: account.id },
    data: { riskLevel }
  });
  
  return { riskLevel, message: `Risk level set to ${riskLevel}` };
}

/**
 * 设置自动复投
 */
export async function setAutoCompound(userId: string, enabled: boolean) {
  const account = await prisma.yieldAccount.findUnique({ where: { userId } });
  
  if (!account) {
    throw new Error('Yield account not found');
  }
  
  await prisma.yieldAccount.update({
    where: { id: account.id },
    data: { autoCompound: enabled }
  });
  
  return { autoCompound: enabled };
}

export { prisma };
