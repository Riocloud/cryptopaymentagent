# CryptoPaymentAgent

面向 AI Agent 的加密支付基础设施。

## Vision

让 AI Agent 能够自动完成加密支付，踢掉 Uber 这样的中介，让用户均摊成本。

## 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent SDK / API                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   API Gateway (Fastify)                    │
│  /api/v1/exchange | /api/v1/payment | /api/v1/router      │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│  Exchange   │ │   Router   │ │  Matching  │
│   Client    │ │   Engine   │ │   Engine   │
│ Binance/OKX │ │ 路由优化   │ │ Intent/P2P │
└──────┬──────┘ └──────┬─────┘ └─────┬──────┘
       │               │             │
┌──────▼───────────────▼─────────────▼──────────────────────┐
│                    PostgreSQL (Prisma)                     │
│  User | ExchangeBinding | Wallet | Payment | Intent       │
└────────────────────────────────────────────────────────────┘
```

## 核心模块

### Phase 1: 支付能力

| 模块 | 说明 |
|------|------|
| **Exchange Client** | Binance/OKX API 接入，支持 API Key 绑定和 OAuth |
| **Router Engine** | 多链路由，找到最便宜/最快的支付路径 |
| **Wallet Manager** | 钱包创建/绑定，Keystore 加密，Key 可导出 |
| **Payment Queue** | 支付任务队列，异步执行 |

**支持链**: Solana, Ethereum, Arbitrum, Base, Optimism, Polygon, Tron

**支持交易所**: Binance, OKX, Coinbase, Bybit

### Phase 2: 匹配能力

| 模块 | 说明 |
|------|------|
| **Intent System** | 用户意图注册（打车/外卖/购物） |
| **Agent Registry** | Service Agent 注册 + 心跳 |
| **Matching Engine** | LBS 匹配，用户 ↔ Agent |
| **Group Settlement** | 自动建群，费用分摊结算 |

### Phase 3: 收益能力 (规划中)

- Yield Account（收益账户）
- 智能分配（借贷/流动性/套利）
- 自动复投

## API 概览

### 交易所绑定

```bash
# 绑定交易所 (API Key)
POST /api/v1/exchange/bind
{
  "userId": "user_123",
  "exchange": "binance",
  "apiKey": "xxx",
  "apiSecret": "xxx"
}

# 获取余额
GET /api/v1/exchange/{userId}/balance
```

### 支付路由

```bash
# 获取最优路由
POST /api/v1/router/routes
{
  "amountUSD": 50,
  "fromChain": "solana",
  "toChain": "ethereum",
  "urgency": "normal"
}
```

### 发起支付

```bash
POST /api/v1/payment
{
  "userId": "user_123",
  "amountUSD": 50,
  "fromChain": "solana",
  "toChain": "ethereum",
  "toAddress": "0x..."
}
```

### 钱包

```bash
# 绑定/创建钱包
POST /api/v1/wallet
{
  "userId": "user_123",
  "chain": "solana",
  "address": "...",
  "passphrase": "user_passphrase"
}

# 导出私钥
POST /api/v1/wallet/export
{
  "walletId": "wallet_xxx",
  "passphrase": "user_passphrase"
}
```

### Intent (Phase 2)

```bash
# 创建意图
POST /api/v1/intent
{
  "userId": "user_123",
  "type": "transport",
  "intent": {
    "action": "ride",
    "destination": { "lat": 40.7128, "lng": -74.0060 },
    "budget": 30
  },
  "preferences": {
    "maxWaitMinutes": 10,
    "maxGroupSize": 4
  }
}
```

### Agent (Phase 2)

```bash
# 注册 Agent
POST /api/v1/agent/register
{
  "agentId": "driver_agent_1",
  "name": "John's Driver",
  "capabilities": [{ "type": "transport", "vehicleType": "car" }],
  "walletAddress": "0x...",
  "apiEndpoint": "https://agent.example.com/webhook"
}

# 心跳
POST /api/v1/agent/{agentId}/heartbeat
```

## 快速开始

### 1. 安装

```bash
npm install
```

### 2. 环境配置

```bash
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL 和其他配置
```

### 3. 数据库

```bash
# 生成 Prisma Client
npm run db:generate

# 同步数据库
npm run db:push
```

### 4. 启动

```bash
# 开发模式
npm run dev

# 生产
npm run build
npm start
```

## 技术栈

- **Runtime**: Node.js 20+
- **API**: Fastify
- **DB**: PostgreSQL + Prisma
- **TypeScript**: 全栈类型安全

## 目录结构

```
src/
├── api/              # API 路由
│   ├── exchange.ts   # 交易所绑定
│   ├── payment.ts    # 支付
│   ├── wallet.ts     # 钱包
│   ├── router.ts     # 路由
│   └── phase2.ts     # Intent/Matching
├── exchange/         # 交易所客户端
│   └── binance.ts
├── router/           # 路由引擎
│   └── engine.ts
├── phase2/           # Phase 2 匹配系统
│   └── matching.ts
├── utils/            # 工具
│   └── crypto.ts     # 加密模块
└── index.ts          # 入口
```

## License

BSD 3-Clause License
