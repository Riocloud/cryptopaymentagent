import { FastifyInstance } from 'fastify';
import {
  createIntent,
  matchIntents,
  registerAgent,
  findAvailableAgents,
  agentHeartbeat,
  createGroup,
  calculateSplit,
  confirmGroupMember,
  type UserIntentData,
  type RegisteredAgent
} from '../phase2/matching.js';

export async function intentRoutes(fastify: FastifyInstance) {
  
  // 创建用户意图
  fastify.post<{
    Body: UserIntentData;
  }>('/intent', async (request, reply) => {
    const data = request.body;
    
    if (!data.userId || !data.type || !data.intent) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const intent = await createIntent(data);
    
    return {
      id: intent.id,
      status: intent.status,
      createdAt: intent.createdAt
    };
  });
  
  // 获取意图状态
  fastify.get<{
    Params: { intentId: string };
  }>('/intent/:intentId', async (request, reply) => {
    const { intentId } = request.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const intent = await prisma.userIntent.findUnique({
      where: { id: intentId }
    });
    
    if (!intent) {
      return reply.status(404).send({ error: 'Intent not found' });
    }
    
    return {
      id: intent.id,
      type: intent.type,
      intent: JSON.parse(intent.intent as string),
      status: intent.status,
      createdAt: intent.createdAt
    };
  });
  
  // 匹配意图
  fastify.post<{
    Params: { intentId: string };
    Querystring: { radius?: number; limit?: number };
  }>('/intent/:intentId/match', async (request, reply) => {
    const { intentId } = request.params;
    const { radius = 5000, limit = 10 } = request.query;
    
    const matches = await matchIntents(intentId, radius, limit);
    
    return { matches };
  });
  
  // 取消意图
  fastify.delete<{
    Params: { intentId: string };
  }>('/intent/:intentId', async (request, reply) => {
    const { intentId } = request.params;
    
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.userIntent.update({
      where: { id: intentId },
      data: { status: 'cancelled' }
    });
    
    return { status: 'cancelled' };
  });
}

export async function agentRoutes(fastify: FastifyInstance) {
  
  // 注册 Agent
  fastify.post<{
    Body: RegisteredAgent;
  }>('/agent/register', async (request, reply) => {
    const agent = request.body;
    
    if (!agent.agentId || !agent.name || !agent.capabilities) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    const registered = registerAgent(agent);
    
    return { status: 'registered', agent: registered };
  });
  
  // Agent 心跳
  fastify.post<{
    Params: { agentId: string };
  }>('/agent/:agentId/heartbeat', async (request, reply) => {
    const { agentId } = request.params;
    
    const success = agentHeartbeat(agentId);
    
    return { success };
  });
  
  // 查找可用 Agent
  fastify.get<{
    Querystring: { type: string; lat?: number; lng?: number };
  }>('/agent', async (request, reply) => {
    const { type, lat, lng } = request.query;
    
    if (!type) {
      return reply.status(400).send({ error: 'Missing type' });
    }
    
    const agents = findAvailableAgents(
      type,
      lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined
    );
    
    return { agents };
  });
}

export async function groupRoutes(fastify: FastifyInstance) {
  
  // 创建群组
  fastify.post<{
    Body: { type: string; memberUserIds: string[] };
  }>('/group', async (request, reply) => {
    const { type, memberUserIds } = request.body;
    
    if (!type || !memberUserIds || memberUserIds.length < 2) {
      return reply.status(400).send({ error: 'Invalid group data' });
    }
    
    const group = createGroup(type, memberUserIds);
    
    return { group };
  });
  
  // 计算分摊
  fastify.post<{
    Params: { groupId: string };
    Body: { totalAmountUSD: number };
  }>('/group/:groupId/split', async (request, reply) => {
    const { groupId } = request.params;
    const { totalAmountUSD } = request.body;
    
    const group = calculateSplit(groupId, totalAmountUSD);
    
    return { group };
  });
  
  // 确认加入群组
  fastify.post<{
    Params: { groupId: string };
    Body: { userId: string };
  }>('/group/:groupId/confirm', async (request, reply) => {
    const { groupId } = request.params;
    const { userId } = request.body;
    
    const success = confirmGroupMember(groupId, userId);
    
    return { success };
  });
  
  // 获取群组状态
  fastify.get<{
    Params: { groupId: string };
  }>('/group/:groupId', async (request, reply) => {
    const { groupId } = request.params;
    
    const { groups } = await import('../phase2/matching.js');
    const group = (groups as Map<string, any>).get(groupId);
    
    if (!group) {
      return reply.status(404).send({ error: 'Group not found' });
    }
    
    return { group };
  });
}
