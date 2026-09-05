# 001 海面整体消失：顶点着色器循环索引 uniform 数组编译失败

- 发现日期：2026-09-05
- 严重程度：高（海面渲染失败，页面仅剩 3D 地球）
- 状态：已修复

## 复现步骤

1. `npx astro dev` 打开 http://localhost:4321
2. 海面背景全黑，仅左上角线框地球正常
3. 浏览器 console 出现 THREE.WebGLProgram shader error

## 定位分析

- `src/components/ocean/shaders/ocean.vert.glsl`（当时第 51-63 行）在 for 循环内
  用循环变量索引 uniform 数组 `uWakePoints[i]` / `uWakeDirs[i]`
- three.js 对非 RawShaderMaterial 不追加 `#version 300 es`，着色器按 GLSL ES 1.00 编译；
  ES 1.00 附录 A 不允许顶点着色器以非常量表达式索引 uniform 数组，
  ANGLE（Chrome/Edge 的 D3D 后端）直接报编译错误
- 材质程序失败后首帧 autoClear 清屏为黑，表现为"海面消失"

## 修复记录

- 循环展开为 8 次常量索引调用（`addWakePoint(h, uWakePoints[0..7], uWakeDirs[0..7])`）
- 同步新增 `renderer.debug.onShaderError` 页面浮层诊断（`src/components/webgl/stage.ts`）：
  此后着色器编译失败直接以红底浮层显示完整日志，无需翻浏览器 console
