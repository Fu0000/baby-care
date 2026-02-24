# 宝宝助手 Roadmap

> **Created:** 2026-02-23 · **Last updated:** 2026-02-23 · **Repo:** CaliCastle/babycare

## Phase 1: Hub 架构 + 宫缩计时器 ✅ COMPLETE
- [x] 重构为模块化 hub 架构（首页工具卡片入口）
- [x] 设置页增加预产期设置（react-day-picker + bottom sheet）
- [x] 预产期倒计时显示（首页 featured pill + 孕周数）
- [x] 宫缩计时器（记录间隔+持续时间，5-1-1 规则提醒）
- [x] 宫缩历史记录
- [x] 保留现有数胎动功能不变
- [x] Smart tool ordering based on pregnancy stage (getWeeksPregnant)

## Phase 1.5: UI Polish + Base UI Migration ✅ COMPLETE
- [x] Migrate to Base UI headless components (Tabs, Collapsible, Dialog, AlertDialog, Progress, NumberField, ToggleGroup, ScrollArea)
- [x] Sticky header with progressive backdrop blur (StickyHeader component)
- [x] Floating dock with concentric corner radius + PWA bottom positioning
- [x] Home page: pill-shaped stat capsules, featured due date card
- [x] Settings: bottom sheet date picker, unified data management list, ToggleGroup segmented controls
- [x] Toast notifications via sileo (replacing native alert())
- [x] TipBanner muted styling
- [x] Personal footer ("Made with care by Cali")

## Phase 2: 待产包清单 ✅ COMPLETE
- [x] Checklist 组件（妈妈包/宝宝包/证件包分组）
- [x] 预置常见物品，支持自定义添加
- [x] 进度百分比显示

## Phase 3: 喂奶记录 ✅ COMPLETE
- [x] 亲喂（左/右侧切换 + 计时）
- [x] 奶瓶喂养（奶量快捷输入）
- [x] 吸奶（计时 + 奶量记录）
- [x] 喂奶间隔提醒（首页"距上次喂奶 X 小时"stat pill）
- [x] 历史记录（History 第三 tab，按日分组）
- [x] 数据导出/导入/清除支持

## Phase 3.5: Liveline Charts (In Progress)
- [x] History — Kick trend chart (daily totals, 7/30-day toggle, reference line)
- [x] KickSession — Live kick timeline (real-time cumulative chart during session)
- [ ] History — Contraction interval trend chart
- [ ] Feeding log — Volume/duration trend chart
- [ ] Home page — Mini weekly kick sparkline

## Phase 4: 换尿布 + 睡眠记录
- [ ] 换尿布：便便类型/颜色快速选择
- [ ] 睡眠：宝宝+妈妈双轨记录
- [ ] 每日汇总视图

## Phase 5: 生长曲线 + 疫苗日历
- [ ] 身高/体重/头围录入 + WHO 标准曲线对比
- [ ] 国内疫苗接种时间表 + 打勾记录

## Phase 6: Polish + 部署
- [ ] Vercel 部署
- [ ] 最终 UI 打磨
- [ ] 数据导出/导入验证

---

## Completed ✅
- [x] v0.1 数胎动核心功能（Cardiff + 5 分钟合并）
- [x] Duolingo 风格 UI
- [x] PWA 离线支持
- [x] 孕期小贴士彩蛋
- [x] Mascot 集成
- [x] Favicon + OG metadata
- [x] Push to GitHub (CaliCastle/babycare)
- [x] Hub architecture with tool grid
- [x] Contraction timer with 5-1-1 rule
- [x] Base UI headless component migration
- [x] Progressive blur sticky headers
- [x] react-day-picker + sileo toasts integration
- [x] Smart pregnancy-stage-aware tool ordering
- [x] Hospital bag checklist (Phase 2)
- [x] Feeding log: breast/bottle/pump with timer, volume entry, history tab (Phase 3)
