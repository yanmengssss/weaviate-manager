1. Redis 连接配置
基础网络配置

Host (主机地址)：必填（如 127.0.0.1 或具体 IP）。

Port (端口)：必填（默认 6379）。

连接协议 (Protocol)：必填（TCP 或 TLS/SSL）。

认证配置

密码 (Password)：条件必填（若 Redis 服务端开启了 requirepass 则必填）。

用户名 (Username)：选填 / 条件必填（Redis 6.0 及以上版本开启 ACL 且非 default 用户时必填）。

高级配置

数据库索引 (Database Index)：选填（0-15 之间的数字，默认连接 0 号逻辑库）。

连接超时 (Connection Timeout)：选填（如 5000 ms，防止由于网络拥塞导致连接挂起）。

TLS/SSL 证书：条件必填（若协议选择 TLS/SSL 且服务端要求双向认证，需提供 CA 证书、客户端证书及私钥）。

2. MongoDB 连接配置
基础网络配置

连接模式 (Connection Mode)：必填（分为 Standard (mongodb://) 或 DNS Seed List (mongodb+srv://)）。

Host (主机地址)：必填。

Port (端口)：必填（默认 27017，注意：+srv 集群模式下通常不填端口）。

连接协议 (Protocol)：必填（TCP 或 TLS/SSL）。

认证配置

用户名 (Username)：条件必填（生产环境通常必填）。

密码 (Password)：条件必填（与用户名成对出现）。

认证数据库 (Auth Database / authSource)：条件必填（用户鉴权凭据所在的系统库，通常默认为 admin。若缺失此项常导致认证失败）。

高级配置

目标数据库 (Database Name)：选填（连接成功后默认操作的业务数据库名称）。

副本集名称 (Replica Set)：选填（若连接的是副本集，需指定 replicaSet=xxx）。

读偏好 (Read Preference)：选填（如 Primary, SecondaryPreferred 等）。

3. MySQL 连接配置
基础网络配置

Host (主机地址)：必填。

Port (端口)：必填（默认 3306）。

连接协议 (Protocol)：必填（TCP 或 TLS/SSL）。

认证与目标配置

用户名 (Username)：必填（如 root）。

密码 (Password)：必填。

数据库名称 (Database Name)：条件必填（作为业务接入时，通常要求明确指明具体连接的库名）。

高级配置

字符集 (Charset)：选填（建议默认提供 utf8mb4 以避免生僻字及 Emoji 乱码）。

时区 (Timezone)：选填（如 +08:00 或 Asia/Shanghai）。

SSL 模式 (SSL Mode)：选填（如 DISABLED, PREFERRED, REQUIRED, VERIFY_CA 等，云数据库多有强制要求）。

4. Weaviate 连接配置
基础网络配置

连接协议 (Scheme)：必填（HTTP 或 HTTPS）。

Host (主机/URL)：必填（无需携带 http:// 或 https:// 前缀）。

Port (端口)：选填 / 条件必填（若 Host 已包含端口则不填，本地开发常为 8080）。

认证配置

API Key：条件必填（Weaviate Cloud 托管服务或开启鉴权的私有部署必须提供）。

使用 OIDC (OpenID Connect)：选填（勾选后需额外展开输入：Client ID, Client Secret, Issuer URL）。

高级配置

自定义请求头 (Custom Headers)：选填（极其重要。Weaviate 配合外部大模型使用时，必须在此传入第三方密钥，例如 X-OpenAI-Api-Key）。

gRPC 端口 (gRPC Port)：选填（默认常为 50051，强烈推荐配置此项以大幅提升向量检索性能）。

💡 补充体验优化建议：URI 直连模式
为了降低高级开发者的填写负担，建议在表单顶部增加 “使用 URI 连接 (Connection String)” 的快捷输入模式。

典型示例：

Redis: redis://user:password@host:port/0

MongoDB: mongodb://user:password@host:port/admin

MySQL: mysql://user:password@host:port/mydb

前端可通过解析 URI 字符串，自动回填至下方的各个独立输入框中。