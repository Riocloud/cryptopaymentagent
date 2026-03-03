"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./api/server");
const exchange_1 = require("./api/exchange");
const payment_1 = require("./api/payment");
const wallet_1 = require("./api/wallet");
const router_1 = require("./api/router");
const phase2_1 = require("./api/phase2");
// 注册路由
server_1.fastify.register(exchange_1.exchangeRoutes, { prefix: '/api/v1' });
server_1.fastify.register(payment_1.paymentRoutes, { prefix: '/api/v1' });
server_1.fastify.register(wallet_1.walletRoutes, { prefix: '/api/v1' });
server_1.fastify.register(router_1.routerRoutes, { prefix: '/api/v1' });
// Phase 2: Intent & Matching
server_1.fastify.register(phase2_1.intentRoutes, { prefix: '/api/v1' });
server_1.fastify.register(phase2_1.agentRoutes, { prefix: '/api/v1' });
server_1.fastify.register(phase2_1.groupRoutes, { prefix: '/api/v1' });
// 启动服务
const start = async () => {
    try {
        await (0, server_1.initApp)();
        const port = parseInt(process.env.PORT || '3000');
        const host = process.env.HOST || '0.0.0.0';
        await server_1.fastify.listen({ port, host });
        console.log(`Server running on http://${host}:${port}`);
    }
    catch (err) {
        server_1.fastify.log.error(err);
        process.exit(1);
    }
};
start();
//# sourceMappingURL=index.js.map