# 生产启动

- `npm run build` 输出到 `dist/`
- 部署目标：待补充（Vercel / Netlify / 自建服务器）
- 内容同步：Notion 同步链上线后需在 CI 中跑 `npm run sync:notion`（待接入）
- 环境变量：复制 `.env.example` 为 `.env`，生产环境填写真实的 Provider 与 NOTION_API_KEY
