# 002 海面整体消失（二）：变量名 patch 撞 GLSL 保留字

- 发现日期：2026-09-05
- 严重程度：高（海面渲染失败，页面仅剩 3D 地球）
- 状态：已修复

## 复现步骤

同 001，页面底部红底浮层显示：

```
FS: ERROR: 'patch' : Illegal use of reserved word
```

## 定位分析

- `src/components/ocean/shaders/ocean.frag.glsl`（当时约第 40 行）定义 `float patch`
- `patch` 是 GLSL ES 保留字（为曲面细分预留），编译报语法错误

## 修复记录

- 改名 `patch` → `foamPatch`（声明与使用共两处）
