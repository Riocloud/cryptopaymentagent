# CryptoPaymentAgent - Phase 2 技术方案

## 核心原则：Agent 广告让利

```
传统 Uber: 抽 25%
Agent:     抽 5% (广告收入已覆盖成本)
           用户省 20%！
```

---

## 1. 核心概念：意图市场 (Intent Market)

### 什么是 Intent？
用户告诉 Agent 一个目标（"我要打车去机场"），而不是具体操作。

Agent 自动：
1. 理解意图
2. 发布广告（让商家/司机竞标）
3. 找到匹配的其他用户
4. 组建临时群组
5. 分配任务给其他 Agent（司机 Agent）
6. 执行支付结算（Agent 抽 5%）

```
用户 Intent → Agent Registry → 广告竞标 → Matcher → Group Formation → Settlement
                                   ↑
                              让利给用户
```

---

## 2. 用户意图注册

```typescript
interface UserIntent {
  id: string;
  userId: string;
  type: 'transport' | 'food' | 'shopping' | 'service' | 'custom';
  
  intent: {
    action: string;
    destination?: { lat: number; lng: number; address?: string };
    time?: string;
    budget?: number;
    params: Record<string, any>;
  };
  
  preferences: {
    maxWaitMinutes: number;
    maxGroupSize: number;
    minRating?: number;
    wantAds: boolean;  // 是否愿意接收广告让利
  };
  
  status: 'pending' | 'matching' | 'matched' | 'completed' | 'cancelled';
}
```

---

## 3. Agent 广告系统 (核心新增)

### 广告类型

| 类型 | 描述 | 示例 |
|------|------|------|
| **driver_bid** | 司机付费获取订单 | 司机出 $5 获得此乘客 |
| **restaurant_promo** | 餐厅付费推广 | 新用户 8 折 |
| **service_offer** | 服务商竞价 | 家政、维修竞价 |
| **affiliate** | 联盟返佣 | 推荐信用卡返现 |

### 广告出价

```typescript
interface AgentBid {
  agentId: string;
  intentId: string;
  bidType: 'driver_bid' | 'restaurant_promo' | 'service_offer' | 'affiliate';
  
  // 出价内容
  amount: number;        // 愿意支付的费用
  originalPrice?: number; // 原始价格
  discount?: string;     // 给用户的让利: "25%"
  
  // 附加信息
  eta?: number;          // 预计到达时间(分钟)
  rating?: number;       // 评分
  message?: string;      // 附加消息
  
  bidTime: Date;
}
```

### 让利计算引擎

```typescript
interface OfferResult {
  // 原始价格
  originalPrice: number;
  
  // Agent 抽成 (5%)
  agentFee: number;
  
  // 让利给用户
  userDiscount: number;
  
  // 用户实际支付
  userPays: number;
  
  // Agent 净收入 (让利差额)
  agentProfit: number;
}

function calculateBenefit(bid: AgentBid, originalPrice: number): OfferResult {
  // 假设传统平台抽 25%
  const traditionalFee = originalPrice * 0.25;
  
  // Agent 只抽 5%
  const agentFee = originalPrice * 0.05;
  
  // 让利给用户 = 传统抽成 - Agent 抽成
  const userDiscount = traditionalFee - agentFee;
  
  return {
    originalPrice,
    agentFee,
    userDiscount,
    userPays: originalPrice - userDiscount,
    agentProfit: agentFee // 实际是 bid.amount - 成本
  };
}
```

### 广告匹配算法

```
1. 用户发起 Intent (wantAds = true)
2. Agent 收到Intent，发布广告
3. 多个 Service Agent 竞标
4. 计算每个出价的让利金额
5. 选择: 用户省钱最多 + Agent 收益最优 的组合
6. 返回 Offer 给用户确认
```

---

## 4. Agent 注册与发现

```typescript
interface AgentCapability {
  type: 'driver' | 'restaurant' | 'shop' | 'service' | 'any';
  location?: { lat: number; lng: number; radius: number };
  vehicleType?: 'car' | 'motorcycle' | 'bike';
  workingHours?: { start: string; end: string };
  rating?: number;
  priceTier?: 'low' | 'medium' | 'high';
  // 广告相关
  acceptAds: boolean;      // 是否愿意打广告
  adBudget?: number;       // 每日广告预算
}

interface RegisteredAgent {
  agentId: string;
  name: string;
  capabilities: AgentCapability[];
  walletAddress: string;
  apiEndpoint: string;
  status: 'available' | 'busy' | 'offline';
  lastHeartbeat: Date;
}
```

---

## 5. LBS 匹配引擎

### 匹配算法

```
1. 收到用户 Intent
2. 根据 type + location 筛选可用 Agent
3. 按距离/价格/评分排序
4. 如果 wantAds=true，触发广告竞标
5. 计算让利，返回最佳 Offer
6. 通知所有参与者
```

---

## 6. 自动建群与分摊

### 群组生命周期

```
Intent A (用户) → 匹配到 Intent B,C → 创建 Group 
→ 广告 Offer 返回 → 用户确认 Offer
→ Service Agent 接单 → 完成任务 
→ 结算 (Agent 抽 5%) → 解散 Group
```

### 分摊逻辑

```typescript
function calculateSplitWithAds(group: PaymentGroup): SplitResult {
  const { totalAmountUSD, adsRevenue } = group;
  
  // 传统分摊
  const baseShare = totalAmountUSD / group.members.length;
  
  // 广告让利
  const discountPerUser = adsRevenue / group.members.length;
  
  return {
    perUser: baseShare - discountPerUser,  // 用户实际付的
    agentFee: totalAmountUSD * 0.05,        // Agent 抽 5%
    userSavings: discountPerUser            // 用户省了多少
  };
}
```

---

## 7. API 设计

### 用户端

```typescript
// 注册 Intent
POST /api/v1/intent
Body: { 
  type, 
  intent, 
  preferences: { wantAds: true }  // 愿意接收广告
}

// 获取让利 Offer
GET /api/v1/intent/:id/offers

// 确认加入群组 (含让利)
POST /api/v1/group/:id/confirm

// 查看让利明细
GET /api/v1/group/:id/invoice
```

### Agent 端

```typescript
// 注册 Agent (含广告设置)
POST /api/v1/agent/register
Body: { 
  name, 
  capabilities: [{ type: 'driver', acceptAds: true, adBudget: 100 }],
  walletAddress,
  apiEndpoint
}

// 竞标 (出价获取订单)
POST /api/v1/agent/bid
Body: { 
  intentId, 
  bidType: 'driver_bid',
  amount: 5,           // 愿意付 $5 获取此单
  originalPrice: 40,
  discount: '25%'      // 让利给用户
}

// 接受任务
POST /api/v1/agent/task/:id/accept

// 查看广告收入
GET /api/v1/agent/:id/earnings
```

---

## 8. 商业模式

### Agent 收入来源

| 来源 | 方式 | 比例 |
|------|------|------|
| 商家广告费 | 餐厅/商店付费推广 | 主要 |
| 司机竞价 | 司机付费获取订单 | 主要 |
| 联盟返佣 | 推荐商品/服务 | 少 |
| 交易手续费 | 支付抽 5% | 少 |

### 让利示例

| 场景 | 传统价格 | Agent 抽 5% | 用户省 |
|------|----------|--------------|--------|
| 打车 | $40 | $2 | $8 (20%) |
| 外卖 | $30 | $1.5 | $6 (20%) |
| 购物 | $100 | $5 | $20 (20%) |

### 初期策略
- **不收交易手续费** — 靠广告费盈利
- **补贴启动** — 吸引用户和 Agent
- **等网络效应起来再收费**

---

## 9. TODO 清单

### Week 6: 基础设施
- [ ] Intent 数据模型 (含 wantAds)
- [ ] Agent Registry (含广告设置)
- [ ] 心跳机制
- [ ] PostGIS/Redis Geohash 集成

### Week 7: 广告系统
- [ ] 广告出价 API
- [ ] 让利计算引擎
- [ ] Offer 生成逻辑
- [ ] 广告匹配算法

### Week 8: 匹配引擎
- [ ] 匹配算法 (含广告权重)
- [ ] LBS 查询优化
- [ ] 匹配状态机
- [ ] WebSocket 实时通知

### Week 9: 群组与结算
- [ ] Group CRUD
- [ ] 分摊计算 (含让利)
- [ ] 支付扣款集成 (复用 Phase 1)
- [ ] 结算流程

### Week 10: 测试 & Demo
- [ ] 端到端流程测试
- [ ] 模拟用户 + 模拟 Agent Demo
- [ ] 广告让利计算测试
- [ ] 性能压测

---

## 10. 后续 Phase (可选)

### Phase 3: DeFi 收益
- 用户闲置资金自动理财
- 跨链收益优化
- 收益一部分作为让利返还用户
