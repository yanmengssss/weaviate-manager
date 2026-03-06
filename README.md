# OmniBase — 多数据源可视化管理平台

> **域名**：[omnibase.yanmengsss.xyz](https://omnibase.yanmengsss.xyz)  
> **技术栈**：Next.js 16 · React 19 · weaviate-client · mysql2 · redis · mongodb · shadcn/ui  
> **部署方式**：Jenkins + Docker

## 项目简介

OmniBase 是一个**多数据源可视化管理平台**（类 TablePlus / DBeaver Web 版），帮助开发者、数据科学家和 DBA 在统一的 GUI 界面中连接并管理多种异构数据源，无需在多个工具间切换。

**支持的数据源：**
- 🔷 **Weaviate**（向量数据库）：Class 与对象 CRUD
- 🐬 **MySQL**（关系型数据库）：库/表/行管理 + SQL 编辑器
- 🍃 **MongoDB**（文档数据库）：数据库/集合/文档管理
- 🔴 **Redis**（缓存数据库）：Key-Value 查看/编辑、TTL 管理

---

## 核心功能

| 功能 | 描述 |
|------|------|
| 多数据源连接管理 | 选择数据源类型 → 填写连接参数 → 测试连接 → 打开标签页会话 |
| Schema / 结构管理 | Weaviate Class 管理、MongoDB 集合管理、MySQL 表结构查看、Redis Keyspace 概览 |
| 数据 CRUD | 分页查看 / 新增 / 编辑 / 删除（危险操作二次确认） |
| 多标签页会话 | 多会话并行、标签切换、同类型多实例独立上下文 |
| SQL 编辑器 | MySQL 专属，支持 SELECT / DDL / DML，危险操作高亮提示 |

---

## 架构设计

OmniBase 为**纯前端直连**架构，Next.js 通过 API Routes（BFF 层）在服务端直接与各数据库 SDK 通信，无需额外后端服务：

```
浏览器
  └── Next.js 16 页面
        └── API Routes（服务端）
              ├── weaviate-client → Weaviate
              ├── mysql2          → MySQL
              ├── mongodb         → MongoDB
              └── redis           → Redis
```

---

## 页面路由

| 路由 | 功能 |
|------|------|
| `/` | 工作区首页（连接标签栏） |
| `/connect` | 新建连接（选择数据源类型 + 填写参数） |
| `/dashboard/[connId]` | 某连接的数据管理面板 |
| `/dashboard/[connId]/weaviate` | Weaviate Class 与对象管理 |
| `/dashboard/[connId]/mysql` | MySQL 表管理 + SQL 编辑器 |
| `/dashboard/[connId]/mongodb` | MongoDB 文档管理 |
| `/dashboard/[connId]/redis` | Redis Key 管理 |

---

## 数据操作安全规范

| 操作类型 | 保护措施 |
|---------|---------|
| 删除集合 / Class | 二次确认弹窗 |
| `DROP` / `TRUNCATE` SQL | 高亮警告 + 二次确认 |
| `DELETE` 无 WHERE | 拦截提示 + 确认 |
| Redis 批量删除 | 二次确认 |
| 数据库凭证 | 仅存于会话状态，不持久化到服务器，掩码显示 |

---

## 技术栈

| 分层 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js | 16.1.6 |
| UI | shadcn/ui, Radix UI, TailwindCSS | latest |
| Weaviate SDK | weaviate-client | ^3.11.0 |
| MySQL | mysql2 | ^3.18.0 |
| MongoDB | mongodb | ^6.21.0 |
| Redis | redis | ^5.11.0 |

---

## 快速开始

### 本地开发启动

```bash
# 1. 安装依赖
pnpm install

# 2. 无需配置数据库环境变量
# 用户输入的数据库凭证存储于会话状态，不持久化到服务器

# 3. 启动开发服务器（访问 http://localhost:3000）
pnpm dev
```

### 生产启动

```bash
# 构建生产产物
pnpm build

# 启动生产服务（端口 3500）
pnpm start
```

> **注意**：用户输入的数据库凭证存储于会话状态，不持久化到服务器，无需配置数据库相关环境变量。

---

## Docker 启动

### 方式一：直接 Docker 构建运行

```bash
# 1. 构建镜像（多阶段构建：node:20-alpine）
docker build -t omnibase .

# 2. 运行容器（端口 3500）
docker run -d \
  --name omnibase \
  -p 3500:3500 \
  omnibase
# 数据库凭证由用户在界面输入，无需枯容器环境变量
```

### 方式二：Jenkins + Docker 自动化部署（生产环境）

```bash
# Jenkins Pipeline 自动触发：
# 1. 拉取代码 → 构建 Docker 镜像（pnpm build → Next.js standalone）
# 2. 推送镜像到 Registry
# 3. 远程服务器拉取并重启容器
# 容器内运行：node server.js（端口 3500）
# 域名：omnibase.yanmengsss.xyz
```

- **暴露端口**：`3500`
- **域名**：[omnibase.yanmengsss.xyz](https://omnibase.yanmengsss.xyz)
