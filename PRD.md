# 数胎动 (Kick Counter) — PRD

> **Version:** 0.1 · **Date:** 2026-02-23 · **Author:** Nick (CTO)
> **Status:** Draft — Pending Cali's review

---

## 1. Overview

一款轻量级 PWA，帮助孕妈妈记录和追踪胎动。仅供个人使用（Cali 的太太），不需要后端/账号系统。

**一句话描述：** Duolingo 风格的胎动计数器，离线可用，数据本地存储。

## 2. Goals

- ✅ 快速开始一次计数 session，一键点击记录胎动
- ✅ Cardiff Count-to-10 模式 + 5 分钟合并规则（5 分钟内多次算 1 次有效胎动，记录达到 10 次所需时间）
- ✅ 查看历史记录和趋势
- ✅ 离线可用（PWA + localStorage/IndexedDB）
- ✅ Duolingo 风格：活泼、鼓励性、有成就感
- ✅ 孕期小贴士彩蛋（随机展示）

## 3. Non-Goals

- ❌ 用户注册 / 多用户
- ❌ 后端 API / 数据库
- ❌ 医学建议或诊断
- ❌ 多语言（纯中文 UI）

## 4. 技术栈

| Layer | Choice |
|-------|--------|
| Framework | Vite + React |
| Styling | Tailwind CSS |
| UI | shadcn/ui + 自定义 Duolingo 风格组件 |
| Storage | IndexedDB (via Dexie.js 或 idb) |
| PWA | vite-plugin-pwa |
| Deploy | Vercel |
| Package Manager | pnpm |

> ✅ 已确认 Vite + React

## 5. Core Features

### 5.1 计数 Session

**入口：** 大按钮「开始数胎动」

**Session 流程：**
1. 点击开始 → 计时器启动
2. 每次感受到胎动 → 点击大按钮
3. **5 分钟合并规则：**
   - 第一次点击开始一个 5 分钟窗口
   - 窗口内的所有点击合并为 1 次有效胎动
   - 窗口结束后，下一次点击开启新窗口
4. 实时显示：已用时间、有效胎动次数、当前窗口状态
5. 手动结束 session，或到达目标（如 10 次）自动提示

**Session 数据模型：**
```typescript
interface KickSession {
  id: string
  startedAt: Date
  endedAt: Date | null
  taps: Tap[]           // 所有原始点击
  kickCount: number     // 合并后的有效次数
  goalReached: boolean   // 是否达到目标次数
}

interface Tap {
  timestamp: Date
  windowId: number      // 属于第几个 5 分钟窗口
}
```

### 5.2 Session 进行时 UI

```
┌─────────────────────────────┐
│      ⏱ 00:23:45             │
│                             │
│     ╭───────────────╮       │
│     │               │       │
│     │    👶 ×6      │       │  ← 大圆按钮，点击记录
│     │               │       │
│     ╰───────────────╯       │
│                             │
│  ┌─ 当前窗口 ──────────────┐ │
│  │ 🟢 活跃中 · 剩余 3:42   │ │  ← 5分钟窗口倒计时
│  │ 本窗口点击: 3 次        │ │
│  └────────────────────────┘ │
│                             │
│  目标: 10 次  ████████░░ 6  │  ← 进度条
│                             │
│  [ 结束 Session ]           │
└─────────────────────────────┘
```

### 5.3 历史记录

- 按日期分组的 session 列表
- 每条显示：日期时间、持续时长、有效胎动次数
- 简单的趋势图（最近 7 天 / 30 天的每日胎动次数）
- 点击展开查看 session 详情（时间线视图）

### 5.4 Duolingo 风格元素

- **大圆角、高饱和度配色** — 主色绿色 (#58CC02)，辅助橙/紫/蓝
- **Mascot / 角色** — 可以是一个可爱的小宝宝 emoji 或自定义插画
- **鼓励反馈：**
  - 每次有效胎动：短动画 + 鼓励文案（"太棒了！"、"宝宝很活跃！"、"继续加油！"）
  - 达到目标：🎉 庆祝动画（confetti / 星星）
  - 连续打卡：streak 显示（"连续 5 天记录！"）
- **音效 / 触觉反馈** — 点击时轻微震动 (Haptic API)
- **圆润的卡片式布局**

### 5.5 孕期小贴士（彩蛋）

- 内置一组孕期小贴士（饮食、运动、睡眠、心理等）
- **触发时机：**
  - Session 达标后的庆祝页面随机展示一条
  - 历史记录页偶尔展示
  - 打开 app 时随机 splash
- 贴士内容可硬编码在前端，后续可扩展
- 风格：温暖、实用、不说教，Duolingo 的「你知道吗？」口吻

### 5.6 设置

- 目标次数（默认 10）
- 合并窗口时长（默认 5 分钟，可调 3/5/10 分钟）
- ~~Session 提醒~~ （暂不需要，由 Baymax 在家群提醒）
- 数据导出（JSON）
- 深色模式

## 6. 页面结构

```
/               → 首页（开始 session / 快速入口）
/session        → 计数进行中
/history        → 历史记录
/settings       → 设置
```

SPA 路由，hash-based 或 client-side routing。

## 7. 数据存储

- **IndexedDB** 存 session 数据（Dexie.js 推荐）
- **localStorage** 存设置项
- 无云同步，所有数据本地
- 考虑 export/import JSON 做手动备份

## 8. PWA 要求

- `manifest.json` — 名称、图标、主题色
- Service Worker — 离线缓存所有静态资源
- 支持 Add to Home Screen
- 全屏模式 (`display: standalone`)

## 9. 里程碑

| Phase | 内容 | 预估 |
|-------|------|------|
| **v0.1** | 核心计数功能 + 5 分钟合并 + session 记录 | 1-2 天 |
| **v0.2** | 历史记录 + 趋势图 + Duolingo 动效 | 1 天 |
| **v0.3** | PWA 离线 + 设置 + 导出 | 半天 |
| **v1.0** | Polish + 部署 | 半天 |

## 10. Decisions

- ✅ Vite + React
- ✅ 纯中文 UI
- ✅ 无定时提醒（Baymax 负责）
- ✅ Mascot：Cali 已生成插画（待下载放入项目）
- ✅ Cardiff Count-to-10 + 5 分钟合并法
- ✅ 孕期小贴士彩蛋

## 11. Open Questions

1. **数据迁移** — 她之前用的 app 数据需要导入吗？
2. **域名** — 用什么域名部署？

---

*医学免责声明：本 app 仅为记录工具，不提供医学建议。如有异常请咨询医生。*
