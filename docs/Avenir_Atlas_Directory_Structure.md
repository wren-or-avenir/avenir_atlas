# Avenir Atlas - 项目目录结构说明

本文档详细说明了 Avenir Atlas 项目当前的目录结构及其各部分的作用，基于最新的 Astro 精简模板（Minimal Template）结合现有的 Git 结构构建。非常适合保存在 Notion 中作为后续查阅的参考。

## 📂 目录结构预览

```text
avenir_atlas/
├── .git/                   # Git 版本控制系统核心目录（隐藏文件夹）
├── .vscode/                # VS Code 专属配置目录（例如本机的特定设置）
├── docs/                   # 项目专属文档目录
│   └── design_concept.md   # [核心] 项目设计概念与需求文档
├── node_modules/           # Node.js 依赖包存放目录（体积巨大，.gitignore已忽略，勿提交）
├── public/                 # 静态资源目录（文件会原样输出）
├── src/                    # 源代码核心目录
│   └── pages/              # Astro 的页面级路由目录
│       └── index.astro     # 项目首页入口文件
├── .gitignore              # Git 忽略规则文件（防止错误提交 node_modules 等）
├── astro.config.mjs        # Astro 框架核心配置文件
├── package.json            # Node.js 项目元数据与依赖清单，以及终端运行的 scripts
├── package-lock.json       # 依赖版本精确锁定文件（保证所有人安装的版本一致）
├── README.md               # Astro 默认生成的项目说明文件
└── tsconfig.json           # TypeScript 配置文件（提供全项目代码智能提示）
```

---

## 📁 核心目录与文件深入解析

### 1. `src/` (源代码目录)
这是你进行项目开发的主战场。在 Astro 中，所有的组件 (Components)、布局 (Layouts)、页面、脚本和样式都集中存放在这里。

- **`src/pages/`**: 这是 Astro 的**文件路由系统**。你在这里创建的每一个 `.astro` 或 `.md` 文件都会自动映射为一个网页路由（例如 `src/pages/about.astro` 会自动变成 `localhost:4321/about`）。
  - **`index.astro`**: 你的项目首页 (`/`)。这是默认的开发起点。打开这个文件，清空里面的默认示例代码，就可以直接开始编写 HTML 结构、前端逻辑以及引入组件了。

### 2. `public/` (静态资源目录)
用于存放**不需要**经过 Astro 构建处理（如代码压缩、图片优化等）的静态文件。

- 推荐存放：`favicon.ico` (网站图标)、特殊字体文件、直接引用的原画质大图或音频视频。
- **使用特性**：存放在这里的资源在最终打包构建时，会被原封不动地复制到网站的根目录。你可以直接在代码中通过绝对路径 `/filename.ext` 的方式引用它们。

### 3. `docs/` (项目文档目录)
你自己建立的规范目录，存放所有的非代码型、与业务相关的项目文档。

- **`design_concept.md`**: 你最初创建的设计概念文档，记录了 Avenir Atlas 项目的顶层设计和需求。未来架构图、数据库设计或备忘录都可以存在这里。

### 4. 根目录配置文件 (Config Files)
- **`package.json`**: 项目的“户口本”。它定义了当前项目依赖了哪些 npm 库，也定义了你可以运行的快捷命令（比如 `npm run dev`）。
- **`astro.config.mjs`**: Astro 框架的核心大脑。未来当你需要给项目集成 Tailwind CSS（样式框架）、React/Vue（UI 框架）、或者配置跨域代理时，都会在这个文件中进行设置。
- **`tsconfig.json`**: 哪怕你主要用 JavaScript 写代码，Astro 也会在底层利用 TypeScript 提供强大的代码补全和类型检查功能。此文件确保 VS Code 等编辑器能准确理解 Astro 的特有语法，提供最佳的开发体验。

---

## 🚀 常用开发命令备忘录

为了防止以后换电脑或长时间未开发遗忘，请牢记以下三个核心命令：

1. **`npm install`**：安装依赖。每次克隆新代码，或 `package.json` 有更新时运行。
2. **`npm run dev`**：启动本地开发环境。支持热更新（HMR），写完代码保存后浏览器会自动刷新。默认地址 `http://localhost:4321`。
3. **`npm run build`**：一键打包。当项目开发完成，准备上线发布时运行。Astro 会将你的代码编译成最精简的纯静态 HTML/CSS/JS 文件，保存在默认生成的 `dist/` 目录中。
