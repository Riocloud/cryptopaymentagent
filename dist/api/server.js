"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastify = void 0;
exports.initApp = initApp;
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const fastify = (0, fastify_1.default)({
    logger: true
});
exports.fastify = fastify;
// 基础错误处理
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    if (error.validation) {
        return reply.status(400).send({
            error: 'Validation Error',
            message: error.message
        });
    }
    reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message
    });
});
// 初始化函数
async function initApp() {
    // 注册 CORS
    await fastify.register(cors_1.default, {
        origin: true,
        credentials: true
    });
    // 健康检查
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
}
//# sourceMappingURL=server.js.map