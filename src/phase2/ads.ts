/**
 * Phase 2: Agent 广告让利系统
 * 核心原则: Agent 抽 5%, 用户省 20%
 */

import { prisma } from '../db/prisma.js';

// ==================== 类型定义 ====================

export interface IntentData {
  userId: string;
  type: 'transport' | 'food' | 'shopping' | 'service' | 'custom';
  intent: {
    action: string;
    destination?: { lat: number; lng: number; address?: string };
    time?: string;
    budget?: number;
    params: Record<string, any>;
  };
  preferences?: {
    wantAds: boolean;
    maxWaitMinutes: number;
    maxGroupSize: number;
    minRating?: number;
  };
}

export interface AgentBidData {
  agentId: string;
  intentId: string;
  bidType: 'driver_bid' | 'restaurant_promo' | 'service_offer' | 'affiliate';
  amount: number;
  originalPrice?: number;
  discount?: string;
  eta?: number;
  rating?: number;
  message?: string;
}

export interface AgentData {
  agentId: string;
  name: string;
  capabilities: {
    type: string;
    location?: { lat: number; lng: number; radius: number };
    vehicleType?: string;
    acceptAds: boolean;
    adBudget?: number;
  }[];
  walletAddress: string;
  apiEndpoint: string;
}

// 内存存储 (生产应该用 Redis)
const agentRegistry = new Map<string, any>();
const groups = new Map<string, any>();

// ==================== Intent 操作 ====================

export async function createIntent(data: IntentData) {
  // Auto-create user if not exists
  let user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) {
    user = await prisma.user.create({ data: { id: data.userId } });
  }
  
  const intent = await prisma.userIntent.create({
    data: {
      userId: data.userId,
      type: data.type,
      intent: JSON.stringify(data.intent),
      preferences: data.preferences ? JSON.stringify(data.preferences) : null,
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });
  
  return intent;
}

export async function getIntent(intentId: string) {
  return prisma.userIntent.findUnique({ where: { id: intentId } });
}

export async function cancelIntent(intentId: string) {
  return prisma.userIntent.update({
    where: { id: intentId },
    data: { status: 'cancelled' }
  });
}

// ==================== Agent 操作 ====================

export function registerAgent(agent: AgentData) {
  agentRegistry.set(agent.agentId, {
    ...agent,
    status: 'available',
    registeredAt: new Date()
  });
  return agentRegistry.get(agent.agentId);
}

export function getAgent(agentId: string) {
  return agentRegistry.get(agentId);
}

export function findAvailableAgents(type: string) {
  const agents: any[] = [];
  agentRegistry.forEach(agent => {
    if (agent.status !== 'available') return;
    const hasCapability = agent.capabilities?.some(
      (c: any) => c.type === type || c.type === 'any'
    );
    if (hasCapability) agents.push(agent);
  });
  return agents;
}

export function agentHeartbeat(agentId: string): boolean {
  const agent = agentRegistry.get(agentId);
  if (agent) {
    agent.status = 'available';
    agent.lastHeartbeat = new Date();
    return true;
  }
  return false;
}

// ==================== 广告出价 ====================

export async function createBid(data: AgentBidData) {
  const bid = await prisma.agentBid.create({
    data: {
      agentId: data.agentId,
      intentId: data.intentId,
      bidType: data.bidType,
      amount: data.amount,
      originalPrice: data.originalPrice || null,
      discount: data.discount || null,
      eta: data.eta || null,
      rating: data.rating || null,
      message: data.message || null,
      status: 'pending'
    }
  });
  return bid;
}

export async function getBidsForIntent(intentId: string) {
  return prisma.agentBid.findMany({
    where: { intentId, status: 'pending' },
    orderBy: { amount: 'desc' } // 出价高的排前面
  });
}

// ==================== 让利计算引擎 (核心) ====================

export interface OfferResult {
  bidId: string;
  agentId: string;
  originalPrice: number;
  agentFee: number;      // Agent 抽 5%
  userDiscount: number;  // 让利给用户 (传统抽25% - Agent抽5%)
  userPays: number;
  discountPercent: string;
}

/**
 * 计算让利
 * 传统平台抽 25%, Agent 只抽 5%, 用户省 20%
 */
export function calculateBenefit(bid: any, originalPrice?: number): OfferResult {
  const price = originalPrice || bid.originalPrice || 30; // 默认 $30
  
  // 传统抽成 25%
  const traditionalFee = price * 0.25;
  
  // Agent 抽 5%
  const agentFee = price * 0.05;
  
  // 用户让利 = 传统抽成 - Agent 抽成
  const userDiscount = traditionalFee - agentFee;
  
  return {
    bidId: bid.id,
    agentId: bid.agentId,
    originalPrice: price,
    agentFee,
    userDiscount,
    userPays: price - userDiscount,
    discountPercent: '20%'
  };
}

/**
 * 为 Intent 生成最佳 Offer
 */
export async function generateOffersForIntent(intentId: string): Promise<OfferResult[]> {
  const bids = await getBidsForIntent(intentId);
  const intent = await getIntent(intentId);
  
  if (!intent) return [];
  
  // 解析原始价格
  const intentData = JSON.parse(intent.intent as string);
  const originalPrice = intentData.budget || 30;
  
  // 计算每个出价的让利
  const offers = bids.map(bid => calculateBenefit(bid, originalPrice));
  
  // 按用户省钱排序
  offers.sort((a, b) => b.userDiscount - a.userDiscount);
  
  return offers;
}

// ==================== 群组操作 ====================

export function createGroup(type: string, memberUserIds: string[], intentIds: string[]) {
  const group: any = {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    members: memberUserIds.map((userId, index) => ({
      userId,
      intentId: intentIds[index],
      role: index === 0 ? 'requester' : 'passenger',
      status: 'pending',
      sharePercent: 0,
      shareAmountUSD: 0,
      paid: false
    })),
    adsRevenue: 0,
    totalAmountUSD: 0,
    status: 'forming',
    createdAt: new Date()
  };
  
  // 均分
  group.members.forEach((m: any) => {
    m.sharePercent = 100 / group.members.length;
  });
  
  groups.set(group.id, group);
  return group;
}

export function getGroup(groupId: string) {
  return groups.get(groupId);
}

export function calculateSplitWithAds(groupId: string, totalAmountUSD: number, adsRevenue: number = 0) {
  const group = groups.get(groupId);
  if (!group) throw new Error('Group not found');
  
  group.totalAmountUSD = totalAmountUSD;
  group.adsRevenue = adsRevenue;
  
  // 传统分摊
  const baseShare = totalAmountUSD / group.members.length;
  
  // 广告让利均分
  const discountPerUser = adsRevenue / group.members.length;
  
  // Agent 抽 5%
  const agentFee = totalAmountUSD * 0.05;
  
  const result = {
    perUser: baseShare - discountPerUser,  // 用户实际付的
    agentFee,
    userSavings: discountPerUser,           // 用户省了多少
    totalRevenue: adsRevenue + agentFee     // Agent 总收入
  };
  
  // 更新成员分摊
  group.members.forEach((m: any) => {
    m.shareAmountUSD = result.perUser;
  });
  
  return result;
}

export function confirmGroupMember(groupId: string, userId: string): boolean {
  const group = groups.get(groupId);
  if (!group) return false;
  
  const member = group.members.find((m: any) => m.userId === userId);
  if (member) {
    member.status = 'confirmed';
    
    const allConfirmed = group.members.every((m: any) => m.status === 'confirmed');
    if (allConfirmed) {
      group.status = 'confirmed';
    }
    
    return true;
  }
  
  return false;
}

export { prisma };
