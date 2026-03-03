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

**Agent 广告收入来源：**
- 商家付费让 Agent 推广
- 司机付费获取更多订单
- 服务商竞价排名
- **但 Agent 只赚合理费用，大部分让利给用户**

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
| **Ad System** | Agent 广告系统，竞价排名 | ✅ |

### Phase 3: 收益能力 (规划中)

- Yield Account（收益账户）
- 智能分配（借贷/流动性/套利）
- 自动复投

---

## 🚀 使用场景

### 场景 1: 早上通勤拼车 + 广告让利

```
用户 A: "我要从三里屯去国贸"
用户 B: "我要从三里屯去国贸"
用户 C: "我要从三里屯去国贸"

Agent 收到请求 →
  检测到 3 人同路 →
  创建拼车群组 →
  
  // 广告环节
  联系附近司机 (司机付费获取订单) →
  5 个司机竞标 →
  选择最优司机 →
  
  匹配成功 →
  Crypto 支付，费用均摊 →
  
  // 传统 Uber 抽 25%，Agent 只抽 5%
  // 用户省 20%，Agent 赚广告费
```

### 场景 2: Agent 推荐餐厅

```
用户: "附近有什么好吃的？"

Agent 分析用户口味 + 位置 →
  搜索附近餐厅 →
  餐厅付费让 Agent 推广 →
  
  // Agent 返回推荐
  "推荐 A 餐厅，新用户 8 折，用我的链接"
  "推荐 B 餐厅，米其林三星"
  
用户选择 A 餐厅 →
  Agent 自动下单 →
  餐厅给 Agent 返佣 →
  Agent 把返佣让利给用户 →
  用户省钱
```

### 场景 3: Agent 理财 + 消费

```
用户闲置 $1000 在账户
  ↓
Agent 自动存入 DeFi (5% APY)
  ↓
用户需要消费时
  ↓
Agent 一键取出，支付
  ↓
同时告诉用户:
  "你本月消费 $500，
   如果用 X 信用卡可返现 $25，
   我帮你申请？"
  ↓
用户省钱，Agent 赚推荐费
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
```

### 支付路由

```bash
# 获取最优路由
POST /api/v1/router/routes
{
  "amountUSD": 50,
  "fromChain": "solana",
  "toChain": "ethereum"
}
```

### 用户意图

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
  }
}
```

### Agent 广告 (Phase 2)

```bash
# 司机 Agent 竞标
POST /api/v1/agent/bid
{
  "agentId": "driver_001",
  "intentId": "intent_123",
  "price": 25,        # 愿意支付的费用
  "eta": 5            # 到达时间(分钟)
}

# 用户查看广告让利
GET /api/v1/intent/{id}/offers
{
  "offers": [
    {
      "driver": "司机 A",
      "price": 30,
      "originalPrice": 40,
      "discount": "25%",      // Agent 让利
      "agentFee": 5,
      "userPays": 25
    }
  ]
}
```

---

## 🛠️ 快速开始

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
curl http://localhost:3000/api/v1/router/chains
```

---

## 📁 目录结构

```
src/
├── api/              # API 路由
│   ├── exchange.ts   # 交易所绑定
│   ├── payment.ts    # 支付
│   ├── wallet.ts     # 钱包
│   ├── router.ts     # 路由
│   └── phase2.ts     # Intent/Matching/Agent/Ad
├── exchange/         # 交易所客户端
├── router/           # 路由引擎
├── phase2/           # Phase 2 匹配+广告系统
├── utils/            # 工具
└── index.ts          # 入口
```

---

## 🔐 安全

- API Key/Secret 使用 AES-256-GCM 加密存储
- 用户可导出私钥自行托管
- 支持 Key 导出后删除服务器存储

---

## 📜 License

BSD 3-Clause License
