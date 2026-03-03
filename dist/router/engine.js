"use strict";
/**
 * 支付路由引擎
 * 找到最优支付路径（最便宜/最快）
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RouterEngine = exports.CHAIN_CONFIG = void 0;
const axios_1 = __importDefault(require("axios"));
// 支持的链配置
exports.CHAIN_CONFIG = {
    solana: {
        name: 'Solana',
        chainId: 'solana',
        tokens: ['USDC', 'USDT', 'SOL'],
        gasEstimate: 0.001, // USD
        avgConfirmTime: 5 // seconds
    },
    ethereum: {
        name: 'Ethereum',
        chainId: 'ethereum',
        tokens: ['USDC', 'USDT', 'ETH'],
        gasEstimate: 5,
        avgConfirmTime: 15
    },
    arbitrum: {
        name: 'Arbitrum',
        chainId: 'arbitrum',
        tokens: ['USDC', 'USDT', 'ETH'],
        gasEstimate: 0.1,
        avgConfirmTime: 10
    },
    base: {
        name: 'Base',
        chainId: 'base',
        tokens: ['USDC', 'USDT', 'ETH'],
        gasEstimate: 0.05,
        avgConfirmTime: 10
    },
    optimism: {
        name: 'Optimism',
        chainId: 'optimism',
        tokens: ['USDC', 'USDT', 'ETH'],
        gasEstimate: 0.1,
        avgConfirmTime: 10
    },
    polygon: {
        name: 'Polygon',
        chainId: 'polygon',
        tokens: ['USDC', 'USDT', 'MATIC'],
        gasEstimate: 0.01,
        avgConfirmTime: 5
    },
    tron: {
        name: 'Tron',
        chainId: 'tron',
        tokens: ['USDT', 'TRX'],
        gasEstimate: 0.1,
        avgConfirmTime: 3
    }
};
/**
 * 路由引擎主类
 */
class RouterEngine {
    priceCache = new Map();
    cacheExpiry = 0;
    CACHE_TTL = 60000; // 1 minute
    /**
     * 获取支付路由
     */
    async getRoutes(request) {
        const { amountUSD, fromChain, toChain, urgency = 'normal' } = request;
        const token = request.token || 'USDC';
        // 刷新价格缓存
        await this.refreshPrices();
        const routes = [];
        // 1. 同链直接转账
        if (fromChain === toChain) {
            routes.push(this.createDirectTransferRoute(fromChain, token, amountUSD));
        }
        else {
            // 2. 跨链路由
            routes.push(...this.createCrossChainRoutes(fromChain, toChain, token, amountUSD, urgency));
        }
        // 计算推荐分数并排序
        routes.forEach(route => {
            route.score = this.calculateScore(route, urgency);
        });
        routes.sort((a, b) => b.score - a.score);
        // 标记推荐
        if (routes.length > 0) {
            routes[0].recommended = true;
        }
        return routes;
    }
    /**
     * 创建直接转账路由（同链）
     */
    createDirectTransferRoute(chain, token, amountUSD) {
        const chainConfig = exports.CHAIN_CONFIG[chain];
        const gasCost = chainConfig.gasEstimate;
        return {
            id: `direct-${chain}-${token}`,
            fromChain: chain,
            toChain: chain,
            fromToken: token,
            toToken: token,
            steps: [
                {
                    type: 'transfer',
                    fromToken: token,
                    toToken: token,
                    fromChain: chain,
                    toChain: chain,
                    protocol: 'native',
                    estimatedCostUSD: gasCost,
                    estimatedTimeSeconds: chainConfig.avgConfirmTime
                }
            ],
            estimatedCostUSD: gasCost,
            estimatedTimeSeconds: chainConfig.avgConfirmTime,
            score: 0,
            recommended: false
        };
    }
    /**
     * 创建跨链路由
     */
    createCrossChainRoutes(fromChain, toChain, token, amountUSD, urgency) {
        const routes = [];
        // 策略 1: 跨链桥 (Stargate, Across, etc.)
        routes.push(this.createBridgeRoute(fromChain, toChain, token, amountUSD));
        // 策略 2: 跨链 DEX 聚合 (e.g., 跨链 Swap)
        routes.push(this.createDexBridgeRoute(fromChain, toChain, token, amountUSD));
        // 策略 3: 中间链路由 (e.g., Solana -> ETH -> Arbitrum)
        if (fromChain !== 'solana' && toChain !== 'solana') {
            routes.push(this.createMiddleChainRoute(fromChain, toChain, token, amountUSD));
        }
        return routes;
    }
    /**
     * 创建跨链桥路由
     */
    createBridgeRoute(fromChain, toChain, token, amountUSD) {
        // 简化: 使用通用跨链桥估算
        const fromConfig = exports.CHAIN_CONFIG[fromChain];
        const toConfig = exports.CHAIN_CONFIG[toChain];
        // 桥费用估算 (通常是金额的 0.1-0.3% + 固定费用)
        const bridgeFeePercent = 0.002;
        const bridgeFeeUSD = amountUSD * bridgeFeePercent;
        const gasCost = fromConfig.gasEstimate + toConfig.gasEstimate;
        const totalCost = bridgeFeeUSD + gasCost;
        // 时间估算
        const bridgeTime = this.getBridgeEstimateTime(fromChain, toChain);
        const totalTime = fromConfig.avgConfirmTime + bridgeTime + toConfig.avgConfirmTime;
        return {
            id: `bridge-${fromChain}-${toChain}`,
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            steps: [
                {
                    type: 'bridge',
                    fromToken: token,
                    toToken: token,
                    fromChain,
                    toChain,
                    protocol: 'stargate',
                    estimatedCostUSD: bridgeFeeUSD,
                    estimatedTimeSeconds: bridgeTime
                }
            ],
            estimatedCostUSD: totalCost,
            estimatedTimeSeconds: totalTime,
            score: 0,
            recommended: false
        };
    }
    /**
     * 创建 DEX 跨链路由
     */
    createDexBridgeRoute(fromChain, toChain, token, amountUSD) {
        const fromConfig = exports.CHAIN_CONFIG[fromChain];
        const toConfig = exports.CHAIN_CONFIG[toChain];
        // DEX Swap 滑点估算 (0.3-0.5%)
        const swapFeePercent = 0.003;
        const swapFeeUSD = amountUSD * swapFeePercent;
        const bridgeFee = 0.5; // 固定桥费用
        const gasCost = fromConfig.gasEstimate + toConfig.gasEstimate;
        const totalCost = swapFeeUSD + bridgeFee + gasCost;
        return {
            id: `dex-bridge-${fromChain}-${toChain}`,
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            steps: [
                {
                    type: 'swap',
                    fromToken: token,
                    toToken: 'native', // 转换为中间代币
                    fromChain,
                    toChain: fromChain,
                    protocol: 'jupiter', // 或 uniswap
                    estimatedCostUSD: swapFeeUSD,
                    estimatedTimeSeconds: 5
                },
                {
                    type: 'bridge',
                    fromToken: 'native',
                    toToken: 'native',
                    fromChain,
                    toChain,
                    protocol: 'stargate',
                    estimatedCostUSD: bridgeFee,
                    estimatedTimeSeconds: this.getBridgeEstimateTime(fromChain, toChain)
                },
                {
                    type: 'swap',
                    fromToken: 'native',
                    toToken: token,
                    fromChain: toChain,
                    toChain: toChain,
                    protocol: 'uniswap',
                    estimatedCostUSD: swapFeeUSD,
                    estimatedTimeSeconds: 5
                }
            ],
            estimatedCostUSD: totalCost,
            estimatedTimeSeconds: fromConfig.avgConfirmTime + 10 + this.getBridgeEstimateTime(fromChain, toChain) + toConfig.avgConfirmTime,
            score: 0,
            recommended: false
        };
    }
    /**
     * 创建中间链路由
     */
    createMiddleChainRoute(fromChain, toChain, token, amountUSD) {
        // 假设中间链是 Solana (最便宜)
        const middleChain = 'solana';
        const fromConfig = exports.CHAIN_CONFIG[fromChain];
        const toConfig = exports.CHAIN_CONFIG[toChain];
        const middleConfig = exports.CHAIN_CONFIG[middleChain];
        const bridgeFee1 = 0.5;
        const bridgeFee2 = 0.5;
        const swapFee = amountUSD * 0.003;
        const gasCost = fromConfig.gasEstimate + middleConfig.gasEstimate + toConfig.gasEstimate;
        const totalCost = bridgeFee1 + bridgeFee2 + swapFee * 2 + gasCost;
        return {
            id: `middle-${fromChain}-${middleChain}-${toChain}`,
            fromChain,
            toChain,
            fromToken: token,
            toToken: token,
            steps: [
                {
                    type: 'bridge',
                    fromToken: token,
                    toToken: token,
                    fromChain,
                    toChain: middleChain,
                    protocol: 'stargate',
                    estimatedCostUSD: bridgeFee1,
                    estimatedTimeSeconds: this.getBridgeEstimateTime(fromChain, middleChain)
                },
                {
                    type: 'bridge',
                    fromToken: token,
                    toToken: token,
                    fromChain: middleChain,
                    toChain,
                    protocol: 'stargate',
                    estimatedCostUSD: bridgeFee2,
                    estimatedTimeSeconds: this.getBridgeEstimateTime(middleChain, toChain)
                }
            ],
            estimatedCostUSD: totalCost,
            estimatedTimeSeconds: 30, // 简化估算
            score: 0,
            recommended: false
        };
    }
    /**
     * 刷新价格缓存
     */
    async refreshPrices() {
        const now = Date.now();
        if (now < this.cacheExpiry && this.priceCache.size > 0) {
            return;
        }
        try {
            // 从 DeFi Llama 获取价格 (简化)
            // 实际应该调用: https://coins.llama.fi/prices
            const response = await axios_1.default.get('https://coins.llama.fi/prices?vs=usd', {
                params: {
                    coins: 'solana,ethereum,polygon,arbitrum,base,optimism,tron,tron,usd-coin,tether'
                },
                timeout: 5000
            });
            // 缓存价格
            const prices = response.data.coins || {};
            Object.entries(prices).forEach(([key, value]) => {
                this.priceCache.set(key.toLowerCase(), {
                    price: value.price,
                    timestamp: now
                });
            });
            this.cacheExpiry = now + this.CACHE_TTL;
        }
        catch (error) {
            console.error('Failed to fetch prices:', error);
            // 使用默认价格
        }
    }
    /**
     * 计算路由分数
     */
    calculateScore(route, urgency) {
        const costWeight = urgency === 'high' ? 0.3 : 0.7;
        const timeWeight = urgency === 'high' ? 0.7 : 0.3;
        // 归一化 (越低越好)
        const costScore = Math.max(0, 100 - route.estimatedCostUSD * 10);
        const timeScore = Math.max(0, 100 - route.estimatedTimeSeconds);
        return costScore * costWeight + timeScore * timeWeight;
    }
    /**
     * 获取跨链桥预估时间
     */
    getBridgeEstimateTime(fromChain, toChain) {
        // 简化估算
        if (fromChain === 'solana' || toChain === 'solana') {
            return 30; // Solana 桥较慢
        }
        if ((fromChain === 'ethereum' || toChain === 'ethereum') &&
            (fromChain.includes('arbitrum') || toChain.includes('arbitrum') ||
                fromChain.includes('optimism') || toChain.includes('optimism') ||
                fromChain === 'base' || toChain === 'base')) {
            return 15; // L2 桥较快
        }
        return 20;
    }
}
exports.RouterEngine = RouterEngine;
//# sourceMappingURL=engine.js.map