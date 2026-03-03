// Phase 2: 用户意图与 Agent 匹配系统

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 导出 groups 以便在其他模块使用
export const groups = new Map<string, PaymentGroup>();

/**
 * 用户意图类型
 */
export type IntentType = 'transport' | 'food' | 'shopping' | 'service' | 'custom';

export interface UserIntentData {
  id?: string;
  userId: string;
  type: IntentType;
  
  // 意图详情
  intent: {
    action: string;        // "ride", "order_food", "buy"
    destination?: {       // LBS 相关
      lat: number;
      lng: number;
      address?: string;
    };
    time?: string;        // ISO time, "now" 或具体时间
    budget?: number;      // 预算上限
    params: Record<string, any>;
  };
  
  // 匹配偏好
  preferences: {
    maxWaitMinutes: number;
    maxGroupSize: number;
    minRating?: number;
  };
  
  status?: 'pending' | 'matching' | 'matched' | 'completed' | 'cancelled';
}

/**
 * 创建用户意图
 */
export async function createIntent(data: UserIntentData) {
  const intent = await prisma.userIntent.create({
    data: {
      userId: data.userId,
      type: data.type,
      intent: JSON.stringify(data.intent),
      preferences: JSON.stringify(data.preferences),
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30分钟后过期
    }
  });
  
  return intent;
}

/**
 * 匹配意图
 * 返回匹配的意图列表
 */
export async function matchIntents(
  intentId: string,
  radiusMeters: number = 5000,
  maxResults: number = 10
) {
  const intent = await prisma.userIntent.findUnique({
    where: { id: intentId }
  });
  
  if (!intent) {
    throw new Error('Intent not found');
  }
  
  const intentData = JSON.parse(intent.intent as string);
  
  // 查找状态为 pending 且类型相同的意图
  // 实际应该用 PostGIS 做地理空间查询
  const matches = await prisma.userIntent.findMany({
    where: {
      id: { not: intentId },
      type: intent.type,
      status: 'pending',
      // 简化: 暂时不实现地理过滤
    },
    take: maxResults
  });
  
  return matches;
}

/**
 * Agent 能力注册
 */
export interface AgentCapability {
  type: string;
  location?: { lat: number; lng: number; radius: number };
  vehicleType?: string;
  workingHours?: { start: string; end: string };
}

export interface RegisteredAgent {
  agentId: string;
  name: string;
  capabilities: AgentCapability[];
  walletAddress: string;
  apiEndpoint: string;
  status: 'available' | 'busy' | 'offline';
}

// 内存存储 (生产应该用 Redis)
const agentRegistry = new Map<string, RegisteredAgent>();

/**
 * 注册 Agent
 */
export function registerAgent(agent: RegisteredAgent) {
  agentRegistry.set(agent.agentId, {
    ...agent,
    status: 'available'
  });
  return agent;
}

/**
 * 查找可用 Agent
 */
export function findAvailableAgents(
  type: string,
  location?: { lat: number; lng: number }
): RegisteredAgent[] {
  const agents: RegisteredAgent[] = [];
  
  agentRegistry.forEach(agent => {
    if (agent.status !== 'available') return;
    
    const hasCapability = agent.capabilities.some(
      c => c.type === type || c.type === 'any'
    );
    
    if (hasCapability) {
      agents.push(agent);
    }
  });
  
  return agents;
}

/**
 * Agent 心跳
 */
export function agentHeartbeat(agentId: string): boolean {
  const agent = agentRegistry.get(agentId);
  if (agent) {
    agent.status = 'available';
    return true;
  }
  return false;
}

/**
 * 群组管理
 */
export interface PaymentGroup {
  id: string;
  type: string;
  members: GroupMember[];
  totalAmountUSD: number;
  status: 'forming' | 'confirmed' | 'completed' | 'cancelled';
}

export interface GroupMember {
  userId: string;
  role: 'requester' | 'passenger' | 'split_payer';
  intentId: string;
  status: 'pending' | 'confirmed' | 'completed';
  sharePercent: number;
  shareAmountUSD: number;
  paid: boolean;
}

/**
 * 创建群组
 */
export function createGroup(
  type: string,
  memberUserIds: string[]
): PaymentGroup {
  const group: PaymentGroup = {
    id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    members: memberUserIds.map((userId, index) => ({
      userId,
      role: index === 0 ? 'requester' : 'passenger',
      intentId: '',
      status: 'pending',
      sharePercent: 0,
      shareAmountUSD: 0,
      paid: false
    })),
    totalAmountUSD: 0,
    status: 'forming'
  };
  
  // 均分
  group.members.forEach(m => {
    m.sharePercent = 100 / group.members.length;
  });
  
  groups.set(group.id, group);
  return group;
}

/**
 * 计算分摊金额
 */
export function calculateSplit(
  groupId: string,
  totalAmountUSD: number
): PaymentGroup {
  const group = groups.get(groupId);
  if (!group) {
    throw new Error('Group not found');
  }
  
  group.totalAmountUSD = totalAmountUSD;
  
  group.members.forEach(m => {
    m.shareAmountUSD = (totalAmountUSD * m.sharePercent) / 100;
  });
  
  return group;
}

/**
 * 确认加入群组
 */
export function confirmGroupMember(groupId: string, userId: string): boolean {
  const group = groups.get(groupId);
  if (!group) return false;
  
  const member = group.members.find(m => m.userId === userId);
  if (member) {
    member.status = 'confirmed';
    
    // 检查是否全部确认
    const allConfirmed = group.members.every(m => m.status === 'confirmed');
    if (allConfirmed) {
      group.status = 'confirmed';
    }
    
    return true;
  }
  
  return false;
}
