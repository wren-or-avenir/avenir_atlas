# Avenir Atlas - 项目目录结构说明

本文档定义 Avenir Atlas 的目标目录结构，基于[开发圣经](development_bible.md)的分层原则，结合 [content.md](content.md) 与 [visual_design.md](visual_design.md) 的需求规划。当前仓库仍在按此结构建设，未标注的实现目录暂未创建。

## 目录结构总览

```text
avenir_atlas/
├── .vscode/                    # VS Code 配置
├── docs/                       # 项目文档（按用途分类）
│   ├── design/                 # 设计文档：概念、内容、视觉、结构、开发圣经
│   └── env-setup/              # 环境搭建指南
├── public/                     # 静态资源（原样输出，不走构建）
│   └── favicon.ico             # 网站图标
├── src/                        # 源代码核心目录（分层见下）
│   ├── components/             # UI 实现层
│   ├── config/                 # 站点级默认配置（site.ts：Provider 选择、PUBLIC_ 环境变量映射）
│   ├── content/                # Notion 同步落盘（内容集合）
│   ├── core/                   # 纯逻辑层
│   ├── layouts/                # 全局布局
│   ├── pages/                  # Astro 文件路由
│   ├── scripts/                # build 脚本入口
│   └── styles/                 # 全局样式与设计 token
├── .env.example                # 环境变量模板（真实 key 不提交）
├── .gitignore                  # Git 忽略规则
├── astro.config.mjs            # Astro 核心配置
├── package.json                # 项目元数据、依赖与 scripts
├── package-lock.json           # 依赖版本锁定
├── README.md                   # 项目引导
└── tsconfig.json               # TypeScript 配置
```

---

## src 分层规则

依赖只能指向内层，不能反向：

```text
pages → components → core
```

| 层级 | 职责 | 规则 |
| --- | --- | --- |
| `pages/` | 路由入口 + 组装层 | 越薄越好：直接拼装 components 或引入 layout，不设中间组装层 |
| `components/` | UI 实现层 | 每个包对应一个视觉模块，自包含（自带 config）；可 import core 的类型与纯函数，不 import 其他组件包内部实现 |
| `core/` | 纯逻辑层（对应圣经 package/core） | 纯 TS、零 DOM、可独立测试；纯函数模块，仅 weather/music 暴露 interface，不知道 UI 和具体数据源存在 |
| `content/` | 内容数据 | Notion 同步脚本的落盘目录，Astro content collections 从此读取 |
| `styles/` | 设计 token | 颜色、字体、间距等全局变量 |

关键原则：

- **契约只留给外部数据源**：仅 `weather/`、`music/` 两个需要 mock ↔ 真实 API 切换的 Provider 保留 `interface.ts` 契约，通过环境变量切换实现（如 `WEATHER_PROVIDER=mock` → `WEATHER_PROVIDER=qweather`），UI 层零改动。其余模块（geo、moon、theme、notion 等）是确定性纯函数，一次成型，不套 interface 壳。
- **配置优先级链**：环境变量（`import.meta.env`）> 默认配置（`src/config/`、各包 `config.ts`）。链断了要报错，不静默降级。
- **每包自包含**：如 `components/ocean/` 自带 `config.ts`、`shaders/`（GLSL，对应圣经 `lib/`），拎到别的项目也能独立理解。

---

## 两条数据链路

### 内容链路（build 时）

```text
Notion 文本 → sync-notion.ts 拉取并转换 → content/ 落盘 → Content Collections → pages 渲染
```

- `core/notion/`：同步逻辑（纯 Node），`transform.ts` 负责 Notion blocks → markdown
- `src/scripts/sync-notion.ts`：入口，`npm run sync:notion` 触发
- `content/` 四个集合：`notes`（随笔笔记）、`dissection`（庖丁解牛，自我剖析与反思）、`school`（学校笔记）、`life`（生活）

### 交互链路（runtime）

```text
日期/时间/天气 → core/theme       → 视觉参数 → components/ocean / weather-layer / loading 渲染
滚动进度      → core/moon         → components/moon-progress
鼠标移动      → core/geo 轮廓判定 → components/ocean 海浪跟手（仅地图轮廓之外）
菜单 hover    → core/geo          → components/menu 板块实色 + components/globe 聚焦（双端联动）
歌单数据      → core/music        → components/player
```

前端只有三种失败处理，不做分级防御：

- 网络请求（天气、歌单、Notion 同步）→ 可降级：保持默认参数并记日志，不阻塞渲染；同步脚本可重试。
- WebGL 不可用 / 上下文丢失 → 一行 early-return 静默移除组件，背景退化为 CSS，禁止白屏。
- 不可能出现的数据状态 → 断言抛错即可，不写防御代码。

### 2D 地图与 3D 地球职责区分

两者都消费 `core/geo` 的地区数据，但职责严格分开，避免开发时混淆：

| 对象 | 位置 | 职责 |
| --- | --- | --- |
| 2D 世界地图（`components/menu/`） | 首页中部，占页面 1/2 | 菜单交互本体：金色线条轮廓、呼吸灯、金色倒三角、二级目录放大聚焦、板块线条→实色、南太平洋金色台风（SVG + CSS 动画） |
| 3D 地球（`components/globe/`） | 左上角角落 | hover 联动展示：自转、平滑聚焦到对应地区板块 |

联动方向：2D 地图 hover/点击 → 更新 geo 状态 → 2D 地图板块实色 + 3D 地球聚焦。
海浪跟手（`components/ocean/`）仅在地图轮廓之外生效，需向 `core/geo` 查询轮廓判定。

### 渲染架构

- **单一 WebGL 上下文**：海洋背景与 3D 地球共用一个 renderer、一个 `requestAnimationFrame` 循环，通过 `gl.scissor` 切分视口（全屏海洋 + 左上角地球），避免多上下文抢占 GPU，双端联动状态同步也更简单。
- **2D 地图不碰 WebGL**：完全用 SVG + CSS 动画实现（金色线条、呼吸灯、倒三角）。
- **气候图层用 CSS/SVG**：雨丝、雷电等由 `core/theme` 的天气参数驱动（倾角、频率、饱和度），不占 WebGL 预算。

### 触屏适配与降级

- 触屏设备无 hover：地图联动全部改为 tap 触发（板块实色、二级聚焦、3D 地球聚焦）。
- 移动端地图不占首屏 1/2，收缩为紧凑宽度；海洋背景退化为 CSS 静态渐变，3D 地球默认隐藏。
- WebGL 不可用或上下文丢失：组件一行 early-return 静默移除，页面退化为纯 CSS 呈现（见上方失败处理）。

---

## 模块速查表

### `src/core/` 纯逻辑模块

| 包 | 职责 | 契约文件 | 对应需求 |
| --- | --- | --- | --- |
| `theme/` | 日期→季节、时间→昼夜、天气→极端气候参数 | 无（纯函数） | 加载图标随季节、背景随昼夜、台风暴雨效果 |
| `geo/` | 地区注册表、经纬↔投影坐标（含屏幕坐标→经纬）、地图轮廓判定 | 无（纯函数） | 2D 地图菜单、3D 地球聚焦、海浪轮廓边界 |
| `moon/` | 月相计算、滚动进度→月相映射 | 无（纯函数） | 月相阅读进度指示器 |
| `weather/` | 天气数据 Provider（mock / qweather） | `interface.ts` | 气象实况 |
| `music/` | 歌单 Provider（mock / netease）+ 播放状态机 | `interface.ts` | 歌单共享、悬浮球播放器 |
| `notion/` | Notion 同步与转换（build 时） | 无（纯函数） | Notion 文本同步链 |

### `src/components/` UI 模块

| 包 | 职责 | 对应 visual_design 条目 |
| --- | --- | --- |
| `webgl/` | 单一 WebGL 上下文渲染器（renderer、rAF 循环、scissor 视口切分、resize、上下文丢失处理），ocean 与 globe 共用；WebGL 不可用 / 上下文丢失 / 触屏 → 一行 early-return 静默移除，退化为 CSS | 渲染架构 |
| `ocean/` | three.js 海浪背景 + 鼠标风推波（波前垂直行进方向，仅地图轮廓之外，shaders/ 放 GLSL，与 globe 共用渲染器）；白天青绿海面，夜间蓝眼泪荧光海 | 动态海洋背景、鼠标动态 |
| `globe/` | 左上角 3D 地球：自转、hover 平滑聚焦地区板块（与 ocean 共用渲染器，scissor 切分视口） | 3D 地球联动 |
| `menu/` | 2D 世界地图菜单（SVG + CSS 动画，首页中部 1/2）：呼吸灯、金色倒三角、二级聚焦、板块线条→实色、南太平洋金色台风 | 经纬菜单 |
| `moon-progress/` | 右侧月相滚动条 | 阅读进度指示器 |
| `weather-layer/` | 雨丝、雷电图层、饱和度、斜向倾角（参数由 core/theme 驱动） | 极端气候与真实映射 |
| `loading/` | 季节加载图标（蘑菇/海浪/落叶/雪） | 网页加载图标 |
| `answer-book/` | 底部常驻答案之书（具体设计待定） | 底部常驻答案之书 |
| `player/` | 左下角悬浮球播放器 | 悬浮球播歌单歌曲 |
| `ui/` | 原子组件（按钮、卡片、金色三角等） | 各模块共用 |

### 地区与内容对应（`core/geo/regions.ts`）

```text
中国（一级）
├── 深圳     ├── 香格里拉     ├── 惠州     └── 贵州
纽约（一级）
台风（一级，南太平洋装饰）
```

菜单层级：中国板块带二级目录，纽约与台风为一级。地区与内容板块（notes/dissection/school/life）的具体对应关系待定。个人介绍独立于地区菜单，路由为 `/about`。

---

## 常用开发命令

| 命令 | 说明 |
| --- | --- |
| `npm install` | 安装依赖 |
| `npm run dev` | 启动开发环境（默认 `http://localhost:4321`） |
| `npm run build` | 打包到 `dist/` |
| `npm run sync:notion` | 同步 Notion 内容到 `src/content/` |
