# 宝宝助手 (BabyCare) — PRD

> **Version:** 2.0 · **Date:** 2026-02-23 · **Author:** Cali
> **Status:** Phase 1 Complete — Phase 2 planned

---

## 1. Overview

一款轻量级 PWA，帮助孕妈妈记录和追踪孕期数据。纯本地存储，无后端/账号系统。

**一句话描述：** Duolingo 风格的孕期助手，离线可用，数据本地存储。

## 2. Goals

- ✅ 快速开始一次计数 session，一键点击记录胎动
- ✅ Cardiff Count-to-10 模式 + 可配置合并规则（3/5/10 分钟）
- ✅ 宫缩计时器 + 5-1-1 规则自动提醒
- ✅ 查看历史记录和趋势（按日期分组 + 7/30 天趋势图）
- ✅ 离线可用（PWA + IndexedDB + localStorage）
- ✅ Duolingo 风格：活泼、鼓励性、有成就感
- ✅ 孕期小贴士彩蛋（随机展示）
- ✅ 预产期设置 + 孕周计算 + 智能工具排序
- ✅ 无障碍：Base UI headless components + 键盘导航

## 3. Non-Goals

- ❌ 用户注册 / 多用户
- ❌ 后端 API / 数据库
- ❌ 医学建议或诊断
- ❌ 多语言（纯中文 UI，部分 UI 元素英文）

## 4. 技术栈

| Layer | Choice |
|-------|--------|
| Framework | Vite 7 + React 19 + TypeScript 5.9 |
| Styling | Tailwind CSS 4 (via @tailwindcss/vite) |
| UI Components | @base-ui/react (headless) + custom Duolingo-style design |
| Date Picker | react-day-picker (zh-CN locale) |
| Toasts | sileo |
| Storage | IndexedDB (Dexie.js 4) + localStorage |
| PWA | vite-plugin-pwa (Workbox) |
| Icons | Nucleo (glass, outline-duo-18, fill-duo-18) |
| Deploy | Vercel (planned) |
| Package Manager | pnpm |

## 5. Core Features

### 5.1 首页 Hub

- 工具卡片网格入口（数胎动、宫缩计时、待产包、喂奶记录）
- 概览 pill 胶囊统计（连续天数、今日胎动）
- Featured 预产期倒计时卡（显示天数 + 孕周）
- 智能工具排序：28周前宫缩优先，28周后胎动优先，过预产期宫缩优先

### 5.2 数胎动

- Cardiff Count-to-10 模式 + 可配置合并窗口（3/5/10 分钟）
- Session UI：进度环、鼓励文案、合并窗口状态、进度条
- 达标庆祝：confetti 动画 + 完成 Dialog
- 历史：趋势图 + 按日期分组 + 可展开时间线

### 5.3 宫缩计时

- 实时计时器（开始/结束宫缩）
- 自动计算间隔 + 持续时间
- 5-1-1 规则自动检测 + AlertDialog 医院提醒
- 历史摘要（平均时长、平均间隔）

### 5.4 设置

- 预产期（react-day-picker in bottom sheet Dialog）
- 胎动目标次数（NumberField stepper，1-50）
- 合并窗口时长（ToggleGroup segmented control）
- 外观模式（系统/浅色/深色 ToggleGroup）
- 数据管理（导出/导入 JSON + 清除确认 AlertDialog）

### 5.5 Duolingo 风格元素

- 大圆角、高饱和度配色（绿/橙/蓝/紫/红/黄）
- Mascot 浮动动画
- 鼓励反馈：每次有效胎动短文案 + 达标 confetti
- 连续打卡 streak
- 触觉反馈 (Haptic API)
- 孕期小贴士（TipBanner，50% 随机展示）

## 6. 页面结构

```
/                                    → 首页 Hub（Layout）
/history                             → 历史记录（Layout, Tabs + Collapsible）
/settings                            → 设置（Layout）
/tools/kick-counter                  → 数胎动首页（Layout）
/tools/kick-counter/session          → 数胎动 session（全屏）
/tools/contraction-timer             → 宫缩计时首页（Layout）
/tools/contraction-timer/session/:id → 宫缩 session（全屏）
```

HashRouter, SPA routing.

## 7. 数据存储

- **IndexedDB** (Dexie.js): `sessions`, `contractionSessions`, `contractions`
- **localStorage**: `babycare-settings` (goalCount, mergeWindowMinutes, colorMode, dueDate)
- 无云同步，export/import JSON 手动备份
- 版本化 schema (db.version(N+1))

## 8. PWA 要求

- ✅ manifest.json — 名称、图标、主题色
- ✅ Service Worker — Workbox 离线缓存
- ✅ Add to Home Screen
- ✅ 全屏 standalone 模式
- ✅ Safe area insets 处理

## 9. Open Questions

1. **域名** — 部署用什么域名？
2. **待产包** — Phase 2 的预置物品清单内容确认

---

*医学免责声明：本 app 仅为记录工具，不提供医学建议。如有异常请咨询医生。*
