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
exports.routerRoutes = routerRoutes;
const engine_js_1 = require("../router/engine.js");
const router = new engine_js_1.RouterEngine();
async function routerRoutes(fastify) {
    // 获取支付路由
    fastify.post('/router/routes', async (request, reply) => {
        const { amountUSD, fromChain, toChain, token, urgency } = request.body;
        // 验证链
        if (!fromChain || !toChain) {
            return reply.status(400).send({ error: 'Missing fromChain or toChain' });
        }
        try {
            const routes = await router.getRoutes({
                amountUSD,
                fromChain,
                toChain,
                token,
                urgency
            });
            return { routes };
        }
        catch (error) {
            return reply.status(500).send({ error: error.message });
        }
    });
    // 获取支持链列表
    fastify.get('/router/chains', async () => {
        const { CHAIN_CONFIG } = await Promise.resolve().then(() => __importStar(require('../router/engine.js')));
        const chains = Object.entries(CHAIN_CONFIG).map(([key, config]) => ({
            id: key,
            name: config.name,
            tokens: config.tokens,
            gasEstimateUSD: config.gasEstimate
        }));
        return { chains };
    });
}
//# sourceMappingURL=router.js.map