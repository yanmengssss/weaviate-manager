ARG NODE_IMAGE=node:20-alpine

# ==========================================
# 阶段 1：安装依赖包
# ==========================================
FROM ${NODE_IMAGE} AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ==========================================
# 阶段 2：构建 Next.js 产物
# ==========================================
FROM ${NODE_IMAGE} AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@10.28.1 --activate

# 先复制所有源代码
COPY . .
# 再把装好的依赖覆盖进来（防止本地空 node_modules 覆盖）
COPY --from=deps /app/node_modules ./node_modules

# 构建产物（此时因为开启了 standalone，会生成 .next/standalone 目录）
RUN pnpm build

# ==========================================
# 阶段 3：精简运行环境
# ==========================================
FROM ${NODE_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3500
# 允许外部访问
ENV HOSTNAME="0.0.0.0"

# 安全实践：创建一个非 root 用户来运行服务
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制 public 静态资源
COPY --from=builder /app/public ./public

# 自动创建 .next 目录并设置权限
RUN mkdir .next && chown nextjs:nodejs .next

# 🌟 关键：只复制 standalone 提取出的核心文件和静态资源
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换为普通用户，提升容器安全性
USER nextjs

EXPOSE 3500

# Standalone 模式下直接通过 Node 运行 server.js 即可
CMD ["node", "server.js"]