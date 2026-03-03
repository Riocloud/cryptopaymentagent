import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function paymentRoutes(fastify: FastifyInstance) {
  
  // 发起支付请求
  fastify.post<{
    Body: {
      userId: string;
      amountUSD: number;
      token: string;
      fromChain: string;
      toChain: string;
      toAddress: string;
    };
  }>('/payment', async (request, reply) => {
    const { userId, amountUSD, token, fromChain, toChain, toAddress } = request.body;
    
    // 验证参数
    if (amountUSD <= 0) {
      return reply.status(400).send({ error: 'Invalid amount' });
    }
    
    // 支持的链
    const supportedChains = ['solana', 'ethereum', 'arbitrum', 'base', 'optimism', 'polygon', 'tron'];
    if (!supportedChains.includes(fromChain) || !supportedChains.includes(toChain)) {
      return reply.status(400).send({ error: 'Unsupported chain' });
    }
    
    // 创建支付记录
    const payment = await prisma.payment.create({
      data: {
        userId,
        amountUSD,
        token,
        fromChain,
        toChain,
        toAddress,
        status: 'pending'
      }
    });
    
    // TODO: 
    // 1. 检查用户余额
    // 2. 如果需要跨链，计算路由
    // 3. 加入支付队列
    
    return {
      id: payment.id,
      status: payment.status,
      amountUSD: payment.amountUSD,
      createdAt: payment.createdAt
    };
  });
  
  // 获取支付状态
  fastify.get<{
    Params: { paymentId: string };
  }>('/payment/:paymentId', async (request, reply) => {
    const { paymentId } = request.params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    
    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }
    
    return {
      id: payment.id,
      status: payment.status,
      amountUSD: payment.amountUSD,
      fromChain: payment.fromChain,
      toChain: payment.toChain,
      toAddress: payment.toAddress,
      txHash: payment.txHash,
      errorMessage: payment.errorMessage,
      createdAt: payment.createdAt,
      completedAt: payment.completedAt
    };
  });
  
  // 获取用户支付历史
  fastify.get<{
    Querystring: { userId: string; status?: string; limit?: number };
  }>('/payment', async (request, reply) => {
    const { userId, status, limit = 20 } = request.query;
    
    const where: any = { userId };
    if (status) where.status = status;
    
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    
    return { payments };
  });
  
  // 取消支付 (仅 pending 可取消)
  fastify.post<{
    Params: { paymentId: string };
  }>('/payment/:paymentId/cancel', async (request, reply) => {
    const { paymentId } = request.params;
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId }
    });
    
    if (!payment) {
      return reply.status(404).send({ error: 'Payment not found' });
    }
    
    if (payment.status !== 'pending') {
      return reply.status(400).send({ error: 'Payment cannot be cancelled' });
    }
    
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'failed', errorMessage: 'Cancelled by user' }
    });
    
    return { status: 'cancelled' };
  });
}
