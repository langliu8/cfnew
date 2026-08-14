# Cloudflare Workers Builds 自动混淆部署

这个仓库由 Cloudflare Workers Builds 在构建阶段读取 `明文源吗`，生成临时混淆产物 `dist/worker.js`，验证后通过 Wrangler 上传。`dist/` 不进入 Git 历史。

## Workers Builds 设置

在 Worker 的 **Settings > Build** 中使用：

| 设置 | 值 |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npm run deploy:cf` |
| Non-production deploy command | `npm run preview:cf` |
| Root directory | `/`（仓库根目录） |

Workers Builds 可使用 Cloudflare 为连接项目管理的构建令牌，不需要把 API Token 写入 GitHub。

## 运行时设置

- `u`、`d` 和其他 cfnew 参数只在 **Settings > Variables & Secrets** 中维护。
- 本地测试变量只写入 `.dev.vars`；该文件已被 Git 忽略。
- 如果现有 Worker 使用 KV，请在合并到 `main` 前确认绑定名 `C` 仍指向原 namespace。不要创建或替换未知 KV。
- `wrangler.json` 使用 `keep_vars: true`，防止部署清除 Dashboard 中现有的普通变量。

## 安全发布流程

1. 在非 `main` 分支提交变更，等待 Cloudflare 执行预览构建。
2. 确认 `npm test`、`npm run build` 和 `wrangler versions upload` 全部成功。
3. 在预览 URL 做最小请求测试，并检查日志中没有源码或秘密值。
4. 确认 Worker 名称和现有 KV、路由、变量、秘密均保持原配置。
5. 评审后合并到 `main`，由 Cloudflare 自动部署生产版本。

混淆只能提高阅读门槛，不是加密，也不能阻止有能力的分析者还原程序行为。
