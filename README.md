# CryptoPaymentAgent

**面向 AI Agent 的加密支付基础设施**

让 AI Agent 自动完成加密支付，踢掉 Uber 这样的中介，让用户均摊成本。

---

## 🌟 Vision

### 现在的痛点

当你需要打车时：
1. 下载 Uber / Lyft App
2. 注册、绑定信用卡
3. 每次支付被抽成 15-25%
4. 你的数据被卖给广告商

**AI Agent 时代呢？**

```
一群基于 LBS 的用户需要打车
    ↓
Agent 自动构建一个打车应用
    ↓
一群用户均摊 Agent API 支出
    ↓
Agent 发广告自动联系附近司机
    ↓
踢掉 Uber，直接匹配用户 ↔ 司机
    ↓
Crypto 支付，无抽成，即时到账
```

### 不仅仅是打车

- **外卖**: 一群用户要点同一家店 → Agent 自动拼单 → 降低配送费
- **购物**: 邻里拼团 → Agent 对接商家 → 批发价
- **服务**: 家政、维修需求 → Agent 匹配附近 Available 的服务者

### Crypto 作为支付层

```
用户的钱不只是支付，还能自动生利：
    ↓
Agent 规划投资
    ↓
闲置资金自动存入 DeFi 协议
    ↓
复利收益 > 银行利息
    ↓
用户既能消费，又能赚钱
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent SDK / API                         │
│           (其他 AI Agent 调用本系统的接口)                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   API Gateway (Fastify)                    │
│  /api/v1/exchange | /api/v1/payment | /api/v1/router      │
│  /api/v1/intent   | /api/v1/agent  | /api/v1/group        │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│  Exchange   │ │   Router   │ │  Matching  │
│   Client    │ │   Engine   │ │   Engine   │
│ Binance/OKX │ │  多链路由  │ │ Intent/P2P │
└──────┬──────┘ └──────┬─────┘ └─────┬──────┘
       │               │             │
┌──────▼───────────────▼─────────────▼──────────────────────┐
│                    PostgreSQL (Prisma)                     │
│  User | ExchangeBinding | Wallet | Payment | Intent        │
└────────────────────────────────────────────────────────────┘
```

---

## 📦 核心模块

### Phase 1: 支付能力 (已完成)

| 模块 | 说明 | 状态 |
|------|------|------|
| **Exchange Client** | Binance/OKX API 接入，支持 API Key 绑定 | ✅ |
| **Router Engine** | 多链路由，找到最便宜/最快的支付路径 | ✅ |
| **Wallet Manager** | 钱包创建/绑定，Keystore 加密，Key 可导出 | ✅ |
| **Payment Queue** | 支付任务队列，异步执行 | ✅ |

**支持链**: Solana, Ethereum, Arbitrum, Base, Optimism, Polygon, Tron

**支持交易所**: Binance, OKX, Coinbase, Bybit

### Phase 2: 匹配能力 (已完成)

| 模块 | 说明 | 状态 |
|------|------|------|
| **Intent System** | 用户意图注册（打车/外卖/购物） | ✅ |
| **Agent Registry** | Service Agent 注册 + 心跳 | ✅ |
| **Matching Engine** | LBS 匹配，用户 ↔ Agent | ✅ |
| **Group Settlement** | 自动建群，费用分摊结算 | ✅ |

### Phase 3: 收益能力 (规划中)

- Yield Account（收益账户）
- 智能分配（借贷/流动性/套利）
- 自动复投

---

## 🚀 使用场景举例

### 场景 1: 早上通勤拼车

```
用户 A: "我要从三里屯去国贸"
用户 B: "我要从三里屯去国贸"
用户 C: "我要从三里屯去国贸"

Agent 收到请求 →
  检测到 3 人同路 →
  自动创建拼车群组 →
  联系附近空闲司机 →
  匹配成功 →
  Crypto 支付，费用均摊 →
  踢掉 Uber，无中介抽成
```

### 场景 2: 午餐拼单

```
办公室 10 人想吃同一家外卖
  ↓
Agent 汇总订单 →
  达到批发门槛 →
  争取更低价格 →
  自动拼单配送 →
  Crypto 支付
```

### 场景 3: Agent 理财

```
用户闲置 $1000 在账户
  ↓
Agent 自动存入 Aave (5% APY)
  ↓
每月自动复投
  ↓
一年后 ≈ $1051
  ↓
需要支付时，一键取出
```

---

## 🔌 API 概览

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

# 返回: 推荐路径 + 成本估算
{
  "routes": [{
    "id": "bridge-solana-ethereum",
    "estimatedCostUSD": 5.10,
    "estimatedTimeSeconds": 50,
    "recommended": true
  }]
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

### 用户意图 (Phase 2)

```bash
# 创建出行意图
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

### Agent 注册 (Phase 2)

```bash
# 注册司机 Agent
POST /api/v1/agent/register
{
  "agentId": "driver_agent_1",
  "name": "John's Driver",
  "capabilities": [{
    "type": "transport",
    "vehicleType": "car",
    "location": { "lat": 40.7128, "lng": -74.0060, "radius": 5000 }
  }],
  "walletAddress": "0x...",
  "apiEndpoint": "https://agent.example.com/webhook"
}

# Agent 心跳 (保持在线)
POST /api/v1/agent/{agentId}/heartbeat
```

---

## 🛠️ 快速开始

### 1. 安装

```bash
npm install
```

### 2. 环境配置

```bash
cp .env.example .env
# 编辑 .env 设置 DATABASE_URL
```

### 3. 数据库

```bash
# 开发用 SQLite (自动创建)
npx prisma generate
npx prisma db push

# 生产用 PostgreSQL
# 修改 prisma/schema.prisma 的 provider
```

### 4. 启动

```bash
# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```

### 5. 测试

```bash
# 健康检查
curl http://localhost:3000/health

# 获取支持的链
curl http://localhost:3000/api/v1/router/chains

# 计算路由
curl -X POST http://localhost:3000/api/v1/router/routes \
  -H "Content-Type: application/json" \
  -d '{"amountUSD":50,"fromChain":"solana","toChain":"ethereum"}'
```

---

## 📁 目录结构

```
src/
├── api/                    # API 路由
│   ├── exchange.ts         # 交易所绑定
│   ├── payment.ts          # 支付
│   ├── wallet.ts           # 钱包
│   ├── router.ts           # 路由
│   └── phase2.ts           # Intent/Matching/Group
├── exchange/               # 交易所客户端
│   └── binance.ts          # Binance/OKX API
├── router/                 # 路由引擎
│   └── engine.ts           # 多链路由算法
├── phase2/                 # Phase 2 匹配系统
│   └── matching.ts         # Intent/Agent/Group
├── utils/                  # 工具
│   └── crypto.ts           # AES-256-GCM 加密
└── index.ts                # 入口
```

---

## 🔐 安全

- API Key/Secret 使用 AES-256-GCM 加密存储
- 用户可导出私钥自行托管
- 支持 Key 导出后删除服务器存储

---

## 📜 License

BSD 3-Clause License
