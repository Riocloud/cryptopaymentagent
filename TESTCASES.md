# SwarmPay Test Cases

## 运行测试

```bash
npm install
npx prisma generate
npx prisma db push
npm run test
```

---

## Phase 1: 支付模块

### 1.1 交易所绑定

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 绑定 Binance | valid API key | 绑定成功 | ✅ | PASS |
| 绑定无效交易所 | exchange=invalid | 返回错误 | ✅ | PASS |
| 缺少参数 | 缺少 apiKey | 返回错误 | ✅ | PASS |

```bash
# 绑定成功
curl -X POST http://localhost:3000/api/v1/exchange/bind \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","exchange":"binance","apiKey":"x","apiSecret":"x"}'

# 绑定失败
curl -X POST http://localhost:3000/api/v1/exchange/bind \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","exchange":"invalid","apiKey":"x","apiSecret":"x"}'
```

### 1.2 路由引擎

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 查询支持的链 | GET /router/chains | 返回 7 条链 | ✅ | PASS |
| 计算路由 | solana→ethereum | 返回路由 | ✅ | PASS |
| 缺少参数 | 缺少 amountUSD | 返回错误 | ✅ | PASS |

```bash
# 获取支持的链
curl http://localhost:3000/api/v1/router/chains

# 计算路由
curl -X POST http://localhost:3000/api/v1/router/routes \
  -H "Content-Type: application/json" \
  -d '{"amountUSD":50,"fromChain":"solana","toChain":"ethereum"}'
```

### 1.3 钱包

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建钱包 | valid address | 创建成功 | ✅ | PASS |
| 导出私钥 | wrong passphrase | 解密失败 | ✅ | PASS |

### 1.4 支付 (⚠️ BUG)

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建支付 | valid data | pending | ✅ | PASS |
| 执行支付 | - | **未实现** | ❌ | **FAIL** |

```bash
# 创建支付
curl -X POST http://localhost:3000/api/v1/payment \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","amountUSD":50,"fromChain":"solana","toChain":"ethereum","toAddress":"0x123"}'

# ⚠️ BUG: 支付状态永远是 pending，不会真正执行
```

---

## Phase 2: Intent & Matching

### 2.1 Intent

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建 Intent | valid data | pending | ✅ | PASS |
| 缺少必填 | 无 userId | 错误 | ✅ | PASS |
| wantAds=true | 接收广告 | ✅ | ✅ | PASS |

### 2.2 Agent 注册

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 注册 Agent | valid data | registered | ✅ | PASS |
| 无 capabilities | 错误 | ✅ | PASS |

### 2.3 广告竞标

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 出价 | valid bid | 创建成功 | ✅ | PASS |
| 让利计算 | $40 original | $8 (20%) | ✅ | PASS |

### 2.4 群组

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建群组 | 3 用户 | group created | ✅ | PASS |
| 计算分摊 | $90, ads $15 | $25/人 | ✅ | PASS |

---

## Phase 2.5: Trust

### 3.1 Escrow

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建托管 | $30 | locked | ✅ | PASS |
| 释放 | release=true | released | ✅ | PASS |
| 退款 | release=false | refunded | ✅ | PASS |
| 双重释放 | 再次释放 | 错误 | ✅ | PASS |

```bash
# 创建托管
curl -X POST http://localhost:3000/api/v1/escrow \
  -H "Content-Type: application/json" \
  -d '{"payerId":"user1","payeeId":"driver1","amountUSD":30}'

# 释放
curl -X POST http://localhost:3000/api/v1/escrow/release \
  -H "Content-Type: application/json" \
  -d '{"escrowId":"xxx","release":true}'
```

### 3.2 Reputation

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 评分 5 分 | score=5 | 100分 | ✅ | PASS |
| 评分 -1 分 | score=-1 | 降分 | ✅ | PASS |

### 3.3 Bond

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 缴保证金 | $500 | deposited | ✅ | PASS |
| 验证可信 | minBond=100 | trusted=true | ✅ | PASS |

---

## Phase 3: Yield

### 4.1 账户

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 创建账户 | riskLevel=moderate | created | ✅ | PASS |
| 存入 | 1000 USDC | deposited | ✅ | PASS |
| 预期收益 | 30天 | $16.44 | ✅ | PASS |

### 4.2 提现

| 测试 | 输入 | 预期 | 实际 | 状态 |
|------|------|------|------|------|
| 正常提现 | $500 | success | ✅ | PASS |
| 超额提现 | $1000 (余额不足) | 错误 | ✅ | PASS |
| 提现后删除零持仓 | 全部提现 | holdings=[] | ✅ | PASS |

---

## 🐛 已知 Bug

### Bug 1: 支付未执行
- **位置**: `src/api/payment.ts`
- **问题**: 支付创建后永远是 `pending` 状态，没有真正执行链上交易
- **影响**: 用户付款但不会真正转账
- **修复**: 需要实现 Worker 队列 + 真实交易所 API 调用

### Bug 2: 收益是 Mock
- **位置**: `src/phase3/yield.ts`
- **问题**: APY 是硬编码数值，不是真实 DeFi 数据
- **影响**: 收益只是数据库计算，没有真的存入协议
- **修复**: 需要接入 DeFi Llama API + 真实链上操作

### Bug 3: 群组存内存
- **位置**: `src/phase2/ads.ts`
- **问题**: Groups 存在内存Map，服务器重启丢失
- **影响**: 重启后群组数据丢失
- **修复**: 迁移到数据库

### Bug 4: Agent 验证缺失
- **位置**: `src/api/phase2-ads.ts`
- **问题**: 竞标时没检查 Agent 是否可信
- **影响**: 恶意 Agent 可能接单后不服务
- **修复**: 竞标前调用 `isTrustedAgent()` 检查

---

## 📋 完整测试脚本

```bash
#!/bin/bash
BASE_URL="http://localhost:3000/api/v1"

echo "=== SwarmPay API Tests ==="

# Health
echo "1. Health check"
curl -s $BASE_URL/health

# Router
echo -e "\n2. Get chains"
curl -s $BASE_URL/router/chains

echo -e "\n3. Calculate route"
curl -s -X POST $BASE_URL/router/routes \
  -H "Content-Type: application/json" \
  -d '{"amountUSD":50,"fromChain":"solana","toChain":"ethereum"}'

# Intent
echo -e "\n4. Create intent"
INTENT=$(curl -s -X POST $BASE_URL/intent \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","type":"transport","intent":{"action":"ride"},"preferences":{"wantAds":true}}')
echo $INTENT
INTENT_ID=$(echo $INTENT | jq -r '.id')

# Agent
echo -e "\n5. Register agent"
curl -s -X POST $BASE_URL/agent/register \
  -H "Content-Type: application/json" \
  -d '{"agentId":"driver1","name":"Test Driver","capabilities":[{"type":"transport","acceptAds":true}]}'

# Bid
echo -e "\n6. Create bid"
curl -s -X POST $BASE_URL/agent/bid \
  -H "Content-Type: application/json" \
  -d '{"agentId":"driver1","intentId":"'$INTENT_ID'","bidType":"driver_bid","amount":5,"originalPrice":40}'

# Offers
echo -e "\n7. Get offers"
curl -s $BASE_URL/intent/$INTENT_ID/offers

# Escrow
echo -e "\n8. Create escrow"
curl -s -X POST $BASE_URL/escrow \
  -H "Content-Type: application/json" \
  -d '{"payerId":"user1","payeeId":"driver1","amountUSD":30}'

# Rating
echo -e "\n9. Create rating"
curl -s -X POST $BASE_URL/rating \
  -H "Content-Type: application/json" \
  -d '{"raterType":"user","raterId":"user1","targetType":"agent","targetId":"driver1","score":5}'

# Bond
echo -e "\n10. Deposit bond"
curl -s -X POST $BASE_URL/bond/deposit \
  -H "Content-Type: application/json" \
  -d '{"agentId":"driver1","amountUSD":500}'

# Yield
echo -e "\n11. Create yield account"
curl -s -X POST $BASE_URL/yield \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","riskLevel":"moderate"}'

echo -e "\n12. Deposit"
curl -s -X POST $BASE_URL/yield/deposit \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","token":"USDC","chain":"ethereum","amount":1000}'

echo -e "\n=== Tests Complete ==="
```
