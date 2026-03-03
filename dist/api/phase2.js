"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.intentRoutes = intentRoutes;
exports.agentRoutes = agentRoutes;
exports.groupRoutes = groupRoutes;
const matching_js_1 = require("../phase2/matching.js");
async function intentRoutes(fastify) {
    // 创建用户意图
    fastify.post('/intent', async (request, reply) => {
        const data = request.body;
        if (!data.userId || !data.type || !data.intent) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }
        const intent = await (0, matching_js_1.createIntent)(data);
        return {
            id: intent.id,
            status: intent.status,
            createdAt: intent.createdAt
        };
    });
    // 获取意图状态
    fastify.get('/intent/:intentId', async (request, reply) => {
        const { intentId } = request.params;
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
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
            intent: JSON.parse(intent.intent),
            status: intent.status,
            createdAt: intent.createdAt
        };
    });
    // 匹配意图
    fastify.post('/intent/:intentId/match', async (request, reply) => {
        const { intentId } = request.params;
        const { radius = 5000, limit = 10 } = request.query;
        const matches = await (0, matching_js_1.matchIntents)(intentId, radius, limit);
        return { matches };
    });
    // 取消意图
    fastify.delete('/intent/:intentId', async (request, reply) => {
        const { intentId } = request.params;
        const { PrismaClient } = await Promise.resolve().then(() => __importStar(require('@prisma/client')));
        const prisma = new PrismaClient();
        await prisma.userIntent.update({
            where: { id: intentId },
            data: { status: 'cancelled' }
        });
        return { status: 'cancelled' };
    });
}
async function agentRoutes(fastify) {
    // 注册 Agent
    fastify.post('/agent/register', async (request, reply) => {
        const agent = request.body;
        if (!agent.agentId || !agent.name || !agent.capabilities) {
            return reply.status(400).send({ error: 'Missing required fields' });
        }
        const registered = (0, matching_js_1.registerAgent)(agent);
        return { status: 'registered', agent: registered };
    });
    // Agent 心跳
    fastify.post('/agent/:agentId/heartbeat', async (request, reply) => {
        const { agentId } = request.params;
        const success = (0, matching_js_1.agentHeartbeat)(agentId);
        return { success };
    });
    // 查找可用 Agent
    fastify.get('/agent', async (request, reply) => {
        const { type, lat, lng } = request.query;
        if (!type) {
            return reply.status(400).send({ error: 'Missing type' });
        }
        const agents = (0, matching_js_1.findAvailableAgents)(type, lat && lng ? { lat: Number(lat), lng: Number(lng) } : undefined);
        return { agents };
    });
}
async function groupRoutes(fastify) {
    // 创建群组
    fastify.post('/group', async (request, reply) => {
        const { type, memberUserIds } = request.body;
        if (!type || !memberUserIds || memberUserIds.length < 2) {
            return reply.status(400).send({ error: 'Invalid group data' });
        }
        const group = (0, matching_js_1.createGroup)(type, memberUserIds);
        return { group };
    });
    // 计算分摊
    fastify.post('/group/:groupId/split', async (request, reply) => {
        const { groupId } = request.params;
        const { totalAmountUSD } = request.body;
        const group = (0, matching_js_1.calculateSplit)(groupId, totalAmountUSD);
        return { group };
    });
    // 确认加入群组
    fastify.post('/group/:groupId/confirm', async (request, reply) => {
        const { groupId } = request.params;
        const { userId } = request.body;
        const success = (0, matching_js_1.confirmGroupMember)(groupId, userId);
        return { success };
    });
    // 获取群组状态
    fastify.get('/group/:groupId', async (request, reply) => {
        const { groupId } = request.params;
        const { groups } = await Promise.resolve().then(() => __importStar(require('../phase2/matching.js')));
        const group = groups.get(groupId);
        if (!group) {
            return reply.status(404).send({ error: 'Group not found' });
        }
        return { group };
    });
}
//# sourceMappingURL=phase2.js.map