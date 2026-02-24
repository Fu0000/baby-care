# 宝宝助手 BabyCare

一款面向准妈妈和新手爸妈的孕期/育儿助手 PWA，Duolingo 风格 UI，所有数据本地存储，无需登录。

## 功能

- **数胎动** — Cardiff Count-to-10 方法，可配置合并窗口（3/5/10 分钟），支持目标次数设定、连续记录天数统计、达标庆祝动画
- **宫缩计时** — 记录每次宫缩的持续时间和间隔，5-1-1 规则自动提醒（≤5 分钟间隔、≥1 分钟持续、≥1 小时）
- **待产包清单** — 妈妈包 / 宝宝包 / 证件包三分类，预置常见物品，支持自定义添加，进度百分比显示
- **喂奶记录** — 亲喂（左/右侧计时）、奶瓶（奶量输入）、吸奶（计时 + 奶量），按日分组历史记录
- **历史趋势** — 胎动 7/30 天趋势图、实时会话曲线
- **个性化设置** — 预产期、目标次数、合并窗口、深色模式（跟随系统/手动切换）
- **数据管理** — 导出 JSON / 导入备份 / 清除数据

## 技术栈

- React 19 + TypeScript 5.9 + Vite 7
- Tailwind CSS 4
- Base UI (headless components)
- Dexie.js (IndexedDB)
- vite-plugin-pwa (Workbox 离线缓存)
- pnpm

## 开发

```bash
pnpm install
pnpm dev       # 启动开发服务器
pnpm build     # 类型检查 + 生产构建
pnpm preview   # 预览生产构建
```

## 许可证

MIT

---

Made with care by [Cali](https://cali.so)
