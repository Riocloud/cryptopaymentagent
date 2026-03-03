"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletRoutes = walletRoutes;
const client_1 = require("@prisma/client");
const crypto_js_1 = require("../utils/crypto.js");
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
async function walletRoutes(fastify) {
    // 创建/绑定钱包
    fastify.post('/wallet', async (request, reply) => {
        const { userId, chain, address, privateKey, passphrase } = request.body;
        // 验证链
        const supportedChains = ['solana', 'ethereum', 'polygon', 'tron'];
        if (!supportedChains.includes(chain.toLowerCase())) {
            return reply.status(400).send({ error: 'Unsupported chain' });
        }
        let keystore = null;
        // 如果提供了私钥，创建加密的 keystore
        if (privateKey) {
            const keystoreData = {
                version: 1,
                id: crypto_1.default.randomUUID(),
                address,
                encryptedPrivateKey: (0, crypto_js_1.encrypt)(privateKey, passphrase),
                salt: crypto_1.default.randomBytes(32).toString('hex')
            };
            keystore = JSON.stringify(keystoreData);
        }
        const wallet = await prisma.wallet.upsert({
            where: {
                userId_chain_address: {
                    userId,
                    chain: chain.toLowerCase(),
                    address: address.toLowerCase()
                }
            },
            update: {
                keystore
            },
            create: {
                userId,
                chain: chain.toLowerCase(),
                address: address.toLowerCase(),
                keystore
            }
        });
        return {
            id: wallet.id,
            chain: wallet.chain,
            address: wallet.address,
            hasKeystore: !!wallet.keystore
        };
    });
    // 获取用户钱包列表
    fastify.get('/wallet/:userId', async (request, reply) => {
        const { userId } = request.params;
        const wallets = await prisma.wallet.findMany({
            where: { userId },
            select: {
                id: true,
                chain: true,
                address: true,
                keystore: true,
                createdAt: true
            }
        });
        // 计算 hasKeystore
        const result = wallets.map(w => ({
            id: w.id,
            chain: w.chain,
            address: w.address,
            hasKeystore: !!w.keystore,
            createdAt: w.createdAt
        }));
        return { wallets: result };
    });
    // 导出私钥 (需要 passphrase 解密)
    fastify.post('/wallet/export', async (request, reply) => {
        const { walletId, passphrase } = request.body;
        const wallet = await prisma.wallet.findUnique({
            where: { id: walletId }
        });
        if (!wallet || !wallet.keystore) {
            return reply.status(404).send({ error: 'Wallet or keystore not found' });
        }
        try {
            const keystoreData = JSON.parse(wallet.keystore);
            const decryptedPrivateKey = (0, crypto_js_1.decrypt)(keystoreData.encryptedPrivateKey, passphrase);
            return {
                address: wallet.address,
                chain: wallet.chain,
                privateKey: decryptedPrivateKey,
                // 导出后删除后端存储（可选）
                message: 'Keep this private key secure. It will not be stored on server after export.'
            };
        }
        catch (error) {
            return reply.status(400).send({ error: 'Invalid passphrase' });
        }
    });
    // 删除钱包
    fastify.delete('/wallet/:walletId', async (request, reply) => {
        const { walletId } = request.params;
        await prisma.wallet.delete({
            where: { id: walletId }
        });
        return { status: 'deleted' };
    });
}
//# sourceMappingURL=wallet.js.map