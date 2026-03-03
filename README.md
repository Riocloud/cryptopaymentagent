# CryptoPaymentAgent

**面向 AI Agent 的加密支付基础设施**

> 未来是 Agent 的时代。Agent 不仅帮用户做事，还能通过广告让利，用户省钱 Agent 赚钱。

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

---

## 🤖 为什么是 Agent 的时代？

### Agent 是新的 App

| 过去 | 未来 |
|------|------|
| 用户下载 App | Agent 帮用户做事 |
| 搜索信息 | Agent 自动处理 |
| 手动支付 | Agent 自动完成 |
| 被中间商抽成 | Agent 直接匹配 |

### Agent 广告让利模型

```
传统模式:
用户 → Uber → 司机
   ↓
Uber 抽 25%

Agent 模式:
用户 → Agent → 司机
   ↓
Agent 赚广告费
   ↓
让利给用户 (抽 5%，而不是 25%)
   ↓
用户省钱 20%！
```

---

## 📦 完整功能模块

### Phase 1: 支付能力 ✅

| 模块 | 说明 | 状态 |
|------|------|------|
| **Exchange Client** | Binance/OKX API 接入，支持 API Key 绑定 | ✅ |
| **Router Engine** | 多链路由，找到最便宜/最快的支付路径 | ✅ |
| **Wallet Manager** | 钱包创建/绑定，Keystore 加密，Key 可导出 | ✅ |
| **Payment Queue** | 支付任务队列，异步执行 | ✅ |

**支持链**: Solana, Ethereum, Arbitrum, Base, Optimism, Polygon, Tron

### Phase 2: 匹配 + 广告让利 ✅

| 模块 | 说明 | 状态 |
|------|------|------|
| **Intent System** | 用户意图注册（打车/外卖/购物） | ✅ |
| **Agent Registry** | Service Agent 注册 + 心跳 | ✅ |
| **Matching Engine** | LBS 匹配，用户 ↔ Agent | ✅ |
| **Group Settlement** | 自动建群，费用分摊结算 | ✅ |
| **Ad System** | Agent 广告系统，竞价排名 | ✅ |

### Phase 2.5: 信任机制 ✅ (新增)

| 模块 | 说明 | 状态 |
|------|------|------|
| **Escrow** | 托管系统，资金锁定，完成后释放 | ✅ |
| **Reputation** | 链上声誉，0-100 分，不可篡改 | ✅ |
| **Bond** | Agent 保证金，违规可冻结 | ✅ |
| **Arbitration** | 争议仲裁流程 | ✅ |

### Phase 3: DeFi 收益 ✅

| 模块 | 说明 | 状态 |
|------|------|------|
| **Yield Account** | 收益账户 | ✅ |
| **Strategy** | 智能分配（借贷/流动性） | ✅ |
| **Projections** | 预期收益计算 | ✅ |
| **Auto-Compound** | 自动复投 | ✅ |

---

## 🔌 API 概览

### 支付 (Phase 1)

```bash
# 绑定交易所
POST /api/v1/exchange/bind
{ "userId": "user_123", "exchange": "binance", "apiKey": "xxx", "apiSecret": "xxx" }

# 获取最优路由
POST /api/v1/router/routes
{ "amountUSD": 50, "fromChain": "solana", "toChain": "ethereum" }

# 发起支付
POST /api/v1/payment
{ "userId": "user_123", "amountUSD": 50, "toAddress": "0x..." }
```

### Intent + Matching (Phase 2)

```bash
# 创建意图 (可选择接收广告让利)
POST /api/v1/intent
{ "userId": "user_123", "type": "transport", "intent": {...}, "preferences": { "wantAds": true } }

# 注册 Agent
POST /api/v1/agent/register
{ "agentId": "driver_001", "capabilities": [{ "type": "transport", "acceptAds": true }] }

# Agent 竞标
POST /api/v1/agent/bid
{ "agentId": "driver_001", "intentId": "...", "amount": 5, "discount": "20%" }

# 获取让利 Offer
GET /api/v1/intent/{id}/offers
```

### Trust (Phase 2.5)

```bash
# 创建托管 (付款后资金锁定)
POST /api/v1/escrow
{ "payerId": "user_123", "payeeId": "driver_001", "amountUSD": 30 }

# 释放托管 (完成后)
POST /api/v1/escrow/release
{ "escrowId": "...", "release": true }

# 发起争议
POST /api/v1/escrow/dispute
{ "escrowId": "...", "reason": "driver didn't arrive" }

# 评分
POST /api/v1/rating
{ "raterId": "user_123", "targetId": "driver_001", "score": 5, "reason": "good_service" }

# 缴纳保证金
POST /api/v1/bond/deposit
{ "agentId": "driver_001", "amountUSD": 500 }

# 检查 Agent 可信度
GET /api/v1/bond/{agentId}/trusted
```

### Yield (Phase 3)

```bash
# 创建收益账户
POST /api/v1/yield
{ "userId": "user_123", "riskLevel": "moderate" }

# 存入代币
POST /api/v1/yield/deposit
{ "userId": "user_123", "token": "USDC", "chain": "ethereum", "amount": 1000 }

# 预期收益
GET /api/v1/yield/projections/{userId}?days=30

# 推荐策略
GET /api/v1/yield/strategy/{riskLevel}
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent SDK / API                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   API Gateway (Fastify)                    │
│  /api/v1/exchange | /api/v1/payment | /api/v1/router    │
│  /api/v1/intent   | /api/v1/escrow | /api/v1/yield      │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
┌──────▼──────┐ ┌─────▼──────┐ ┌────▼────────┐
│  Exchange   │ │   Router   │ │  Matching   │
│   Client    │ │   Engine   │ │   Engine   │
│ Binance/OKX │ │  多链路由  │ │ Intent/P2P │
└──────┬──────┘ └──────┬─────┘ └─────┬──────┘
       │               │             │
┌──────▼───────────────▼─────────────▼──────────────────────┐
│                    PostgreSQL (Prisma)                     │
│  User | Exchange | Wallet | Payment | Intent | Escrow    │
│  Reputation | Bond | YieldAccount | YieldHolding         │
└────────────────────────────────────────────────────────────┘
```

---

## 🚀 快速开始

```bash
# 安装
npm install

# 数据库
npx prisma generate
npx prisma db push

# 启动
npm run dev

# 测试
curl http://localhost:3000/health
```

---

## 📁 目录结构

```
src/
├── api/                    # API 路由
│   ├── exchange.ts         # 交易所绑定 (Phase 1)
│   ├── payment.ts          # 支付 (Phase 1)
│   ├── wallet.ts           # 钱包 (Phase 1)
│   ├── router.ts           # 路由 (Phase 1)
│   ├── phase2-ads.ts      # Intent/Matching/Ads (Phase 2)
│   ├── phase3-yield.ts    # DeFi 收益 (Phase 3)
│   └── phase2-5.ts         # Escrow/Reputation/Bond (Phase 2.5)
├── phase2/
│   └── ads.ts             # 广告让利逻辑
├── phase3/
│   └── yield.ts            # 收益逻辑
├── phase2-5/
│   └── escrow.ts           # 托管+声誉逻辑
├── exchange/               # 交易所客户端
├── router/                 # 路由引擎
├── utils/                  # 工具
└── index.ts                # 入口
```

---

## 💰 Agent 经济模型

```
         ┌─────────────────────────────────────┐
         │           用户向 Agent 付费          │
         │         (API 调用 / 订阅)           │
         └──────────────┬──────────────────────┘
                        │
         ┌──────────────┴──────────────────────┐
         │                                       │
         ▼                                       ▼
┌─────────────────────┐              ┌─────────────────────┐
│    Agent 赚钱       │              │    Agent 让利       │
│                     │              │                     │
│ • 商家广告费        │              │ • 低于传统平台费    │
│ • 司机竞价排名      │              │ • 返现给用户        │
│ • 服务推荐佣金      │              │ • 积分/权益        │
│ • 交易手续费        │              │                     │
└─────────────────────┘              └─────────────────────┘

传统 Uber: 抽 25%
Agent:     抽 5% (广告收入已覆盖成本)
           用户省 20%！
```

---

## 🔐 信任机制

### Escrow 托管

```
用户付款 → 资金锁定在合约 → 司机完成服务 → 用户确认 → 资金释放
                                            ↓
                                   有争议? → 仲裁
```

### Reputation 声誉

- 每次交易后双向评分
- 0-100 分，不可篡改
- 影响匹配优先级

### Bond 保证金

- Agent 需缴纳保证金
- 违规行为可冻结
- 赔付用户损失

---

## 📜 License

BSD 3-Clause License
