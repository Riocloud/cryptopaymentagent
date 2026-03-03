"use strict";
// Phase 2: 用户意图与 Agent 匹配系统
Object.defineProperty(exports, "__esModule", { value: true });
exports.groups = void 0;
exports.createIntent = createIntent;
exports.matchIntents = matchIntents;
exports.registerAgent = registerAgent;
exports.findAvailableAgents = findAvailableAgents;
exports.agentHeartbeat = agentHeartbeat;
exports.createGroup = createGroup;
exports.calculateSplit = calculateSplit;
exports.confirmGroupMember = confirmGroupMember;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// 导出 groups 以便在其他模块使用
exports.groups = new Map();
/**
 * 创建用户意图
 */
async function createIntent(data) {
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
async function matchIntents(intentId, radiusMeters = 5000, maxResults = 10) {
    const intent = await prisma.userIntent.findUnique({
        where: { id: intentId }
    });
    if (!intent) {
        throw new Error('Intent not found');
    }
    const intentData = JSON.parse(intent.intent);
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
// 内存存储 (生产应该用 Redis)
const agentRegistry = new Map();
/**
 * 注册 Agent
 */
function registerAgent(agent) {
    agentRegistry.set(agent.agentId, {
        ...agent,
        status: 'available'
    });
    return agent;
}
/**
 * 查找可用 Agent
 */
function findAvailableAgents(type, location) {
    const agents = [];
    agentRegistry.forEach(agent => {
        if (agent.status !== 'available')
            return;
        const hasCapability = agent.capabilities.some(c => c.type === type || c.type === 'any');
        if (hasCapability) {
            agents.push(agent);
        }
    });
    return agents;
}
/**
 * Agent 心跳
 */
function agentHeartbeat(agentId) {
    const agent = agentRegistry.get(agentId);
    if (agent) {
        agent.status = 'available';
        return true;
    }
    return false;
}
/**
 * 创建群组
 */
function createGroup(type, memberUserIds) {
    const group = {
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
    exports.groups.set(group.id, group);
    return group;
}
/**
 * 计算分摊金额
 */
function calculateSplit(groupId, totalAmountUSD) {
    const group = exports.groups.get(groupId);
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
function confirmGroupMember(groupId, userId) {
    const group = exports.groups.get(groupId);
    if (!group)
        return false;
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
//# sourceMappingURL=matching.js.map