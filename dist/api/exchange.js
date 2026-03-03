"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeRoutes = exchangeRoutes;
const client_1 = require("@prisma/client");
const crypto_js_1 = require("../utils/crypto.js");
const prisma = new client_1.PrismaClient();
async function exchangeRoutes(fastify) {
    // 绑定交易所 (API Key 方式)
    fastify.post('/exchange/bind', async (request, reply) => {
        const { userId, exchange, apiKey, apiSecret, permissions = ['spot'] } = request.body;
        // 验证支持的交易所
        const supportedExchanges = ['binance', 'okx', 'coinbase', 'bybit'];
        if (!supportedExchanges.includes(exchange.toLowerCase())) {
            return reply.status(400).send({ error: 'Unsupported exchange' });
        }
        // 用用户 passphrase 加密（这里先用系统 passphrase，实际需要用户端提供）
        const systemPassphrase = process.env.SYSTEM_PASSPHRASE || 'default-dev-passphrase';
        const encryptedCredentials = (0, crypto_js_1.encrypt)(JSON.stringify({ apiKey, apiSecret }), systemPassphrase);
        const binding = await prisma.exchangeBinding.upsert({
            where: {
                userId_exchange: {
                    userId,
                    exchange: exchange.toLowerCase()
                }
            },
            update: {
                credentials: encryptedCredentials,
                permissions,
                authType: 'api_key'
            },
            create: {
                userId,
                exchange: exchange.toLowerCase(),
                authType: 'api_key',
                credentials: encryptedCredentials,
                permissions
            }
        });
        return {
            id: binding.id,
            exchange: binding.exchange,
            status: 'bound',
            permissions: binding.permissions
        };
    });
    // 获取用户绑定的交易所
    fastify.get('/exchange/:userId', async (request, reply) => {
        const { userId } = request.params;
        const bindings = await prisma.exchangeBinding.findMany({
            where: { userId },
            select: {
                id: true,
                exchange: true,
                authType: true,
                permissions: true,
                createdAt: true,
                expiresAt: true
            }
        });
        return { bindings };
    });
    // 解绑交易所
    fastify.delete('/exchange/:bindingId', async (request, reply) => {
        const { bindingId } = request.params;
        await prisma.exchangeBinding.delete({
            where: { id: bindingId }
        });
        return { status: 'unbound' };
    });
    // 查询余额 (需要解密 credentials 调用交易所 API)
    fastify.get('/exchange/:userId/balance', async (request, reply) => {
        const { userId } = request.params;
        const bindings = await prisma.exchangeBinding.findMany({
            where: { userId }
        });
        // TODO: 解密并调用各交易所 API 获取真实余额
        // 这里返回示例数据
        const balances = bindings.map(b => ({
            exchange: b.exchange,
            balances: [
                { token: 'USDC', available: 0, locked: 0 },
                { token: 'USDT', available: 0, locked: 0 },
                { token: 'BTC', available: 0, locked: 0 },
                { token: 'ETH', available: 0, locked: 0 }
            ]
        }));
        return { balances };
    });
}
//# sourceMappingURL=exchange.js.map