/**
 * 支付路由引擎
 * 找到最优支付路径（最便宜/最快）
 */

import axios from 'axios';

// 支持的链配置
export const CHAIN_CONFIG: Record<string, ChainConfig> = {
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

export interface ChainConfig {
  name: string;
  chainId: string;
  tokens: string[];
  gasEstimate: number;
  avgConfirmTime: number;
}

export interface PaymentRouteRequest {
  amountUSD: number;
  fromChain: string;
  toChain: string;
  token?: string; // default USDC
  urgency?: 'low' | 'normal' | 'high';
}

export interface PaymentRoute {
  id: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  
  // 路径详情
  steps: RouteStep[];
  
  // 成本估算
  estimatedCostUSD: number;
  estimatedTimeSeconds: number;
  
  // 推荐分数 (0-100)
  score: number;
  recommended: boolean;
}

export interface RouteStep {
  type: 'swap' | 'bridge' | 'transfer';
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  protocol: string; // Jupiter, Raydium, Stargate, etc.
  estimatedCostUSD: number;
  estimatedTimeSeconds: number;
}

/**
 * 路由引擎主类
 */
export class RouterEngine {
  private priceCache: Map<string, PriceData> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute
  
  /**
   * 获取支付路由
   */
  async getRoutes(request: PaymentRouteRequest): Promise<PaymentRoute[]> {
    const { amountUSD, fromChain, toChain, urgency = 'normal' } = request;
    const token = request.token || 'USDC';
    
    // 刷新价格缓存
    await this.refreshPrices();
    
    const routes: PaymentRoute[] = [];
    
    // 1. 同链直接转账
    if (fromChain === toChain) {
      routes.push(this.createDirectTransferRoute(fromChain, token, amountUSD));
    } else {
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
  private createDirectTransferRoute(
    chain: string,
    token: string,
    amountUSD: number
  ): PaymentRoute {
    const chainConfig = CHAIN_CONFIG[chain];
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
  private createCrossChainRoutes(
    fromChain: string,
    toChain: string,
    token: string,
    amountUSD: number,
    urgency: string
  ): PaymentRoute[] {
    const routes: PaymentRoute[] = [];
    
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
  private createBridgeRoute(
    fromChain: string,
    toChain: string,
    token: string,
    amountUSD: number
  ): PaymentRoute {
    // 简化: 使用通用跨链桥估算
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    
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
  private createDexBridgeRoute(
    fromChain: string,
    toChain: string,
    token: string,
    amountUSD: number
  ): PaymentRoute {
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    
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
  private createMiddleChainRoute(
    fromChain: string,
    toChain: string,
    token: string,
    amountUSD: number
  ): PaymentRoute {
    // 假设中间链是 Solana (最便宜)
    const middleChain = 'solana';
    const fromConfig = CHAIN_CONFIG[fromChain];
    const toConfig = CHAIN_CONFIG[toChain];
    const middleConfig = CHAIN_CONFIG[middleChain];
    
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
  private async refreshPrices(): Promise<void> {
    const now = Date.now();
    if (now < this.cacheExpiry && this.priceCache.size > 0) {
      return;
    }
    
    try {
      // 从 DeFi Llama 获取价格 (简化)
      // 实际应该调用: https://coins.llama.fi/prices
      const response = await axios.get('https://coins.llama.fi/prices?vs=usd', {
        params: {
          coins: 'solana,ethereum,polygon,arbitrum,base,optimism,tron,tron,usd-coin,tether'
        },
        timeout: 5000
      });
      
      // 缓存价格
      const prices = response.data.coins || {};
      Object.entries(prices).forEach(([key, value]: [string, any]) => {
        this.priceCache.set(key.toLowerCase(), {
          price: value.price,
          timestamp: now
        });
      });
      
      this.cacheExpiry = now + this.CACHE_TTL;
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      // 使用默认价格
    }
  }
  
  /**
   * 计算路由分数
   */
  private calculateScore(route: PaymentRoute, urgency: string): number {
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
  private getBridgeEstimateTime(fromChain: string, toChain: string): number {
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

/**
 * 价格数据类型
 */
interface PriceData {
  price: number;
  timestamp: number;
}
