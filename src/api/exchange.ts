import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { encrypt, decrypt, generatePassphrase } from '../utils/crypto.js';

export async function exchangeRoutes(fastify: FastifyInstance) {
  
  // 绑定交易所 (API Key 方式)
  fastify.post<{
    Body: {
      userId: string;
      exchange: string;
      apiKey: string;
      apiSecret: string;
      permissions?: string[];
    };
  }>('/exchange/bind', async (request, reply) => {
    const { userId, exchange, apiKey, apiSecret, permissions = ['spot'] } = request.body;
    
    // 验证支持的交易所
    const supportedExchanges = ['binance', 'okx', 'coinbase', 'bybit'];
    if (!supportedExchanges.includes(exchange.toLowerCase())) {
      return reply.status(400).send({ error: 'Unsupported exchange' });
    }
    
    // Auto-create user if not exists
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      user = await prisma.user.create({ data: { id: userId } });
    }
    
    // 用用户 passphrase 加密（这里先用系统 passphrase，实际需要用户端提供）
    const systemPassphrase = process.env.SYSTEM_PASSPHRASE || 'default-dev-passphrase';
    const encryptedCredentials = encrypt(
      JSON.stringify({ apiKey, apiSecret }),
      systemPassphrase
    );
    
    // Convert array to comma-separated string for SQLite
    const permissionsStr = permissions.join(',');
    
    const binding = await prisma.exchangeBinding.upsert({
      where: {
        userId_exchange: {
          userId,
          exchange: exchange.toLowerCase()
        }
      },
      update: {
        credentials: encryptedCredentials,
        permissions: permissionsStr,
        authType: 'api_key'
      },
      create: {
        userId,
        exchange: exchange.toLowerCase(),
        authType: 'api_key',
        credentials: encryptedCredentials,
        permissions: permissionsStr
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
  fastify.get<{
    Params: { userId: string };
  }>('/exchange/:userId', async (request, reply) => {
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
  fastify.delete<{
    Params: { bindingId: string };
  }>('/exchange/:bindingId', async (request, reply) => {
    const { bindingId } = request.params;
    
    await prisma.exchangeBinding.delete({
      where: { id: bindingId }
    });
    
    return { status: 'unbound' };
  });
  
  // 查询余额 (需要解密 credentials 调用交易所 API)
  fastify.get<{
    Params: { userId: string };
  }>('/exchange/:userId/balance', async (request, reply) => {
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
