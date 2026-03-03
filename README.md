# CryptoPaymentAgent

**面向 AI Agent 的加密支付基础设施**

> 未来是 Agent 的时代。Agent 不仅帮用户做事，还能通过广告让利，用户省钱 Agent 赚钱。

---

## 🌟 Vision - 愿景

### 背景：为什么需要 CryptoPaymentAgent？

在现在的互联网世界里，每一次消费都被中间商抽成：

- **打车**：Uber 抽 25%
- **外卖**：美团/DoorDash 抽 20-30%
- **购物**：平台抽 10-20%
- **支付**：Visa/Mastercard 抽 2-3%

这些抽成不仅养活了中间商，还带来了：
- 数据垄断（你的消费习惯被卖）
- 平台定价（你无法比价）
- 客服滞后（出了问题找不着人）

### AI Agent 带来的变革

```
过去:
用户 → 打开 Uber App → 搜索 → 下单 → 支付 → 被抽成 25%
      ↓
未来:
用户 → 告诉 Agent "我要去机场" → Agent 自动匹配 → 支付 → 被抽成 5%
```

**核心区别**：
- Agent 不需要盈利性 App 的所有功能
- Agent 可以直接对接服务提供者
- Agent 可以通过广告让利，用户省钱

---

## 🤖 为什么是 Agent 的时代？

### 1. Agent 是"无形的 App"

| 传统 App | Agent |
|----------|-------|
| 需要下载安装 | 无需下载 |
| 需要注册登录 | 授权即用 |
| 功能固定 | 可以定制 |
| 更新需要版本升级 | 实时学习 |
| 数据封闭 | 可以互通 |

### 2. Agent 可以"组团"

```
一个人打车: $40 (Uber 抽 $10)
  ↓
10 个人同路组团: 每人 $25 (Agent 抽 $2.5)
  ↓
每人省 $12.5，Agent 赚 $25 (10人份)
```

这就是"均摊 Agent API 支出"的商业模式。

### 3. Agent 可以"打广告"

```
传统:
商家 → 电视广告 → 用户 (被动接收)

Agent 模式:
用户 → 告诉 Agent "我要吃饭"
  ↓
附近 5 家餐厅竞价想让 Agent 推荐
  ↓
Agent 选最优 (便宜 + 好吃)
  ↓
用户省钱，Agent 赚佣金
```

---

## 📦 完整功能模块

### Phase 1: 支付能力 ✅

这是基础设施，让 Agent 能真正完成加密支付。

#### 1.1 交易所接入 (Exchange Client)

用户不需要自己管理私钥，只需要绑定交易所账号：

```typescript
// 绑定 Binance
POST /api/v1/exchange/bind
{
  "userId": "user_123",
  "exchange": "binance", 
  "apiKey": "xxx",
  "apiSecret": "xxx"
}

// 绑定 OKX
POST /api/v1/exchange/bind
{
  "userId": "user_123", 
  "exchange": "okx",
  "apiKey": "xxx",
  "apiSecret": "xxx"
}
```

**支持交易所**：
- Binance（全球最大）
- OKX（稳定可靠）
- Coinbase（主流选择）
- Bybit（新兴交易所）

#### 1.2 路由引擎 (Router Engine)

自动找到最便宜/最快的支付路径：

```typescript
// 查询最优路由
POST /api/v1/router/routes
{
  "amountUSD": 50,
  "fromChain": "solana",    // 用户资产在 Solana
  "toChain": "ethereum",    // 收款方在 Ethereum
  "urgency": "normal"       // normal/slow/fast
}

// 返回
{
  "routes": [{
    "id": "bridge-solana-ethereum",
    "estimatedCostUSD": 5.10,  // 总成本 $5.10
    "estimatedTimeSeconds": 50, // 50秒
    "recommended": true
  }]
}
```

**支持链**：
| 链 | 特点 | 典型 Gas |
|-----|------|----------|
| Solana | 快、便宜 | ~$0.001 |
| Ethereum | 主流 | ~$5 |
| Arbitrum | L2，便宜 | ~$0.1 |
| Base | Coinbase L2 | ~$0.05 |
| Polygon | 便宜 | ~$0.01 |
| Tron | 稳定币 | ~$0.1 |

#### 1.3 钱包管理 (Wallet Manager)

用户可以选择：
- **托管模式**：由 Agent 代管资金
- **自托管模式**：导出私钥，自己保管

```typescript
// 绑定已有钱包
POST /api/v1/wallet
{
  "userId": "user_123",
  "chain": "solana",
  "address": "7xKXtg...",
  "passphrase": "user_secret"
}

// 导出私钥（自托管）
POST /api/v1/wallet/export
{
  "walletId": "wallet_xxx",
  "passphrase": "user_secret"
}
// 返回私钥，Agent 不再存储
```

#### 1.4 支付执行 (Payment)

```typescript
// 发起支付
POST /api/v1/payment
{
  "userId": "user_123",
  "amountUSD": 50,
  "fromChain": "solana",
  "toChain": "ethereum", 
  "toAddress": "0xabc..."
}

// 返回
{
  "id": "pay_xxx",
  "status": "pending",
  "amountUSD": 50,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### Phase 2: 匹配 + 广告让利 ✅

这是核心商业模式：Agent 抽 5%，用户省 20%。

#### 2.1 Intent System - 用户意图

用户只需要表达"要做什么"，不需要知道怎么做：

```typescript
// 打车意图
POST /api/v1/intent
{
  "userId": "user_123",
  "type": "transport",
  "intent": {
    "action": "ride",
    "destination": {
      "lat": 40.7128,
      "lng": -74.0060,
      "address": "NYC Airport"
    },
    "budget": 40  // 预算 $40
  },
  "preferences": {
    "wantAds": true,      // 愿意接收广告让利
    "maxWaitMinutes": 10,
    "maxGroupSize": 4
  }
}
```

#### 2.2 Agent Registry - Agent 注册

服务提供者（司机/餐厅）注册为 Agent：

```typescript
// 注册司机 Agent
POST /api/v1/agent/register
{
  "agentId": "driver_john_001",
  "name": "John's Driver",
  "capabilities": [{
    "type": "transport",
    "vehicleType": "car",
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "radius": 5000  // 5km 范围
    },
    "acceptAds": true,    // 愿意付广告费获取订单
    "adBudget": 100       // 每日广告预算 $100
  }],
  "walletAddress": "0xabc...",
  "apiEndpoint": "https://driver-agent.example.com/webhook"
}
```

#### 2.3 广告竞标系统

当用户愿意接收广告时，Agent 可以竞标：

```typescript
// 司机出价 $5 获取这个订单
POST /api/v1/agent/bid
{
  "agentId": "driver_john_001",
  "intentId": "intent_xxx",
  "bidType": "driver_bid",
  "amount": 5,           // 愿意付 $5
  "originalPrice": 40,  // 原本收费 $40
  "discount": "20%",     // 让利 20%
  "eta": 5               // 5分钟到达
}
```

#### 2.4 让利计算引擎

**核心算法**：

```
传统 Uber: 抽 25% = $10
Agent:     抽 5%  = $2
用户省:    $8 (20%)
```

```typescript
// 用户获取让利 Offer
GET /api/v1/intent/{intentId}/offers

// 返回
{
  "offers": [{
    "agentId": "driver_john_001",
    "originalPrice": 40,
    "agentFee": 2,           // Agent 抽 $2 (5%)
    "userDiscount": 8,       // 用户省 $8 (20%)
    "userPays": 32,         // 用户付 $32
    "discountPercent": "20%"
  }],
  "recommended": {
    ...offer,
    "message": "Best deal! You save $8.00 (20%)"
  },
  "summary": {
    "traditionalPrice": "$40",
    "agentFee": "$2 (5%)",
    "userSavings": "$8 (20%)",
    "youPay": "$32"
  }
}
```

#### 2.5 Group Settlement - 群组分摊

多个同路用户可以拼单：

```typescript
// 创建拼车群组
POST /api/v1/group
{
  "type": "transport",
  "memberUserIds": ["user1", "user2", "user3"],
  "intentIds": ["intent1", "intent2", "intent3"]
}

// 计算分摊（含广告让利）
POST /api/v1/group/{groupId}/split
{
  "totalAmountUSD": 90,   // 总价 $90
  "adsRevenue": 15        // 广告收入 $15
}

// 返回
{
  "split": {
    "perUser": 25,         // 每人 $25
    "agentFee": 4.5,       // Agent 抽 $4.5 (5%)
    "userSavings": 5      // 每人省 $5
  },
  "breakdown": {
    "traditionalPrice": "$90",
    "userSavings": "$5.00 (from ads)",
    "agentFee": "$4.50 (5%)",
    "youPay": "$25.00 per user"
  }
}
```

---

### Phase 2.5: 信任机制 ✅

这是让 Agent 模式可行的关键。

#### 3.1 Escrow - 资金托管

解决"司机不来了怎么办"和"用户不付钱怎么办"的问题：

```
用户付款 $30
    ↓
资金锁定在托管
    ↓
司机完成服务
    ↓
用户确认 → 资金释放给司机
    ↓
或 7 天超时 → 自动释放
    ↓
或 争议 → 仲裁
```

```typescript
// 创建托管
POST /api/v1/escrow
{
  "payerId": "user_123",      // 付款方
  "payeeId": "driver_001",   // 收款方
  "amountUSD": 30,
  "token": "USDC",
  "chain": "solana"
}

// 完成后释放
POST /api/v1/escrow/release
{
  "escrowId": "escrow_xxx",
  "release": true  // true = 给司机, false = 退款给用户
}

// 发起争议
POST /api/v1/escrow/dispute
{
  "escrowId": "escrow_xxx",
  "reason": "driver arrived 30 minutes late"
}
```

#### 3.2 Reputation - 声誉系统

链上记录每一次评分，不可篡改：

```typescript
// 交易后评分
POST /api/v1/rating
{
  "raterType": "user",
  "raterId": "user_123",
  "targetType": "agent",
  "targetId": "driver_001",
  "score": 5,              // 1-5 分
  "reason": "on_time",    // on_time / good_service / no_show / etc.
  "comment": "Very good driver!"
}

// 获取声誉
GET /api/v1/reputation/agent/driver_001

// 返回
{
  "entityType": "agent",
  "entityId": "driver_001",
  "score": 85,              // 0-100 分
  "totalRatings": 50,
  "positiveRatings": 45,
  "negativeRatings": 3,
  "disputes": 2,
  "level": "⭐⭐⭐⭐ 非常可信"
}
```

**声誉计算**：
```
score = (positive - negative) / total * 50 + 50
       = (45 - 3) / 50 * 50 + 50
       = 42 + 50 = 92
```

#### 3.3 Bond - 保证金

Agent 需要缴纳保证金，违规会冻结：

```typescript
// 缴纳保证金
POST /api/v1/bond/deposit
{
  "agentId": "driver_001",
  "amountUSD": 500
}

// 检查是否可信
GET /api/v1/bond/driver_001/trusted?minBond=100&minReputation=30

// 返回
{
  "agentId": "driver_001",
  "trusted": true,
  "requirements": {
    "minBond": 100,
    "minReputation": 30
  }
}
```

**信任机制流程**：
```
用户发起 Intent
    ↓
匹配可信 Agent (保证金 ≥ $100, 声誉 ≥ 30)
    ↓
创建托管 (资金锁定)
    ↓
Agent 完成服务
    ↓
用户确认/超时 → 资金释放
    ↓
双方评分 → 声誉更新
```

---

### Phase 3: DeFi 收益 ✅

让用户的闲置资金自动生利：

#### 3.1 Yield Account - 收益账户

```typescript
// 创建收益账户
POST /api/v1/yield
{
  "userId": "user_123",
  "riskLevel": "moderate",  // conservative / moderate / aggressive
  "autoCompound": true      // 自动复投
}
```

#### 3.2 存入代币

```typescript
// 存入 USDC 赚收益
POST /api/v1/yield/deposit
{
  "userId": "user_123",
  "token": "USDC",
  "chain": "ethereum",
  "amount": 1000
}

// 返回
{
  "success": true,
  "holding": {
    "token": "USDC",
    "chain": "ethereum",
    "amount": 1000,
    "protocol": "uniswap-arb-usdceth",
    "apy": 0.20  // 20% APY
  },
  "message": "Deposited 1000 USDC at 20.0% APY"
}
```

#### 3.3 预期收益

```typescript
// 计算 30 天预期收益
GET /api/v1/yield/projections/user_123?days=30

// 返回
{
  "totalValueUSD": 1000,
  "projectedYield": 16.44,     // 30 天收益 $16.44
  "apy": 0.20,                 // 年化 20%
  "dailyYield": 0.55,         // 每天 $0.55
  "summary": {
    "currentBalance": "$1000.00",
    "projectedEarnings": "$16.44",
    "effectiveAPY": "20.0%"
  }
}
```

#### 3.4 推荐策略

```typescript
// 获取推荐配置
GET /api/v1/yield/strategy/moderate

// 返回
{
  "riskLevel": "moderate",
  "allocations": [
    { "token": "USDC", "chain": "ethereum", "percent": 30 },
    { "token": "USDC", "chain": "arbitrum", "percent": 30 },
    { "token": "USDC", "chain": "solana", "percent": 25 },
    { "token": "USDT", "chain": "solana", "percent": 15 }
  ]
}
```

---

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户端 (User)                          │
│                                                              │
│   用户表达意图: "我要打车去机场"                              │
│   ↓                                                         │
│   Agent SDK                                                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (Fastify)                   │
│                                                              │
│   Phase 1: /exchange, /payment, /wallet, /router          │
│   Phase 2: /intent, /agent, /group, /ads                   │
│   Phase 2.5: /escrow, /reputation, /bond                   │
│   Phase 3: /yield                                           │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                      业务逻辑层                             │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │   Router    │  │  Matching   │  │   Escrow   │        │
│   │   Engine    │  │   Engine    │  │   Manager  │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │    Ads      │  │ Reputation  │  │    Yield    │        │
│   │   Engine   │  │   System    │  │   Engine    │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
└──────┬──────────────┬──────────────┬───────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL (Prisma)                     │
│                                                              │
│   User │ Exchange │ Wallet │ Payment │ Intent              │
│   Escrow │ Reputation │ Bond │ YieldAccount │ YieldHolding │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

- **Runtime**: Node.js 20+
- **API**: Fastify (高性能)
- **DB**: PostgreSQL + Prisma
- **加密**: AES-256-GCM
- **类型**: TypeScript (全栈)

---

## 🚀 快速开始

### 1. 安装

```bash
git clone https://github.com/Riocloud/cryptopaymentagent.git
cd cryptopaymentagent
npm install
```

### 2. 配置

```bash
cp .env.example .env
```

编辑 `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/crypto?schema=public"
PORT=3000
HOST=0.0.0.0
SYSTEM_PASSPHRASE="your-secret-passphrase"
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
# 开发模式 (热重载)
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

# 创建收益账户
curl -X POST http://localhost:3000/api/v1/yield \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","riskLevel":"moderate"}'
```

---

## 📁 目录结构

```
cryptopaymentagent/
├── prisma/
│   └── schema.prisma       # 数据库模型
├── src/
│   ├── api/                # API 路由
│   │   ├── exchange.ts     # 交易所绑定
│   │   ├── payment.ts      # 支付
│   │   ├── wallet.ts       # 钱包
│   │   ├── router.ts       # 路由
│   │   ├── phase2-ads.ts  # Intent/Matching/Ads
│   │   ├── phase2-5.ts    # Escrow/Reputation/Bond
│   │   └── phase3-yield.ts # DeFi 收益
│   ├── phase2/
│   │   └── ads.ts          # 广告让利逻辑
│   ├── phase2-5/
│   │   └── escrow.ts        # 托管+声誉逻辑
│   ├── phase3/
│   │   └── yield.ts         # 收益逻辑
│   ├── exchange/            # 交易所客户端
│   │   └── binance.ts
│   ├── router/              # 路由引擎
│   │   └── engine.ts
│   ├── utils/              # 工具
│   │   └── crypto.ts       # AES-256-GCM 加密
│   ├── db/
│   │   └── prisma.ts       # Prisma 客户端单例
│   └── index.ts            # 入口
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## 💰 Agent 经济模型详解

### 收入来源

| 来源 | 方式 | 比例 |
|------|------|------|
| **商家广告费** | 餐厅付费推广 | 主要 |
| **司机竞价** | 司机付费获取订单 | 主要 |
| **联盟返佣** | 推荐商品/服务 | 少 |
| **交易手续费** | 支付抽 5% | 少 |

### 让利示例

| 场景 | 传统价格 | Agent 抽 5% | 用户省 |
|------|----------|-------------|--------|
| 打车 | $40 | $2 | $8 (20%) |
| 外卖 | $30 | $1.5 | $6 (20%) |
| 购物 | $100 | $5 | $20 (20%) |

### 平台收益

```
用户付 $32 (含让利)
  ↓
Agent 收到 $30 (扣除让利 $8)
  ↓
Agent 成本 $2 (广告费)
  ↓
Agent 净赚 $28
  ↓
每天 100 单 = $2800
  ↓
每月 = $84,000
```

### 冷启动策略

1. **补贴司机**：早期给司机保底收入
2. **零抽成**：早期不收交易费，靠融资
3. **邀请奖励**：拉新送积分
4. **生态合作**：与现有车队/代理商合作

---

## 🔐 安全机制

### 1. 密钥安全

- API Key/Secret 使用 **AES-256-GCM** 加密存储
- 用户可导出私钥自行托管
- 导出后服务器删除

### 2. 资金安全

- **托管模式**：资金锁定，完成后释放
- **争议仲裁**：7天超时 + 人工仲裁
- **保证金**：Agent 需缴纳保证金

### 3. 隐私安全

- 用户数据加密存储
- 不收集不必要的个人信息
- 支持匿名交易

---

## 🌍 使用场景举例

### 场景 1: 早上通勤拼车

```
用户 A: "我要从三里屯去国贸"
用户 B: "我要从三里屯去国贸" 
用户 C: "我要从三里屯去国贸"

Agent 收到请求
  ↓
检测到 3 人同路
  ↓
创建拼车群组
  ↓
发布广告，附近 5 个司机竞标
  ↓
选择最优司机 (快 + 便宜 + 高评分)
  ↓
创建托管，锁定资金
  ↓
司机接单 → 送达 → 用户确认
  ↓
资金释放给司机，Agent 评分
  ↓
用户实付: $25 (省 $15，传统要 $40)
Agent 赚: $2 (5%)
用户省: $13 (33%)
```

### 场景 2: 午餐拼单

```
办公室 10 人想吃同一家餐厅
  ↓
Agent 汇总订单
  ↓
达到起送量，争取更低价格
  ↓
餐厅竞价，想被推荐
  ↓
Agent 选择: 折扣最大 + 口味最好
  ↓
用户享 8 折，Agent 赚返佣
```

### 场景 3: Agent 理财

```
用户闲置 $1000 在账户
  ↓
Agent 自动存入 DeFi (5% APY)
  ↓
每月收益 ~$4
  ↓
用户需要消费时
  ↓
Agent 一键取出支付
  ↓
同时提醒: "用XX卡可返现 $5"
```

---

### 场景 4: 旅行团订酒店

```
用户 A: "我要去东京，下周"
用户 B: "我要去东京，下周"
用户 C: "我要去东京，下周"

Agent 收到请求
  ↓
搜索附近酒店，5 家报价
  ↓
酒店竞价 (想让 Agent 推荐)
  ↓
Agent 选择: 价格最低 + 评分最高
  ↓
用户享团购价，Agent 赚佣金
  ↓
Agent 帮订房，支付 crypto
```

**对比传统**：
| 方式 | 价格 | 佣金 |
|------|------|------|
| Booking.com | $200/晚 | $30 (15%) |
| Agent | $160/晚 | $10 (5%) |
| 用户省 | $40 (20%) | |

---

### 场景 5: 家政服务

```
用户: "请个小时工打扫卫生"
  ↓
Agent 搜索附近 Available 的家政 Agent
  ↓
家政 Agent 竞标 (价格 + 评分)
  ↓
Agent 匹配最优家政
  ↓
创建托管，锁定资金
  ↓
服务完成，用户确认
  ↓
资金释放，Agent 评分
```

**优势**：
- 无平台抽成 (传统 20-30%)
- 双方直接匹配
- 争议有托管保障

---

### 场景 6: 二手交易

```
用户 A: "我要卖一台 iPhone 15"
用户 B: "我要买一台 iPhone 15"

Agent 匹配买卖双方
  ↓
验证商品 (可接入验机服务)
  ↓
创建托管: 买家付款锁定
  ↓
卖家发货 → 买家确认收货
  ↓
资金释放给卖家
  ↓
Agent 赚服务费 (1-2%)
```

**对比闲鱼**：
- 无平台抽成 10%
- 托管保障资金安全
- 争议有仲裁

---

### 场景 7: 知识付费

```
用户: "我想学 Python"
  ↓
Agent 搜索附近 Available 的 Python 老师
  ↓
老师竞标 (价格 + 评分 + 擅长领域)
  ↓
匹配成功
  ↓
课程费用托管
  ↓
上课完成，确认收货
  ↓
资金释放，评价老师
```

---

### 场景 8: 宠物寄养

```
用户: "我要出差一周，想找寄养"
  ↓
Agent 搜索附近 Available 的宠物寄养 Agent
  ↓
寄养 Agent 竞标 (价格 + 评价 + 资质)
  ↓
匹配成功
  ↓
托管预付款 (50%)
  ↓
寄养完成，用户确认
  ↓
尾款释放，评价
```

---

### 场景 9: 租车服务

```
用户: "我要租一辆车去自驾游"
  ↓
Agent 搜索附近租车公司 Agent
  ↓
租车公司竞价
  ↓
Agent 选择: 价格最低 + 车况最好
  ↓
创建托管: 租金 + 押金锁定
  ↓
还车确认，无损 → 押金释放
  ↓
Agent 赚服务费
```

---

### 场景 10: 医疗预约

```
用户: "我想看牙医"
  ↓
Agent 搜索附近牙科诊所 Agent
  ↓
诊所竞价 (价格 + 评分 + 预约时间)
  ↓
匹配成功
  ↓
预约费用托管
  ↓
就诊完成，确认
  ↓
资金释放
```

---

### 场景 11: 法律咨询

```
用户: "我想咨询离婚法律"
  ↓
Agent 搜索律师 Agent
  ↓
律师竞标 (价格 + 经验 + 评分)
  ↓
匹配成功
  ↓
咨询费托管
  ↓
咨询完成，确认
  ↓
资金释放
```

---

### 场景 12: 代购服务

```
用户: "帮我从日本代购一个包"
  ↓
Agent 搜索代购 Agent
  ↓
代购 Agent 报价 (商品 + 运费 + 代购费)
  ↓
用户确认
  ↓
创建托管: 70% 预付款
  ↓
代购发货，用户确认收货
  ↓
尾款释放
```

---

## 🌎 使用场景 (共 12 种)

| 场景 | 传统痛点 | Agent 优势 |
|------|----------|------------|
| 打车 | Uber 抽 25% | 抽 5%，省 20% |
| 外卖 | 平台抽 20% | 拼单均摊，省更多 |
| 理财 | 银行利息低 | DeFi 5-20% APY |
| 订酒店 | Booking 抽 15% | 团购价，省 20% |
| 家政 | 中介抽 20% | 直接匹配 |
| 二手交易 | 闲鱼抽 10% | 托管+低费 |
| 知识付费 | 平台抽 30% | 直接对接 |
| 宠物寄养 | 信任问题 | 托管+评分 |
| 租车 | 平台抽 20% | 竞价更低 |
| 医疗 | 预约难 | 匹配快 |
| 法律咨询 | 收费不透明 | 竞价透明 |
| 代购 | 资金风险 | 托管保障 |

### 场景 1: 早上通勤拼车

```
用户 A: "我要从三里屯去国贸"
用户 B: "我要从三里屯去国贸" 
用户 C: "我要从三里屯去国贸"

Agent 收到请求
  ↓
检测到 3 人同路
  ↓
创建拼车群组
  ↓
发布广告，附近 5 个司机竞标
  ↓
选择最优司机 (快 + 便宜 + 高评分)
  ↓
创建托管，锁定资金
  ↓
司机接单 → 送达 → 用户确认
  ↓
资金释放给司机，Agent 评分
  ↓
用户实付: $25 (省 $15，传统要 $40)
Agent 赚: $2 (5%)
用户省: $13 (33%)
```

### 场景 2: 午餐拼单

```
办公室 10 人想吃: 午餐拼同一家餐厅
  ↓
Agent 汇总订单
  ↓
达到起送量，争取更低价格
  ↓
餐厅竞价，想被推荐
  ↓
Agent 选择: 折扣最大 + 口味最好
  ↓
用户享 8 折，Agent 赚返佣
```

### 场景 3: Agent 理财

```
用户闲置 $1000 在账户
  ↓
Agent 自动存入 DeFi (5% APY)
  ↓
每月收益 ~$4
  ↓
用户需要消费时
  ↓
Agent 一键取出支付
  ↓
同时提醒: "用XX卡可返现 $5"
```

### 场景 4: 旅行团订酒店

```
用户 A: "我要去东京，下周"
用户 B: "我要去东京，下周"
用户 C: "我要去东京，下周"

Agent 收到请求
  ↓
搜索附近酒店，5 家报价
  ↓
酒店竞价 (想让 Agent 推荐)
  ↓
Agent 选择: 价格最低 + 评分最高
  ↓
用户享团购价，Agent 赚佣金
  ↓
Agent 帮订房，支付 crypto
```

**对比传统**：
| 方式 | 价格 | 佣金 |
|------|------|------|
| Booking.com | $200/晚 | $30 (15%) |
| Agent | $160/晚 | $10 (5%) |
| 用户省 | $40 (20%) | |

### 场景 5: 家政服务

```
用户: "请个小时工打扫卫生"
  ↓
Agent 搜索附近 Available 的家政 Agent
  ↓
家政 Agent 竞标 (价格 + 评分)
  ↓
Agent 匹配最优家政
  ↓
创建托管，锁定资金
  ↓
服务完成，用户确认
  ↓
资金释放，Agent 评分
```

**优势**：
- 无平台抽成 (传统 20-30%)
- 双方直接匹配
- 争议有托管保障

### 场景 6: 二手交易

```
用户 A: "我要卖一台 iPhone 15"
用户 B: "我要买一台 iPhone 15"

Agent 匹配买卖双方
  ↓
验证商品 (可接入验机服务)
  ↓
创建托管: 买家付款锁定
  ↓
卖家发货 → 买家确认收货
  ↓
资金释放给卖家
  ↓
Agent 赚服务费 (1-2%)
```

**对比闲鱼**：
- 无平台抽成 10%
- 托管保障资金安全
- 争议有仲裁

### 场景 7: 知识付费

```
用户: "我想学 Python"
  ↓
Agent 搜索附近 Available 的 Python 老师
  ↓
老师竞标 (价格 + 评分 + 擅长领域)
  ↓
匹配成功
  ↓
课程费用托管
  ↓
上课完成，确认收货
  ↓
资金释放，评价老师
```

### 场景 8: 宠物寄养

```
用户: "我要出差一周，想找寄养"
  ↓
Agent 搜索附近 Available 的宠物寄养 Agent
  ↓
寄养 Agent 竞标 (价格 + 评价 + 资质)
  ↓
匹配成功
  ↓
托管预付款 (50%)
  ↓
寄养完成，用户确认
  ↓
尾款释放，评价
```

### 场景 9: 租车服务

```
用户: "我要租一辆车去自驾游"
  ↓
Agent 搜索附近租车公司 Agent
  ↓
租车公司竞价
  ↓
Agent 选择: 价格最低 + 车况最好
  ↓
创建托管: 租金 + 押金锁定
  ↓
还车确认，无损 → 押金释放
  ↓
Agent 赚服务费
```

### 场景 10: 医疗预约

```
用户: "我想看牙医"
  ↓
Agent 搜索附近牙科诊所 Agent
  ↓
诊所竞价 (价格 + 评分 + 预约时间)
  ↓
匹配成功
  ↓
预约费用托管
  ↓
就诊完成，确认
  ↓
资金释放
```

### 场景 11: 法律咨询

```
用户: "我想咨询离婚法律"
  ↓
Agent 搜索律师 Agent
  ↓
律师竞标 (价格 + 经验 + 评分)
  ↓
匹配成功
  ↓
咨询费托管
  ↓
咨询完成，确认
  ↓
资金释放
```

### 场景 12: 代购服务

```
用户: "帮我从日本代购一个包"
  ↓
Agent 搜索代购 Agent
  ↓
代购 Agent 报价 (商品 + 运费 + 代购费)
  ↓
用户确认
  ↓
创建托管: 70% 预付款
  ↓
代购发货，用户确认收货
  ↓
尾款释放
```

---

## 🤝 参与贡献

欢迎提交 Issue 和 PR！

```bash
# 开发
npm run dev

# 测试
npm test

# 构建
npm run build
```

---

## 📜 License

BSD 3-Clause License

Copyright (c) 2024 Riocloud

---

## 📞 联系

- GitHub: https://github.com/Riocloud/cryptopaymentagent
- Email: dev@riocloud.com
