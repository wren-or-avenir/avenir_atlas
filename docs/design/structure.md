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
│   ├── app/                    # 组装层
│   ├── components/             # UI 实现层
│   ├── config/                 # 站点级默认配置
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
pages → app → components → core
```

| 层级 | 职责 | 规则 |
| --- | --- | --- |
| `pages/` | 路由入口 | 越薄越好，只引入 app 或 layout |
| `app/` | 组装层（对应圣经 app 层） | 只有一件事：组装。从 core 拿 interface、注入具体实现、把组件拼成页面 |
| `components/` | UI 实现层 | 每个包对应一个视觉模块，自包含（自带 interface/config）；可 import core 的 interface，不 import 其他组件包内部实现 |
| `core/` | 纯逻辑层（对应圣经 package/core） | 纯 TS、零 DOM、可独立测试；只暴露 interface，不知道 UI 和具体数据源存在 |
| `content/` | 内容数据 | Notion 同步脚本的落盘目录，Astro content collections 从此读取 |
| `styles/` | 设计 token | 颜色、字体、间距等全局变量 |

关键原则：

- **interface 定契约，实现可替换**：天气、歌单、Notion 等外部数据源都通过 Provider 契约接入。开发阶段用 mock 实现跑通全链路（对应圣经 `--mock` 模式），换真 API 时通过环境变量切换（如 `WEATHER_PROVIDER=mock` → `WEATHER_PROVIDER=qweather`），UI 层零改动。
- **配置优先级链**：环境变量（`import.meta.env`）> 默认配置（`src/config/`、各包 `config.ts`）。链断了要报错，不静默降级。
- **每包自包含**：如 `components/ocean/` 自带 `interface.ts`、`config.ts`、`shaders/`（GLSL，对应圣经 `lib/`），拎到别的项目也能独立理解。

---

## 两条数据链路

### 内容链路（build 时）

```text
Notion 文本 → sync-notion.ts 拉取并转换 → content/ 落盘 → Content Collections → pages 渲染
```

- `core/notion/`：同步逻辑（纯 Node），`interface.ts` 定契约，`transform.ts` 负责 Notion blocks → markdown
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

每个组件的失败模式在设计阶段标注：分类（可重试/可降级/需恢复/致命）→ 处理策略。如天气 API 超时 → 可降级：保持默认主题参数并记录日志，不阻塞页面渲染。

### 2D 地图与 3D 地球职责区分

两者都消费 `core/geo` 的地区数据，但职责严格分开，避免开发时混淆：

| 对象 | 位置 | 职责 |
| --- | --- | --- |
| 2D 世界地图（`components/menu/`） | 首页中部，占页面 1/2 | 菜单交互本体：金色线条轮廓、呼吸灯、金色倒三角、二级目录放大聚焦、板块线条→实色、南太平洋金色台风 |
| 3D 地球（`components/globe/`） | 左上角角落 | hover 联动展示：自转、平滑聚焦到对应地区板块 |

联动方向：2D 地图 hover/点击 → 更新 geo 状态 → 2D 地图板块实色 + 3D 地球聚焦。
海浪跟手（`components/ocean/`）仅在地图轮廓之外生效，需向 `core/geo` 查询轮廓判定。

---

## 模块速查表

### `src/core/` 纯逻辑模块

| 包 | 职责 | 契约文件 | 对应需求 |
| --- | --- | --- | --- |
| `theme/` | 日期→季节、时间→昼夜、天气→极端气候参数 | `interface.ts` | 加载图标随季节、背景随昼夜、台风暴雨效果 |
| `geo/` | 地区注册表、经纬→投影坐标、地图轮廓判定 | `interface.ts` | 2D 地图菜单、3D 地球聚焦、海浪轮廓边界 |
| `moon/` | 月相计算、滚动进度→月相映射 | `interface.ts` | 月相阅读进度指示器 |
| `weather/` | 天气数据 Provider（mock / qweather） | `interface.ts` | 气象实况 |
| `music/` | 歌单 Provider（mock / netease）+ 播放状态机 | `interface.ts` | 歌单共享、悬浮球播放器 |
| `notion/` | Notion 同步与转换（build 时） | `interface.ts` | Notion 文本同步链 |

### `src/components/` UI 模块

| 包 | 职责 | 对应 visual_design 条目 |
| --- | --- | --- |
| `ocean/` | three.js 海浪背景 + 鼠标跟手（仅地图轮廓之外，shaders/ 放 GLSL） | 动态海洋背景、鼠标动态 |
| `globe/` | 左上角 3D 地球：自转、hover 平滑聚焦地区板块 | 3D 地球联动 |
| `menu/` | 2D 世界地图菜单（首页中部 1/2）：呼吸灯、金色倒三角、二级聚焦、板块线条→实色、南太平洋金色台风 | 经纬菜单 |
| `moon-progress/` | 右侧月相滚动条 | 阅读进度指示器 |
| `weather-layer/` | 雨丝图层、饱和度、鼠标阻尼 | 极端气候与真实映射 |
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
