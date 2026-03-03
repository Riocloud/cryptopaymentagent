import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import {
  createIntent,
  getIntent,
  cancelIntent,
  registerAgent,
  getAgent,
  findAvailableAgents,
  agentHeartbeat,
  createBid,
  getBidsForIntent,
  generateOffersForIntent,
  createGroup,
  getGroup,
  calculateSplitWithAds,
  confirmGroupMember,
  calculateBenefit,
  type IntentData,
  type AgentBidData,
  type AgentData,
  type OfferResult
} from '../phase2/ads.js';

// ==================== Intent API ====================

export async function intentRoutes(fastify: FastifyInstance) {
  
  // 创建用户意图
  fastify.post<{
    Body: IntentData;
  }>('/intent', async (request, reply) => {
    const data = request.body;
    
    if (!data.userId || !data.type || !data.intent) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const intent = await createIntent(data);
    
    return {
      id: intent.id,
      type: intent.type,
      status: intent.status,
      preferences: intent.preferences ? JSON.parse(intent.preferences) : null,
      createdAt: intent.createdAt
    };
  });
  
  // 获取意图
  fastify.get<{
    Params: { intentId: string };
  }>('/intent/:intentId', async (request, reply) => {
    const { intentId } = request.params;
    
    const intent = await getIntent(intentId);
    if (!intent) {
      return reply.status(404).send({ error: 'Intent not found' });
    }
    
    return {
      id: intent.id,
      type: intent.type,
      intent: JSON.parse(intent.intent as string),
      preferences: intent.preferences ? JSON.parse(intent.preferences) : null,
      status: intent.status,
      createdAt: intent.createdAt
    };
  });
  
  // 取消意图
  fastify.delete<{
    Params: { intentId: string };
  }>('/intent/:intentId', async (request, reply) => {
    const { intentId } = request.params;
    
    await cancelIntent(intentId);
    
    return { status: 'cancelled' };
  });
  
  // 获取让利 Offer (核心功能)
  fastify.get<{
    Params: { intentId: string };
  }>('/intent/:intentId/offers', async (request, reply) => {
    const { intentId } = request.params;
    
    // 检查 intent 是否存在
    const intent = await getIntent(intentId);
    if (!intent) {
      return reply.status(404).send({ error: 'Intent not found' });
    }
    
    const offers = await generateOffersForIntent(intentId);
    
    if (offers.length === 0) {
      return { 
        offers: [],
        message: 'No ads available for this intent'
      };
    }
    
    // 添加最佳推荐
    const bestOffer = offers[0];
    
    return {
      offers,
      recommended: {
        ...bestOffer,
        message: `Best deal! You save $${bestOffer.userDiscount.toFixed(2)} (20%)`
      },
      summary: {
        traditionalPrice: bestOffer.originalPrice,
        agentFee: `5% ($${bestOffer.agentFee.toFixed(2)})`,
        userSavings: `$${bestOffer.userDiscount.toFixed(2)} (20%)`,
        youPay: `$${bestOffer.userPays.toFixed(2)}`
      }
    };
  });
}

// ==================== Agent API ====================

export async function agentRoutes(fastify: FastifyInstance) {
  
  // 注册 Agent (含广告设置)
  fastify.post<{
    Body: AgentData;
  }>('/agent/register', async (request, reply) => {
    const agent = request.body;
    
    if (!agent.agentId || !agent.name || !agent.capabilities) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const registered = registerAgent(agent);
    
    return { 
      status: 'registered', 
      agentId: registered.agentId,
      acceptAds: agent.capabilities?.some((c: any) => c.acceptAds)
    };
  });
  
  // Agent 心跳
  fastify.post<{
    Params: { agentId: string };
  }>('/agent/:agentId/heartbeat', async (request, reply) => {
    const { agentId } = request.params;
    
    const success = agentHeartbeat(agentId);
    
    return { success, status: success ? 'available' : 'not_found' };
  });
  
  // 查找可用 Agent
  fastify.get<{
    Querystring: { type: string };
  }>('/agent', async (request, reply) => {
    const { type } = request.query;
    
    if (!type) {
      return reply.status(400).send({ error: 'Missing type' });
    }
    
    const agents = findAvailableAgents(type);
    
    return { agents };
  });
  
  // Agent 出价 (广告)
  fastify.post<{
    Body: AgentBidData;
  }>('/agent/bid', async (request, reply) => {
    const data = request.body;
    
    if (!data.agentId || !data.intentId || !data.bidType) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const bid = await createBid(data);
    
    // 计算让利
    const intent = await getIntent(data.intentId);
    const intentData = intent ? JSON.parse(intent.intent as string) : {};
    const originalPrice = intentData.budget || 30;
    const benefit = calculateBenefit(bid, originalPrice);
    
    return {
      bid: {
        id: bid.id,
        status: bid.status,
        amount: bid.amount
      },
      benefit: {
        youSave: benefit.userDiscount,
        discountPercent: benefit.discountPercent,
        agentFee: benefit.agentFee
      }
    };
  });
  
  // 查看 Agent 的出价
  fastify.get<{
    Params: { agentId: string };
    Querystring: { status?: string };
  }>('/agent/:agentId/bids', async (request, reply) => {
    const { agentId } = request.params;
    const { status } = request.query;
    
    const where: any = { agentId };
    if (status) where.status = status;
    
    const bids = await prisma.agentBid.findMany({ where });
    
    return { bids };
  });
}

// ==================== Group API ====================

export async function groupRoutes(fastify: FastifyInstance) {
  
  // 创建群组
  fastify.post<{
    Body: { type: string; memberUserIds: string[]; intentIds: string[] };
  }>('/group', async (request, reply) => {
    const { type, memberUserIds, intentIds } = request.body;
    
    if (!type || !memberUserIds || memberUserIds.length < 2) {
      return reply.status(400).send({ error: 'Invalid group data' });
    }
    
    const group = createGroup(type, memberUserIds, intentIds || memberUserIds);
    
    return { 
      groupId: group.id,
      type: group.type,
      memberCount: group.members.length,
      status: group.status
    };
  });
  
  // 计算分摊 (含让利)
  fastify.post<{
    Params: { groupId: string };
    Body: { totalAmountUSD: number; adsRevenue?: number };
  }>('/group/:groupId/split', async (request, reply) => {
    const { groupId } = request.params;
    const { totalAmountUSD, adsRevenue = 0 } = request.body;
    
    const result = calculateSplitWithAds(groupId, totalAmountUSD, adsRevenue);
    
    return {
      groupId,
      split: result,
      breakdown: {
        traditionalPrice: totalAmountUSD,
        userSavings: `$${result.userSavings.toFixed(2)} (from ads)`,
        agentFee: `$${result.agentFee.toFixed(2)} (5%)`,
        youPay: `$${(result.perUser * (adsRevenue > 0 ? 1 : 0)).toFixed(2)} per user`
      }
    };
  });
  
  // 确认加入群组
  fastify.post<{
    Params: { groupId: string };
    Body: { userId: string };
  }>('/group/:groupId/confirm', async (request, reply) => {
    const { groupId } = request.params;
    const { userId } = request.body;
    
    const success = confirmGroupMember(groupId, userId);
    
    if (!success) {
      return reply.status(404).send({ error: 'Group or member not found' });
    }
    
    const group = getGroup(groupId);
    
    return { 
      success: true,
      status: group?.status,
      memberCount: group?.members?.length
    };
  });
  
  // 获取群组状态
  fastify.get<{
    Params: { groupId: string };
  }>('/group/:groupId', async (request, reply) => {
    const { groupId } = request.params;
    
    const group = getGroup(groupId);
    
    if (!group) {
      return reply.status(404).send({ error: 'Group not found' });
    }
    
    return { 
      groupId: group.id,
      type: group.type,
      status: group.status,
      members: group.members,
      totalAmountUSD: group.totalAmountUSD,
      adsRevenue: group.adsRevenue
    };
  });
}
