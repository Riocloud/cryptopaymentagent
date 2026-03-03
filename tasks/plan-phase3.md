# CryptoPaymentAgent - Phase 3 技术方案

## 概述

Phase 1: 单 Agent 支付
Phase 2: Agent 间交易匹配

Phase 3: **DeFi 收益优化** — 用户的钱不只是用来支付，还能自动生利。Agent 帮用户管理闲置资金，找最优收益途径。

---

## 1. 核心功能

### 1.1 收益账户

每个用户有一个 "收益账户"（Yield Account）：

```typescript
interface YieldAccount {
  userId: string;
  
  // 总资产（USD 估值）
  totalValueUSD: number;
  
  // 持仓
  holdings: {
    token: string;
    chain: string;
    amount: number;
    valueUSD: number;
    protocol: string;     // 哪个协议
    apy: number;           // 当前 APY
  }[];
  
  // 收益历史
  yields: {
    date: Date;
    amountUSD: number;
    source: string;       // 利息/奖励/套利
  }[];
  
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  autoCompound: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.2 收益策略

```typescript
interface YieldStrategy {
  id: string;
  name: string;
  description: string;
  
  // 风险级别
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  
  // 策略逻辑
  chains: string[];           // 适用链
  tokens: string[];           // 适用代币
  protocols: string[];        // 目标协议
  
  // 参数
  minAmountUSD: number;       // 最小投入
  rebalanceThreshold: number; // 调仓阈值 (%)
  harvestThreshold: number;   // 收割阈值 (USD)
  
  // 预期收益
  expectedAPY: { min: number; max: number };
  
  // 自动操作
  autoDeposit: boolean;
  autoWithdraw: boolean;
  autoCompound: boolean;
}
```

### 预设策略

| 策略 | 风险 | 预期 APY | 方式 |
|------|------|----------|------|
| 稳定币理财 | 低 | 3-8% | USDC/USDT 存息协议 |
| 流动性做市 | 中 | 8-20% | DEX 流动性池 |
| 杠杆收益 | 高 | 20-50% | 借贷 + 复投 |
| 跨链套利 | 高 | 浮动 | 跨链价差套利 |

---

## 2. 支持的协议

### 2.1 借贷协议

| 链 | 协议 | 代币 | 基础 APY |
|----|------|------|----------|
| Ethereum | Aave | USDC | 3-5% |
| Solana | Port Finance | USDC | 6-8% |
| Arbitrum | Radiant | USDC | 4-6% |
| Base | Sky | USDC | 5-7% |

### 2.2 流动性协议

| 链 | 协议 | 池子 | APY |
|----|------|------|-----|
| Solana | Raydium | USDC/USDT | 10-25% |
| Uniswap L3 | Arbitrum | USDC/ETH | 15-30% |
| Orca | Solana | USDC/USDT | 8-20% |

### 2.3 收益聚合器

| 协议 | 说明 |
|------|------|
| Yearn | 自动复投策略 |
| Beefy | 多链收益优化 |
| Port Finance | Solana 借贷 |

---

## 3. 收益优化引擎

### 3.1 核心逻辑

```
用户充值 → 进入收益账户 → 
→ 引擎扫描所有协议 APY → 
→ 智能分配资金 → 
→ 执行存入 → 
→ 定期检查调仓 → 
→ 收益复投或提取
```

### 3.2 分配算法

```typescript
interface Allocation {
  protocol: string;
  chain: string;
  token: string;
  amountUSD: number;
  percent: number;  // 占比
}

function optimizeAllocation(
  totalAmountUSD: number,
  strategies: YieldStrategy[],
  currentHoldings: Holding[]
): Allocation[] {
  
  // 1. 按风险级别筛选
  const validStrategies = strategies.filter(
    s => s.riskLevel === user.riskLevel
  );
  
  // 2. 查各协议实时 APY
  const protocolAPYs = await fetchProtocolAPYs(validStrategies);
  
  // 3. 计算最优分配
  // - 分散风险：不把 >30% 放单一协议
  // - 追求收益：给高 APY 分配更多
  // - 考虑 Gas：太小额不划算
  
  // 4. 返回分配方案
  return allocations;
}
```

### 3.3 调仓逻辑

```typescript
// 触发条件
- APY 差异 > 5%
- 总收益 > $100 (收割)
- 协议风险事件

// 调仓流程
1. 计算当前持仓 vs 目标分配
2. 如果偏差 > 阈值 → 发起调仓
3. 从低 APY 协议退出
4. 存入高 APY 协议
5. 更新持仓记录
```

---

## 4. 自动复投 (Auto-Compound)

### 复投策略

```typescript
interface CompoundConfig {
  enabled: boolean;
  
  // 复投频率
  frequency: 'daily' | 'weekly' | 'threshold';
  thresholdUSD: number;  // 累积到 $50 再复投
  
  // 复投方式
  method: 'harvest_swap' | 'harvest_reinvest';
  
  // Gas 优化
  maxGasUSD: number;    // Gas 超过则跳过
  batchThresholdUSD: number; // 合并多笔
}
```

### 复投执行

```
1. 扫描所有持仓协议的待领取收益
2. 计算复投 Gas 成本
3. 如果收益 > Gas + 阈值 → 执行
4. 领取收益代币
5. Swap 到目标代币 (如 USDC)
6. 存入协议
7. 更新持仓
```

---

## 5. 风险控制

### 5.1 风险评级

```typescript
interface RiskConfig {
  // 单一协议上限
  maxPerProtocolPercent: number;  // 默认 30%
  
  // 单一链上限
  maxPerChainPercent: number;    // 默认 60%
  
  // 滑点保护
  maxSlippagePercent: number;   // 默认 1%
  
  // 断路器
  circuitBreaker: {
    // TVL 暴跌 > 20% 自动撤出
    tvlDropThreshold: number;
    // APY 暴跌 > 50% 预警
    apyDropThreshold: number;
  };
  
  // 保险池
  insuranceEnabled: boolean;
}
```

### 5.2 监控告警

```
- 日常: 收益正常 +0.01% ~ +0.1%/天
- 预警: APY 异常 / 协议 TVL 异常
- 告急: 协议被盗 / 合约漏洞 → 自动撤出
```

---

## 6. API 设计

### 用户端

```typescript
// 开通收益账户
POST /api/v1/yield/enable
Body: { riskLevel, autoCompound }

// 充值
POST /api/v1/yield/deposit
Body: { chain, token, amount }

// 提现
POST /api/v1/yield/withdraw
Body: { amountUSD, token }

// 查看持仓
GET /api/v1/yield/holdings

// 查看收益
GET /api/v1/yield/earnings

// 调整策略
PUT /api/v1/yield/strategy
Body: { riskLevel, autoCompound, rebalanceThreshold }

// 手动调仓
POST /api/v1/yield/rebalance
```

### 管理端

```typescript
// 添加/更新协议
POST /api/v1/admin/protocol
Body: { protocol, chain, token, apySource }

// 手动触发收割
POST /api/v1/admin/harvest
Body: { userId? }

// 风险控制配置
PUT /api/v1/admin/risk-config

// 查看全局收益统计
GET /api/v1/admin/yield/stats
```

---

## 7. 技术实现

### 7.1 架构

```
┌─────────────────────────────────────────┐
│           Yield Engine                  │
│  (策略计算 + 调仓决策)                   │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┴─────────┐
    │                   │
┌───▼────┐        ┌─────▼────┐
│ Scanner │        │ Executor │
│ APY监控 │        │ 链上操作 │
│ 风险检测│        │ 存入/提取│
└────┬────┘        └────┬────┘
     │                 │
┌────▼─────────────────▼────┐
│      Protocol Adapters    │
│  Aave | Raydium | Port    │
└───────────────────────────┘
```

### 7.2 数据源

```typescript
// APY 数据源
- DeFi Llama API (聚合多协议)
- 协议官方 API (实时)
- 自定义 RPC 查询

// 风险数据
- DeFi Llama (TVL)
- DefiSafety (安全评分)
- 官方 Discord/Twitter (事件监控)
```

### 7.3 链上操作

```typescript
// 使用 SDK 执行
- @solana/spl-token + @raydium-sdk (Solana)
- ethers.js + abi (EVM)
- @tronscan/client (Tron)

// 交易签名
- 用户托管钱包 (Phase 1 的 keystore)
- MPC 签名服务
- 硬件钱包 (可选)
```

---

## 8. 收益分配

### 用户 vs 平台

| 收益 | 用户 | 平台 |
|------|------|------|
| 基础利息 | 90% | 10% |
| 平台补贴 (初期) | 100% | 0% |
| 邀请奖励 | 80% | 20% |

### 示例

```
用户存 $10,000 USDC
→ 协议年化 5%
→ 年收益 $500
→ 平台收 10% = $50
→ 用户实得 $450
```

---

## 9. TODO 清单

### Week 11: 基础设施
- [ ] Yield Account 数据模型
- [ ] 收益引擎核心架构
- [ ] 协议适配器基类
- [ ] 收益计算模块

### Week 12: 协议集成
- [ ] Aave 接入 (Ethereum/Arbitrum)
- [ ] Raydium 接入 (Solana)
- [ ] Port Finance 接入 (Solana)
- [ ] APY 实时抓取

### Week 13: 策略与调仓
- [ ] 策略分配算法
- [ ] 调仓执行逻辑
- [ ] Gas 优化
- [ ] 自动复投

### Week 14: 风险控制
- [ ] 风险配置
- [ ] 监控告警
- [ ] 断路器
- [ ] 保险池 (可选)

### Week 15: 测试 & 上线
- [ ] 测试网部署
- [ ] 模拟收益测试
- [ ] 压力测试
- [ ] 安全审计 (可选)

---

## 10. 商业模式

### 收入

| 来源 | 方式 | 比例 |
|------|------|------|
| 收益分成 | 每笔收益 5-10% | 主要 |
| 提现费 | 0.1% | 少 |
| 高级策略 | 订阅费 | 未来 |

### 初期策略

- **0 分成** — 吸引用户存钱
- **平台补贴** — 贴息吸引 TVL
- **等规模起来再收费**

---

## 11. Phase 3 完整版图

```
Phase 1: 支付能力 (Agent → 商户)
Phase 2: 匹配能力 (用户 ←→ Agent)
Phase 3: 理财能力 (资金增值)
         ↓
    ┌────┴────┐
    ↓         ↓
 借贷套利   流动性
    ↓         ↓
   ...
```

---

## 12. 后续 Phase (可选)

### Phase 4: 信用系统
- 用户/Agent 信用评分
- 预付款/信用额度
- 贷款功能

### Phase 5: 合规
- KYC/AML
- 税务报告
- 持牌运营
