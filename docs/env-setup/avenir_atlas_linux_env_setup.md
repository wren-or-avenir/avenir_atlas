## Astro 项目无痛初始化指南（含代理环境适配）

在新电脑或新环境中为已存在的 Git 仓库（非空目录）配置 Astro 项目时，直接执行以下标准化流程。

### 核心执行脚本

Bash

```
# 采用国内镜像源与 wget，规避终端外网 curl 请求时因代理导致的 SSL 握手阻断 (unexpected eof)
wget https://npmmirror.com/mirrors/node/v26.7.0/node-v26.7.0-linux-x64.tar.xz

# 每次解压前强制清理全局 npm，防止旧版本残留文件与新版本混叠导致源码模块崩溃
sudo rm -rf /usr/local/lib/node_modules/npm
sudo tar -xf node-v26.7.0-linux-x64.tar.xz -C /usr/local --strip-components=1

# 清除 Bash 的旧版路径缓存，确保系统立刻识别到刚刚覆盖安装的新版 node
hash -r

# 验证版本（Node 需 >= v26，以原生支持被代理环境自动注入的 --use-env-proxy 参数）
node -v
npm -v

# 采用临时目录隔离生成代码，彻底绕过 Astro CLI 面对非空目录（含 .git/文档）时死锁用户输入的 UI Bug
npm create astro@latest temp_astro -- --template minimal --no-install --no-git -y

# 携带隐藏文件平铺至当前目录，完成无痕合并
cp -a temp_astro/. .
rm -rf temp_astro

# 本地依赖就绪后开始安装
npm install
npm run dev
```

## 历史踩坑与错误排查记录

- **报错：找不到 npm 或 `npm WARN EBADENGINE`**
    - **触发原因：** 习惯性使用 `sudo apt install nodejs`，但 Ubuntu 默认源提供的版本过旧（通常为 v12）。Astro 及其周边生态要求 Node >= 22.12.0。
    - **解决方案：** 放弃 `apt`，直接通过压缩包安装最新长期支持版。
- **报错：`curl: (35) error:0A000126:SSL routines::unexpected eof`**
    - **触发原因：** 尝试用 `curl` 访问 GitHub Raw 或 NodeSource 时，终端未走代理或代理路由闪断，导致 SSL 握手被墙拦截。
    - **解决方案：** 改用 `wget` 配合国内镜像源（如淘宝 npmmirror）直连下载。
- **报错：`bad option: --use-env-proxy`**
    - **触发原因：** 系统开了代理（如 VS Code 内置终端变量），Astro 检测到后强制向 Node 注入了该代理参数。但 Node v22 及以下版本不支持此原生特性。
    - **解决方案：** 将 Node.js 直接升级到 v26+，以兼容该底层代理参数。
- **报错：`npm error Class extends value undefined is not a constructor or null`**
    - **触发原因：** 多次通过 `tar` 解压不同版本的 Node 到同一目录，导致旧版本（如 v22）的 npm 核心文件没被删干净，与新版本（v26）发生了文件级别混叠。
    - **解决方案：** 执行 `sudo rm -rf /usr/local/lib/node_modules/npm` 后再进行纯净解压。
- **卡死：Astro CLI 提示 `Hmm... "." is not empty!` 且无法修改路径**
    - **触发原因：** 目标目录有 `.git` 等残留，触发 Astro 保护机制。其 CLI 交互界面在某些终端下会屏蔽退格键，强制锁定输入。
    - **解决方案：** 利用静默命令 `-no-install -y` 生成临时文件夹（`temp_astro`），使用 `cp -a` 拷贝文件后删除临时目录。