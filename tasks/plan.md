# CryptoPaymentAgent - Phase 1 技术方案 (Agent 广告让利版)

## 概述

为 AI Agent 提供加密支付能力的 SDK + 后端服务，核心原则：**Agent 赚广告费，只抽 5%，用户省 20%。**

---

## 1. 交易所接入

### 支持的交易所（优先级排序）
| 优先级 | 交易所 | 接入方式 | 备注 |
|--------|--------|----------|------|
| P0 | Binance | API Key + Secret | 用户量大 |
| P0 | OKX | API Key + Secret | 稳定 |
| P1 | Coinbase | OAuth2 | 主流 |
| P2 | Bybit | API Key + Secret | 新兴 |

### 数据模型

```typescript
// 用户交易所绑定
interface ExchangeBinding {
  userId: string;
  exchange: 'binance' | 'okx' | 'coinbase';
  authType: 'oauth' | 'api_key';
  credentials: EncryptedCredential; // AES-256-GCM 加密
  permissions: string;
  createdAt: Date;
  expiresAt?: Date;
}
```

---

## 2. 多链路由引擎

### 支持的链
| 链 | 代币 | 特点 | Gas 成本 |
|----|------|------|----------|
| Solana | USDC, USDT | 快、便宜 | ~$0.001 |
| Ethereum L2 | USDC, USDT | Arbitrum, Base, Optimism | ~$0.01-0.1 |
| Polygon | USDC | 便宜 | ~$0.01 |
| Tron | USDD, USDT | 便宜 | ~$0.1 |

### 路由策略

```typescript
interface PaymentRequest {
  amount: number;        // USD 金额
  fromChain: string;
  toChain: string;
  token: string;         // USDC/USDT
  urgency: 'low' | 'normal' | 'high';
}

interface PaymentRoute {
  route: {
    fromToken: string;
    toToken: string;
    fromChain: string;
    toChain: string;
    swapDex: string;
    estimatedTime: number;
    estimatedCost: number;
  }[];
  totalCostUSD: number;
  totalTimeSeconds: number;
  recommended: boolean;
}
```

---

## 3. 智能支付执行

### 支付流程
```
Agent 调用 pay() → 后端创建支付任务 → 
检查余额 → 不足则提示充值 → 
执行跨链 Swap → 转账到目标地址 → 
回调 Agent
```

### API 设计

```typescript
class CryptoPaymentSDK {
  // 绑定交易所
  bindExchange(exchange: string, auth: OAuthAuth | APIKeyAuth): Promise<Binding>
  
  // 查询余额
  getBalance(userId: string): Promise<Balance[]>
  
  // 发起支付
  pay(request: PaymentRequest): Promise<Payment>
  
  // 导出私钥
  exportKey(userId: string, passphrase: string): Promise<string>
  
  // Webhook 回调
  onPaymentStatus(callback: (payment: Payment) => void): void
}
```

---

## 4. Key 导出功能

- 用户首次绑定时，后端生成加密的 keystore
- keystore 由用户 passphrase 加密
- 用户可导出 keystore，自己保管
- 导出后后端删除对应私钥

---

## 5. Agent SDK

```typescript
// npm install @riocloud/crypto-payment-agent
import { CryptoPaymentAgent } from '@riocloud/crypto-payment-agent';

const agent = new CryptoPaymentAgent({
  agentId: 'your-agent-id',
  apiKey: 'your-api-key',
  webhookUrl: 'https://your-agent.com/webhook'
});

// 绑定用户交易所
const binding = await agent.bindUser('user-123', {
  exchange: 'binance',
  method: 'oauth'
});

// 查询最优支付路径
const routes = await agent.getPaymentRoutes({
  amount: 50,
  fromChain: 'solana',
  toChain: 'ethereum'
});

// 执行支付
const payment = await agent.pay({
  userId: 'user-123',
  route: routes[0],
  toAddress: '0x...'
});
```

---

## 6. 技术架构

### 服务结构
```
┌─────────────────────────────────────────┐
│              API Gateway                │
│           (Fastify)                     │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐        ┌─────▼────┐
│ Worker │        │  Router  │
│  支付   │        │  路由引擎 │
│ 执行    │        │          │
└────┬────┘        └────┬────┘
     │                 │
┌────▼────────┬───────▼────┐
│   Database   │  Price API │
│  (Postgres)  │ (DEX/Chain)│
└──────────────┴────────────┘
```

### 技术栈
- **Runtime**: Node.js 20+
- **API**: Fastify + tRPC
- **DB**: PostgreSQL + Prisma
- **队列**: BullMQ (Redis)
- **价格源**: DeFi Llama API + DEX APIs
- **私钥存储**: HashiCorp Vault 或自研加密

---

## 7. TODO 清单

### Week 1: 基础设施
- [ ] 项目初始化 (TypeScript + Fastify)
- [ ] PostgreSQL + Prisma 设置
- [ ] 基础 API 骨架
- [ ] 加密模块 (AES-256-GCM)

### Week 2: 交易所接入
- [ ] Binance API Key 接入
- [ ] OKX API Key 接入
- [ ] OAuth 流程 (可选)
- [ ] 余额查询

### Week 3: 路由引擎
- [ ] 多链价格获取
- [ ] 跨链桥成本计算
- [ ] 路由算法
- [ ] API 接口

### Week 4: 支付执行
- [ ] 支付任务队列
- [ ] Swap 执行 (Solana/Evm)
- [ ] Webhook 回调
- [ ] Key 导出

### Week 5: SDK & 测试
- [ ] TypeScript SDK
- [ ] 单元测试
- [ ] 集成测试
- [ ] Demo Agent 演示

---

## 8. 后续 Phase (可选)

### Phase 2: Agent 间匹配 + 广告让利
- 用户意图注册
- LBS 匹配
- 自动建群
- **Agent 广告竞标系统**
- **让利计算引擎 (Agent 抽 5%，用户省 20%)**

### Phase 3: DeFi 收益
- 用户闲置资金理财
- 自动收益优化
