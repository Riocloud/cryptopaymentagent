# Lessons - CryptoPaymentAgent 开发

## 错误 & 修复

### 1. TypeScript @types/node 安装问题
**问题**: npm install 后 @types/node 存在但不生效，tsc 报 "Cannot find type definition file for 'node'"
**原因**: npm 全局配置 `omit=dev` 导致 devDependencies 不安装
**修复**: 
```bash
npm install @types/node --include=dev
```

### 2. Prisma SQLite 不支持数组
**问题**: schema 中 `permissions String[]` 在 SQLite 报错
**修复**: 改用逗号分隔字符串 `permissions String`
**API 也需要相应修改**: `permissions.join(',')`

### 3. Foreign Key 约束
**问题**: 创建 ExchangeBinding 时 userId 外键约束失败
**修复**: API 层自动创建不存在的用户
```typescript
let user = await prisma.user.findUnique({ where: { id: userId } });
if (!user) {
  user = await prisma.user.create({ data: { id: userId } });
}
```

### 4. Git merge 问题
**问题**: remote 有 README，本地也有，push 被拒
**解决**:
```bash
git pull origin main --allow-unrelated-histories --no-rebase -s ours
```

## 验证清单 (后续开发请遵守)

- [x] Plan mode: 写 tasks/todo.md
- [x] Verify: 实际运行 API 测试
- [ ] Use subagents: 复杂任务可用
- [ ] Update lessons: 每次出错要写

## 下次开发注意事项

1. 改 schema 后要 `npx prisma generate && npx prisma db push`
2. 用 SQLite 方便测试，生产再换 PostgreSQL
3. 上线前用真实 API 测试 (Binance/OKX)
