# 调试启动

```bash
npx astro dev --background   # 后台启动开发服务
npx astro dev status         # 状态
npx astro dev logs           # 日志
npx astro dev stop           # 停止
```

开发地址：http://localhost:4321

## 已知坑

- **"刷新无效"**：后台 dev server 的文件监听器可能失效（一直返回旧代码）。
  处理：`npx astro dev stop` 后重新 `npx astro dev --background`，浏览器 Ctrl+F5 强刷。
- **改动着色器后自检**：HTTP 拉取
  `http://localhost:4321/src/components/ocean/ocean.ts` 确认包含新代码后再让浏览器强刷。
- **着色器编译失败**：页面底部红底浮层直接显示完整编译日志
  （`src/components/webgl/stage.ts` 的 `renderer.debug.onShaderError`），把内容贴给 AI 即可定位。
- **WebGL 不可用 / 上下文丢失 / 触屏设备**：自动退化为 CSS 渐变背景，不会白屏。

## 常用命令

```bash
npm test                 # 纯逻辑测试（tests/）
npm run typecheck        # tsc --noEmit
npm run build            # 构建到 dist/
```
