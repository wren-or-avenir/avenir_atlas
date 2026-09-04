# Astro 项目 Windows 环境配置指南 (avenir_atlas)

在 Windows 环境下无缝接手 `avenir_atlas` Astro 项目，需重点对齐 Node 版本以兼容底层代理参数，并解决 PowerShell 权限与 Conda 环境带来的静默拦截问题。

## 1. 安装 Node.js (对齐 v26.7.0)
Astro 注入的 `--use-env-proxy` 参数需要 Node.js v26+ 原生支持，避免因网络代理导致的报错。
- 从国内镜像源下载对应版本的 MSI 包（例如 [npmmirror Node v26.7.0](https://npmmirror.com/mirrors/node/v26.7.0/)）。
- 默认安装，确保向导中勾选了 **Add to PATH**。

## 2. 解除 PowerShell 脚本执行拦截
Windows PowerShell 默认的安全策略会静默拦截 `.ps1` 脚本，导致 `npm -v` 挂起卡死无输出，而原生的 `npm.cmd -v` 可以正常执行。
使用**管理员身份**打开 PowerShell，执行以下命令解锁权限：
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 3. 隔离 Conda 虚拟环境
如果终端前缀带有 `(base)`，说明正处于 Python 虚拟环境中。这会导致系统调用 Conda 内部缓存的旧版本 npm，引发环境变量与路径冲突。
开发前退出 Conda 基础环境：
```powershell
conda deactivate
```

## 4. 刷新终端路径缓存
如果在执行命令时出现 `CommandNotFoundException`（无法识别 npm），是因为当前终端在安装 Node.js 前已经打开，未加载最新的系统环境变量。
- **解决方案：** 直接关闭当前终端 / VS Code，然后重新打开。

## 5. 配置国内镜像源与启动项目
进入 `avenir_atlas` 仓库目录，切换国内镜像源以防止下载依赖时因代理引发 SSL 握手阻断 (`unexpected eof`)。依次执行：
```powershell
npm config set registry https://registry.npmmirror.com
npm install
npm run dev
```
