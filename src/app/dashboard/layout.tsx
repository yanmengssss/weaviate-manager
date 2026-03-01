"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, FileText, Key, Layers, LogOut, PlusCircle, Server, Table, X } from "lucide-react";

type StoredConfig = {
    type?: "redis" | "mongodb" | "mysql" | "weaviate";
    url?: string;
    host?: string;
    port?: string;
    protocol?: "http" | "https";
    username?: string;
    apiKey?: string;
    useTls?: boolean;
    redisUrl?: string;
    mongoUri?: string;
    authDb?: string;
    database?: string;
    mongoDatabase?: string;
    mongoReplicaSet?: string;
    mongoReadPreference?: string;
    connectionMode?: "standard" | "srv";
    redisDbIndex?: string;
    connectionTimeout?: string;
    tlsCa?: string;
    tlsCert?: string;
    tlsKey?: string;
    charset?: string;
    timezone?: string;
    sslMode?: string;
    useOidc?: boolean;
    oidcClientId?: string;
    oidcClientSecret?: string;
    oidcIssuerUrl?: string;
    customHeaders?: string;
    grpcPort?: string;
};

type SessionItem = {
    id: string;
    name: string;
    config: StoredConfig;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [config, setConfig] = useState<StoredConfig | null>(null);
    const [sessions, setSessions] = useState<SessionItem[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasSessions, setHasSessions] = useState(true);
    const [isConnectOpen, setIsConnectOpen] = useState(false);
    const [dataSource, setDataSource] = useState<"redis" | "mongodb" | "mysql" | "weaviate">("weaviate");
    const [protocol, setProtocol] = useState<"http" | "https">("http");
    const [host, setHost] = useState("");
    const [port, setPort] = useState("8080");
    const [username, setUsername] = useState("");
    const [apiKey, setApiKey] = useState("");
    const [useTls, setUseTls] = useState(false);
    const [useOidc, setUseOidc] = useState(false);
    const [connectionString, setConnectionString] = useState("");
    const [redisUrl, setRedisUrl] = useState("");
    const [mongoUri, setMongoUri] = useState("");
    const [redisDbIndex, setRedisDbIndex] = useState("");
    const [connectionTimeout, setConnectionTimeout] = useState("");
    const [tlsCa, setTlsCa] = useState("");
    const [tlsCert, setTlsCert] = useState("");
    const [tlsKey, setTlsKey] = useState("");
    const [mongoConnectionMode, setMongoConnectionMode] = useState<"standard" | "srv">("standard");
    const [mongoAuthDb, setMongoAuthDb] = useState("admin");
    const [mongoDatabase, setMongoDatabase] = useState("");
    const [mongoReplicaSet, setMongoReplicaSet] = useState("");
    const [mongoReadPreference, setMongoReadPreference] = useState("");
    const [mysqlDatabase, setMysqlDatabase] = useState("");
    const [mysqlCharset, setMysqlCharset] = useState("utf8mb4");
    const [mysqlTimezone, setMysqlTimezone] = useState("");
    const [mysqlSslMode, setMysqlSslMode] = useState("");
    const [weaviateGrpcPort, setWeaviateGrpcPort] = useState("");
    const [customHeaders, setCustomHeaders] = useState("");
    const [oidcClientId, setOidcClientId] = useState("");
    const [oidcClientSecret, setOidcClientSecret] = useState("");
    const [oidcIssuerUrl, setOidcIssuerUrl] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
    const [error, setError] = useState("");
    const [classes, setClasses] = useState<{ class: string, count: number }[]>([]);
    const [mongoDatabases, setMongoDatabases] = useState<{ name: string }[]>([]);
    const [mysqlDatabases, setMysqlDatabases] = useState<string[]>([]);
    const [redisKeys, setRedisKeys] = useState<{ key: string; type: string; ttl: number }[]>([]);
    const defaultPorts: Record<typeof dataSource, string> = {
        redis: "6379",
        mongodb: "27017",
        mysql: "3306",
        weaviate: "8080"
    };
    const activeSession = useMemo(() => {
        if (!sessions.length) return null;
        return sessions.find((item) => item.id === activeSessionId) || sessions[0];
    }, [sessions, activeSessionId]);
    const dataSourceLabel = useMemo(() => {
        // @ts-ignore
        const type = config?.type || "weaviate";
        if (type === "redis") return "Redis";
        if (type === "mongodb") return "MongoDB";
        if (type === "mysql") return "MySQL";
        return "Weaviate";
        // @ts-ignore
    }, [config?.type]);
    const connectionHost = useMemo(() => {
        if (config?.url) {
            try {
                const u = new URL(config.url);
                return u.host;
            } catch {
                return config.url;
            }
        }
        if (config?.redisUrl) {
            try {
                const u = new URL(config.redisUrl);
                return u.host;
            } catch {
                return config.redisUrl;
            }
        }
        if (config?.mongoUri) {
            try {
                const u = new URL(config.mongoUri);
                return u.host;
            } catch {
                return config.mongoUri;
            }
        }
        if (config?.host) {
            return config.port ? `${config.host}:${config.port}` : config.host;
        }
        return "";
    }, [config?.host, config?.port, config?.url, config?.redisUrl, config?.mongoUri]);
    const sessionTabs = useMemo(() => {
        return sessions.map((item) => {
            const type = item.config.type || "weaviate";
            const tone = type === "mysql"
                ? "bg-amber-500"
                : type === "redis"
                    ? "bg-emerald-500"
                    : type === "mongodb"
                        ? "bg-green-500"
                        : "bg-sky-500";
            return { ...item, tone };
        });
    }, [sessions]);
    const activeClassName = useMemo(() => {
        if (!pathname) return null;
        const match = pathname.match(/\/dashboard\/class\/([^/]+)/);
        if (!match) return null;
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }, [pathname]);

    const buildSessionLabel = (target: StoredConfig) => {
        const type = target.type || "weaviate";
        if (type === "weaviate") {
            if (target.url) {
                try {
                    const u = new URL(target.url);
                    return `Weaviate:${u.host}`;
                } catch {
                    return "Weaviate:instance";
                }
            }
            return "Weaviate:instance";
        }
        const fallbackHost = target.host ? (target.port ? `${target.host}:${target.port}` : target.host) : "";
        const redisHost = target.redisUrl
            ? (() => {
                try {
                    const u = new URL(target.redisUrl);
                    return u.host;
                } catch {
                    return target.redisUrl;
                }
            })()
            : "";
        const mongoHost = target.mongoUri
            ? (() => {
                try {
                    const u = new URL(target.mongoUri);
                    return u.host;
                } catch {
                    return target.mongoUri;
                }
            })()
            : "";
        const host = fallbackHost || redisHost || mongoHost || "instance";
        if (type === "redis") return `Redis:${host}`;
        if (type === "mongodb") return `MongoDB:${host}`;
        return `MySQL:${host}`;
    };

    useEffect(() => {
        const storedSessions = localStorage.getItem("weaviateSessions");
        const storedActiveId = localStorage.getItem("weaviateActiveSessionId");
        const storedConfig = localStorage.getItem("weaviateConfig");

        if (!storedSessions) {
            if (!storedConfig) {
                setHasSessions(false);
                setIsReady(true);
                return;
            }
            try {
                const legacyConfig = JSON.parse(storedConfig) as StoredConfig;
                const seedSession = {
                    id: "primary",
                    name: buildSessionLabel(legacyConfig),
                    config: legacyConfig
                };
                setSessions([seedSession]);
                setActiveSessionId(seedSession.id);
                localStorage.setItem("weaviateSessions", JSON.stringify([seedSession]));
                localStorage.setItem("weaviateActiveSessionId", seedSession.id);
                setHasSessions(true);
                setIsReady(true);
            } catch {
                setHasSessions(false);
                setIsReady(true);
            }
            return;
        }
        try {
            const parsedSessions = JSON.parse(storedSessions) as SessionItem[];
            if (!parsedSessions.length) {
                setHasSessions(false);
                setIsReady(true);
                return;
            }
            setSessions(parsedSessions);
            const nextActive = parsedSessions.find((item) => item.id === storedActiveId) || parsedSessions[0];
            setActiveSessionId(nextActive.id);
            localStorage.setItem("weaviateActiveSessionId", nextActive.id);
            setHasSessions(true);
            setIsReady(true);
        } catch {
            setHasSessions(false);
            setIsReady(true);
        }
    }, []);

    useEffect(() => {
        if (!activeSession) return;
        setConfig(activeSession.config);
    }, [activeSession]);

    useEffect(() => {
        if (!config) return;
        setClasses([]);
        setMongoDatabases([]);
        setMysqlDatabases([]);
        setRedisKeys([]);
        const type = config.type || "weaviate";

        if (type === "weaviate") {
            fetch("/api/weaviate/schema", {
                headers: {
                    "x-weaviate-url": config.url,
                    ...(config.apiKey && { "x-weaviate-api-key": config.apiKey })
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.classes) {
                        setClasses(data.classes);
                    }
                })
                .catch(() => null);
        }

        if (type === "mongodb") {
            fetch("/api/mongodb/databases", {
                headers: {
                    "x-mongo-uri": config.mongoUri || "",
                    "x-mongo-host": config.host,
                    "x-mongo-port": config.port,
                    "x-mongo-username": config.username || "",
                    "x-mongo-password": config.apiKey || "",
                    "x-mongo-auth-db": config.authDb || "admin",
                    "x-mongo-tls": config.useTls ? "true" : "false"
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.databases) {
                        setMongoDatabases(data.databases);
                    }
                })
                .catch(() => null);
        }

        if (type === "mysql") {
            fetch("/api/mysql/databases", {
                headers: {
                    "x-mysql-host": config.host,
                    "x-mysql-port": config.port,
                    "x-mysql-user": config.username || "",
                    "x-mysql-password": config.apiKey || "",
                    "x-mysql-database": config.database || ""
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.databases) {
                        setMysqlDatabases(data.databases);
                    }
                })
                .catch(() => null);
        }

        if (type === "redis") {
            fetch("/api/redis/keys?pattern=*&count=20", {
                headers: {
                    "x-redis-url": config.redisUrl || "",
                    "x-redis-host": config.host,
                    "x-redis-port": config.port,
                    "x-redis-username": config.username || "",
                    "x-redis-password": config.apiKey || "",
                    "x-redis-tls": config.useTls ? "true" : "false"
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.keys) {
                        setRedisKeys(data.keys);
                    }
                })
                .catch(() => null);
        }
    }, [config]);

    const handleDisconnect = (sessionId?: string) => {
        const targetId = sessionId || activeSessionId;
        if (!targetId) return;

        // If it's the last session being removed
        if (sessions.length === 1 && sessions[0].id === targetId) {
            localStorage.removeItem("weaviateConfig");
            localStorage.removeItem("weaviateSessions");
            localStorage.removeItem("weaviateActiveSessionId");
            setSessions([]);
            setActiveSessionId(null);
            setConfig(null);
            setHasSessions(false);
            router.push("/");
            return;
        }

        const nextSessions = sessions.filter((s) => s.id !== targetId);
        setSessions(nextSessions);
        localStorage.setItem("weaviateSessions", JSON.stringify(nextSessions));

        // If we closed the active session, switch to another one
        if (targetId === activeSessionId) {
            const nextActive = nextSessions[nextSessions.length - 1];
            if (nextActive) {
                setActiveSessionId(nextActive.id);
                localStorage.setItem("weaviateActiveSessionId", nextActive.id);
                setConfig(nextActive.config);
            }
        }
    };

    const resetConnectForm = () => {
        setDataSource("weaviate");
        setProtocol("http");
        setHost("");
        setPort(defaultPorts.weaviate);
        setUsername("");
        setApiKey("");
        setUseTls(false);
        setUseOidc(false);
        setConnectionString("");
        setRedisUrl("");
        setMongoUri("");
        setRedisDbIndex("");
        setConnectionTimeout("");
        setTlsCa("");
        setTlsCert("");
        setTlsKey("");
        setMongoConnectionMode("standard");
        setMongoAuthDb("admin");
        setMongoDatabase("");
        setMongoReplicaSet("");
        setMongoReadPreference("");
        setMysqlDatabase("");
        setMysqlCharset("utf8mb4");
        setMysqlTimezone("");
        setMysqlSslMode("");
        setWeaviateGrpcPort("");
        setCustomHeaders("");
        setOidcClientId("");
        setOidcClientSecret("");
        setOidcIssuerUrl("");
        setStatus(null);
        setError("");
    };

    const applySourceDefaults = (nextSource: typeof dataSource) => {
        setDataSource(nextSource);
        setPort(defaultPorts[nextSource]);
        if (nextSource === "weaviate") {
            setProtocol("http");
        }
        setUseTls(false);
        setUseOidc(false);
        setConnectionString("");
        setRedisUrl("");
        setMongoUri("");
        setRedisDbIndex("");
        setConnectionTimeout("");
        setTlsCa("");
        setTlsCert("");
        setTlsKey("");
        setMongoConnectionMode("standard");
        setMongoAuthDb("admin");
        setMongoDatabase("");
        setMongoReplicaSet("");
        setMongoReadPreference("");
        setMysqlDatabase("");
        setMysqlCharset("utf8mb4");
        setMysqlTimezone("");
        setMysqlSslMode("");
        setWeaviateGrpcPort("");
        setCustomHeaders("");
        setOidcClientId("");
        setOidcClientSecret("");
        setOidcIssuerUrl("");
    };

    const handleNewConnection = () => {
        resetConnectForm();
        setIsConnectOpen(true);
    };

    const buildFinalUrl = () => {
        if (dataSource !== "weaviate") return undefined;
        const trimmedConnection = connectionString.trim();
        if (trimmedConnection) {
            try {
                const u = new URL(trimmedConnection);
                return u.toString().replace(/\/$/, "");
            } catch {
                return trimmedConnection;
            }
        }
        const trimmedHost = host.trim();
        if (!trimmedHost) return "";
        const urlHost = trimmedHost.startsWith("http") ? trimmedHost : `${protocol}://${trimmedHost}`;
        try {
            const u = new URL(urlHost);
            if (u.port === "" && port) u.port = port;
            return u.toString().replace(/\/$/, "");
        } catch {
            return urlHost;
        }
    };

    const applyConnectionString = () => {
        const value = connectionString.trim();
        if (!value) return;
        setError("");
        try {
            const parsed = new URL(value);
            if (dataSource === "redis") {
                setRedisUrl(value);
                setHost(parsed.hostname);
                setPort(parsed.port || defaultPorts.redis);
                setUseTls(parsed.protocol === "rediss:");
                setUsername(decodeURIComponent(parsed.username || ""));
                setApiKey(decodeURIComponent(parsed.password || ""));
                const dbIndex = parsed.pathname.replace("/", "");
                setRedisDbIndex(dbIndex);
                return;
            }
            if (dataSource === "mongodb") {
                setMongoUri(value);
                setMongoConnectionMode(parsed.protocol === "mongodb+srv:" ? "srv" : "standard");
                setHost(parsed.hostname);
                setPort(parsed.port || defaultPorts.mongodb);
                setUsername(decodeURIComponent(parsed.username || ""));
                setApiKey(decodeURIComponent(parsed.password || ""));
                const dbName = parsed.pathname.replace("/", "");
                setMongoDatabase(dbName);
                const authDb = parsed.searchParams.get("authSource") || "admin";
                setMongoAuthDb(authDb);
                const tls = parsed.searchParams.get("tls");
                setUseTls(tls === "true" || parsed.protocol === "mongodb+srv:");
                return;
            }
            if (dataSource === "mysql") {
                setHost(parsed.hostname);
                setPort(parsed.port || defaultPorts.mysql);
                setUsername(decodeURIComponent(parsed.username || ""));
                setApiKey(decodeURIComponent(parsed.password || ""));
                const dbName = parsed.pathname.replace("/", "");
                setMysqlDatabase(dbName);
                const charset = parsed.searchParams.get("charset");
                const timezone = parsed.searchParams.get("timezone");
                const sslMode = parsed.searchParams.get("sslMode");
                if (charset) setMysqlCharset(charset);
                if (timezone) setMysqlTimezone(timezone);
                if (sslMode) setMysqlSslMode(sslMode);
                return;
            }
            if (dataSource === "weaviate") {
                setProtocol(parsed.protocol === "https:" ? "https" : "http");
                setHost(parsed.hostname);
                setPort(parsed.port || defaultPorts.weaviate);
            }
        } catch {
            setError("URI 解析失败，请检查格式");
        }
    };

    const requestConnect = async (payload: StoredConfig) => {
        if (payload.type === "weaviate") {
            const res = await fetch("/api/weaviate/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: payload.url, apiKey: payload.apiKey })
            });
            return res.json();
        }
        if (payload.type === "redis") {
            const res = await fetch("/api/redis/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: payload.redisUrl,
                    host: payload.host,
                    port: payload.port,
                    username: payload.username,
                    tls: payload.useTls,
                    password: payload.apiKey
                })
            });
            return res.json();
        }
        if (payload.type === "mongodb") {
            const res = await fetch("/api/mongodb/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    uri: payload.mongoUri,
                    host: payload.host,
                    port: payload.port,
                    username: payload.username,
                    password: payload.apiKey,
                    authDb: payload.authDb,
                    tls: payload.useTls
                })
            });
            return res.json();
        }
        const res = await fetch("/api/mysql/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                host: payload.host,
                port: payload.port,
                user: payload.username,
                password: payload.apiKey,
                database: payload.database
            })
        });
        return res.json();
    };

    const buildPayload = () => {
        return {
            type: dataSource,
            url: dataSource === "weaviate" ? buildFinalUrl() : undefined,
            host: dataSource !== "weaviate" ? host : undefined,
            port: dataSource !== "weaviate" ? port : undefined,
            protocol: dataSource === "weaviate" ? protocol : undefined,
            username: dataSource === "mongodb" || dataSource === "mysql" || dataSource === "redis" ? username : undefined,
            apiKey: apiKey || undefined,
            useTls: dataSource !== "weaviate" ? useTls : undefined,
            redisUrl: dataSource === "redis" ? redisUrl || connectionString.trim() : undefined,
            mongoUri: dataSource === "mongodb" ? mongoUri || connectionString.trim() : undefined,
            authDb: dataSource === "mongodb" ? mongoAuthDb : undefined,
            mongoDatabase: dataSource === "mongodb" ? mongoDatabase : undefined,
            mongoReplicaSet: dataSource === "mongodb" ? mongoReplicaSet : undefined,
            mongoReadPreference: dataSource === "mongodb" ? mongoReadPreference : undefined,
            connectionMode: dataSource === "mongodb" ? mongoConnectionMode : undefined,
            database: dataSource === "mysql" ? mysqlDatabase : undefined,
            charset: dataSource === "mysql" ? mysqlCharset : undefined,
            timezone: dataSource === "mysql" ? mysqlTimezone : undefined,
            sslMode: dataSource === "mysql" ? mysqlSslMode : undefined,
            redisDbIndex: dataSource === "redis" ? redisDbIndex : undefined,
            connectionTimeout: dataSource === "redis" ? connectionTimeout : undefined,
            tlsCa: dataSource === "redis" ? tlsCa : undefined,
            tlsCert: dataSource === "redis" ? tlsCert : undefined,
            tlsKey: dataSource === "redis" ? tlsKey : undefined,
            useOidc: dataSource === "weaviate" ? useOidc : undefined,
            oidcClientId: dataSource === "weaviate" ? oidcClientId : undefined,
            oidcClientSecret: dataSource === "weaviate" ? oidcClientSecret : undefined,
            oidcIssuerUrl: dataSource === "weaviate" ? oidcIssuerUrl : undefined,
            customHeaders: dataSource === "weaviate" ? customHeaders : undefined,
            grpcPort: dataSource === "weaviate" ? weaviateGrpcPort : undefined
        } as StoredConfig;
    };

    const validateForm = () => {
        if (!host.trim() && !connectionString.trim()) {
            return "请填写主机地址或 URI";
        }
        if (dataSource === "mongodb" && mongoConnectionMode === "srv") {
            return "";
        }
        if (dataSource !== "weaviate" && !port.trim() && !connectionString.trim()) {
            return "请填写端口";
        }
        return "";
    };

    const handleTest = async () => {
        setError("");
        setStatus(null);
        const validation = validateForm();
        if (validation) {
            setError(validation);
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = buildPayload();
            const data = await requestConnect(payload);
            if (data.success) {
                setStatus({ type: "success", message: "连接成功" });
            } else {
                setStatus({ type: "error", message: data.error || "连接失败，请检查配置" });
            }
        } catch (err: any) {
            setStatus({ type: "error", message: err?.message || "连接失败，请检查配置" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConnectSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setStatus(null);
        const validation = validateForm();
        if (validation) {
            setError(validation);
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = buildPayload();
            const data = await requestConnect(payload);
            if (data.success) {
                const session: SessionItem = {
                    id: crypto.randomUUID(),
                    name: buildSessionLabel(payload),
                    config: payload
                };
                const nextSessions = [session, ...sessions];
                setSessions(nextSessions);
                setActiveSessionId(session.id);
                setConfig(payload);
                setHasSessions(true);
                localStorage.setItem("weaviateSessions", JSON.stringify(nextSessions));
                localStorage.setItem("weaviateActiveSessionId", session.id);
                localStorage.setItem("weaviateConfig", JSON.stringify(payload));
                setIsConnectOpen(false);
            } else {
                setError(data.error || "连接失败，请检查配置");
            }
        } catch (err: any) {
            setError(err?.message || "连接失败，请检查配置");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isReady) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    加载中...
                </div>
            </div>
        );
    }

    if (!hasSessions) {
        return (
            <div className="relative flex h-screen flex-col bg-background">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(14,165,233,0.12),transparent_60%),radial-gradient(900px_circle_at_80%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
                <header className="relative z-10 border-b border-border/60 bg-card/60 backdrop-blur-xl shrink-0">
                    <div className="h-16 flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Workspace</div>
                            <div className="text-base font-semibold text-foreground">数据管理工作区</div>
                        </div>
                        <Button onClick={handleNewConnection}>
                            <PlusCircle className="w-4 h-4 mr-2" />
                            新增连接
                        </Button>
                    </div>
                    <div className="border-t border-border/60 bg-background/70 px-6">
                        <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                            暂无连接标签
                        </div>
                    </div>
                </header>
                <main className="relative z-10 flex-1 overflow-auto p-6">
                    <div className="mx-auto max-w-4xl">
                        <div className="rounded-3xl border border-border/60 bg-card/70 p-10 text-center space-y-4 shadow-sm backdrop-blur">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                                <Database className="w-6 h-6" />
                            </div>
                            <div className="text-xl font-semibold text-foreground">当前项目暂无连接</div>
                            <div className="text-sm text-muted-foreground">新增一个数据源连接，开始管理多种数据</div>
                            <div>
                                <Button onClick={handleNewConnection}>
                                    <PlusCircle className="w-4 h-4 mr-2" />
                                    新增连接
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
                <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
                    <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-border/60">
                        <DialogHeader>
                            <DialogTitle>新增连接</DialogTitle>
                            <DialogDescription>填写数据源连接信息，创建新的会话标签</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleConnectSubmit} className="space-y-6 overflow-y-auto max-h-[75vh] ">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">数据源类型</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(["redis", "mongodb", "mysql", "weaviate"] as const).map((option) => (
                                        <Button
                                            key={option}
                                            type="button"
                                            variant={dataSource === option ? "default" : "outline"}
                                            className="justify-start gap-2"
                                            onClick={() => applySourceDefaults(option)}
                                        >
                                            {option === "weaviate" && <Database className="w-4 h-4" />}
                                            {option === "redis" && <Key className="w-4 h-4" />}
                                            {option === "mongodb" && <Layers className="w-4 h-4" />}
                                            {option === "mysql" && <Server className="w-4 h-4" />}
                                            {option.toUpperCase()}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">使用 URI 连接</Label>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                    <Input value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="redis://user:password@host:port/0" />
                                    <Button type="button" variant="outline" className="h-10" onClick={applyConnectionString}>
                                        解析并回填
                                    </Button>
                                </div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div>Redis: redis://user:password@host:port/0</div>
                                    <div>MongoDB: mongodb://user:password@host:port/admin</div>
                                    <div>MySQL: mysql://user:password@host:port/mydb</div>
                                </div>
                            </div>
                            {dataSource === "weaviate" && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">基础网络配置</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={protocol === "http" ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setProtocol("http")}
                                            >
                                                HTTP
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={protocol === "https" ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setProtocol("https")}
                                            >
                                                HTTPS
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Host (主机/URL)</Label>
                                                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Port (端口)</Label>
                                                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.weaviate} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">认证配置</div>
                                        <div className="space-y-2">
                                            <Label>API Key</Label>
                                            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox checked={useOidc} onCheckedChange={(checked) => setUseOidc(!!checked)} />
                                            <Label className="text-sm">使用 OIDC (OpenID Connect)</Label>
                                        </div>
                                        {useOidc && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label>Client ID</Label>
                                                    <Input value={oidcClientId} onChange={(e) => setOidcClientId(e.target.value)} placeholder="Optional" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Client Secret</Label>
                                                    <Input value={oidcClientSecret} onChange={(e) => setOidcClientSecret(e.target.value)} placeholder="Optional" />
                                                </div>
                                                <div className="space-y-2 sm:col-span-2">
                                                    <Label>Issuer URL</Label>
                                                    <Input value={oidcIssuerUrl} onChange={(e) => setOidcIssuerUrl(e.target.value)} placeholder="https://example.com/issuer" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">高级配置</div>
                                        <div className="space-y-2">
                                            <Label>自定义请求头 (Custom Headers)</Label>
                                            <textarea
                                                value={customHeaders}
                                                onChange={(e) => setCustomHeaders(e.target.value)}
                                                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                                                placeholder="X-OpenAI-Api-Key: sk-xxxx"
                                                spellCheck={false}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>gRPC Port</Label>
                                            <Input value={weaviateGrpcPort} onChange={(e) => setWeaviateGrpcPort(e.target.value)} placeholder="50051" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {dataSource === "redis" && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">基础网络配置</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={!useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(false)}
                                            >
                                                TCP
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(true)}
                                            >
                                                TLS/SSL
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Host (主机地址)</Label>
                                                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Port (端口)</Label>
                                                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.redis} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">认证配置</div>
                                        <div className="space-y-2">
                                            <Label>Username (用户名)</Label>
                                            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password (密码)</Label>
                                            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">高级配置</div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Database Index (数据库索引)</Label>
                                                <Input value={redisDbIndex} onChange={(e) => setRedisDbIndex(e.target.value)} placeholder="0" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Connection Timeout (ms)</Label>
                                                <Input value={connectionTimeout} onChange={(e) => setConnectionTimeout(e.target.value)} placeholder="5000" />
                                            </div>
                                        </div>
                                        {useTls && (
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <div className="space-y-2">
                                                    <Label>CA 证书</Label>
                                                    <Input value={tlsCa} onChange={(e) => setTlsCa(e.target.value)} placeholder="Optional" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>客户端证书</Label>
                                                    <Input value={tlsCert} onChange={(e) => setTlsCert(e.target.value)} placeholder="Optional" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>私钥</Label>
                                                    <Input value={tlsKey} onChange={(e) => setTlsKey(e.target.value)} placeholder="Optional" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {dataSource === "mongodb" && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">基础网络配置</div>
                                        <div className="space-y-2">
                                            <Label>连接模式 (Connection Mode)</Label>
                                            <div className="grid grid-cols-2 gap-2">
                                                <Button
                                                    type="button"
                                                    variant={mongoConnectionMode === "standard" ? "default" : "outline"}
                                                    className="h-10 px-4"
                                                    onClick={() => setMongoConnectionMode("standard")}
                                                >
                                                    Standard
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant={mongoConnectionMode === "srv" ? "default" : "outline"}
                                                    className="h-10 px-4"
                                                    onClick={() => setMongoConnectionMode("srv")}
                                                >
                                                    DNS Seed List
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={!useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(false)}
                                            >
                                                TCP
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(true)}
                                            >
                                                TLS/SSL
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Host (主机地址)</Label>
                                                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Port (端口)</Label>
                                                <Input
                                                    value={port}
                                                    onChange={(e) => setPort(e.target.value)}
                                                    placeholder={mongoConnectionMode === "srv" ? "Optional" : defaultPorts.mongodb}
                                                    disabled={mongoConnectionMode === "srv"}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">认证配置</div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Username (用户名)</Label>
                                                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Password (密码)</Label>
                                                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label>Auth Database (authSource)</Label>
                                                <Input value={mongoAuthDb} onChange={(e) => setMongoAuthDb(e.target.value)} placeholder="admin" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">高级配置</div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Database Name (目标数据库)</Label>
                                                <Input value={mongoDatabase} onChange={(e) => setMongoDatabase(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Replica Set</Label>
                                                <Input value={mongoReplicaSet} onChange={(e) => setMongoReplicaSet(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label>Read Preference</Label>
                                                <Input value={mongoReadPreference} onChange={(e) => setMongoReadPreference(e.target.value)} placeholder="Primary" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {dataSource === "mysql" && (
                                <div className="space-y-5">
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">基础网络配置</div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={!useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(false)}
                                            >
                                                TCP
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={useTls ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setUseTls(true)}
                                            >
                                                TLS/SSL
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="col-span-2 space-y-2">
                                                <Label>Host (主机地址)</Label>
                                                <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Port (端口)</Label>
                                                <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.mysql} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">认证与目标配置</div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Username (用户名)</Label>
                                                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="root" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Password (密码)</Label>
                                                <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Required" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label>Database Name (数据库名称)</Label>
                                                <Input value={mysqlDatabase} onChange={(e) => setMysqlDatabase(e.target.value)} placeholder="Optional" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="text-sm font-semibold">高级配置</div>
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Charset (字符集)</Label>
                                                <Input value={mysqlCharset} onChange={(e) => setMysqlCharset(e.target.value)} placeholder="utf8mb4" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Timezone (时区)</Label>
                                                <Input value={mysqlTimezone} onChange={(e) => setMysqlTimezone(e.target.value)} placeholder="+08:00" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label>SSL Mode</Label>
                                                <select
                                                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                    value={mysqlSslMode}
                                                    onChange={(e) => setMysqlSslMode(e.target.value)}
                                                >
                                                    <option value="">Optional</option>
                                                    <option value="DISABLED">DISABLED</option>
                                                    <option value="PREFERRED">PREFERRED</option>
                                                    <option value="REQUIRED">REQUIRED</option>
                                                    <option value="VERIFY_CA">VERIFY_CA</option>
                                                    <option value="VERIFY_IDENTITY">VERIFY_IDENTITY</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {status && (
                                <div
                                    className={`p-3 text-sm rounded-lg border text-center ${status.type === "success"
                                        ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                                        : "text-destructive bg-destructive/10 border-destructive/20"
                                        }`}
                                >
                                    {status.message}
                                </div>
                            )}
                            {error && (
                                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                                    {error}
                                </div>
                            )}

                            <DialogFooter className="gap-3">
                                <Button type="button" variant="outline" onClick={handleTest} disabled={isSubmitting}>
                                    测试
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "连接中..." : "连接"}
                                </Button>
                            </DialogFooter>
                            <div className="text-xs text-muted-foreground text-center">
                                凭证仅用于会话连接，敏感信息不会展示为明文
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    加载中...
                </div>
            </div>
        );
    }

    return (
        <div className="relative flex h-screen overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,rgba(14,165,233,0.12),transparent_60%),radial-gradient(900px_circle_at_80%_0%,rgba(34,211,238,0.12),transparent_55%)]" />
            <div className="relative z-10 flex-1 flex flex-col min-w-0">
                <header className="border-b border-border/60 bg-card/60 backdrop-blur-xl shrink-0 z-10">
                    <div className="h-16 flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <div className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Workspace</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button onClick={handleNewConnection}>
                                <PlusCircle className="w-4 h-4 mr-2" />
                                新增连接
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDisconnect()} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                <LogOut className="w-4 h-4 mr-2" />
                                断开连接
                            </Button>
                        </div>
                    </div>
                    <div className="border-t border-border/60 bg-background/70 px-6">
                        <div className="flex items-center gap-4 py-3 overflow-x-auto">
                            {sessionTabs.map((tab) => {
                                const isActive = activeSessionId === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${isActive
                                            ? "border-primary/40 bg-primary/10 text-foreground shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
                                            : "border-transparent bg-card/60 text-muted-foreground hover:text-foreground hover:border-border/60"
                                            }`}
                                        onClick={() => {
                                            setActiveSessionId(tab.id);
                                            localStorage.setItem("weaviateActiveSessionId", tab.id);
                                        }}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${tab.tone}`} />
                                        {tab.name}
                                        <div
                                            className={`ml-1 p-0.5 rounded-full hover:bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "text-foreground/60 hover:text-foreground" : "text-muted-foreground hover:text-destructive"}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDisconnect(tab.id);
                                            }}
                                        >
                                            <X className="w-3 h-3" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </header>

                <main key={activeSessionId || "default"} className="flex-1 overflow-auto bg-background/80 p-6">
                    <div className="mx-auto w-full">
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] gap-6">
                            <div className="min-w-0 space-y-6">
                                {children}
                            </div>
                            <aside className="rounded-2xl border border-border/60 bg-card/60 p-4 h-fit">
                                {dataSourceLabel === "Weaviate" && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Weaviate 类</div>
                                        {classes.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">暂无类</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {classes.map((cls) => {
                                                    const isActive = activeClassName === cls.class;
                                                    return (
                                                        <Link
                                                            key={cls.class}
                                                            href={`/dashboard/class/${cls.class}`}
                                                            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors border ${isActive
                                                                ? "border-primary/40 bg-primary/10 text-foreground"
                                                                : "border-transparent text-foreground/80 hover:bg-card/80 hover:text-foreground hover:border-border/60"
                                                                }`}
                                                        >
                                                            <FileText className="w-4 h-4 text-primary" />
                                                            <span className="truncate">{cls.class}</span>
                                                            <span className="ml-auto text-xs text-muted-foreground">{cls.count}</span>
                                                        </Link>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {dataSourceLabel === "MongoDB" && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">MongoDB 数据库</div>
                                        {mongoDatabases.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">暂无数据库</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {mongoDatabases.map((db) => (
                                                    <div
                                                        key={db.name}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 border border-transparent hover:border-border/60 hover:bg-card/80"
                                                    >
                                                        <Layers className="w-4 h-4 text-primary" />
                                                        <span className="truncate">{db.name}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {dataSourceLabel === "MySQL" && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">MySQL 数据库</div>
                                        {mysqlDatabases.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">暂无数据库</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {mysqlDatabases.map((schema) => (
                                                    <div
                                                        key={schema}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 border border-transparent hover:border-border/60 hover:bg-card/80"
                                                    >
                                                        <Table className="w-4 h-4 text-primary" />
                                                        <span className="truncate">{schema}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {dataSourceLabel === "Redis" && (
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.18em]">Redis Keyspace</div>
                                        {redisKeys.length === 0 ? (
                                            <div className="rounded-lg border border-dashed border-border/60 px-3 py-3 text-sm text-muted-foreground">暂无 Key</div>
                                        ) : (
                                            <div className="space-y-1">
                                                {redisKeys.map((item) => (
                                                    <div
                                                        key={item.key}
                                                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 border border-transparent hover:border-border/60 hover:bg-card/80"
                                                    >
                                                        <Key className="w-4 h-4 text-primary" />
                                                        <span className="truncate">{item.key}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </aside>
                        </div>
                    </div>
                </main>
            </div>
            <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
                <DialogContent className="max-w-2xl bg-card/90 backdrop-blur-xl border-border/60">
                    <DialogHeader>
                        <DialogTitle>新增连接</DialogTitle>
                        <DialogDescription>填写数据源连接信息，创建新的会话标签</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleConnectSubmit} className="space-y-6 overflow-y-auto max-h-[75vh]">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">数据源类型</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {(["redis", "mongodb", "mysql", "weaviate"] as const).map((option) => (
                                    <Button
                                        key={option}
                                        type="button"
                                        variant={dataSource === option ? "default" : "outline"}
                                        className="justify-start gap-2 h-11"
                                        onClick={() => applySourceDefaults(option)}
                                    >
                                        {option === "redis" ? <Key className="w-4 h-4" /> : <Server className="w-4 h-4" />}
                                        {option === "redis" ? "Redis" : option === "mongodb" ? "MongoDB" : option === "mysql" ? "MySQL" : "Weaviate"}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">使用 URI 连接</Label>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                                <Input value={connectionString} onChange={(e) => setConnectionString(e.target.value)} placeholder="redis://user:password@host:port/0" />
                                <Button type="button" variant="outline" className="h-10" onClick={applyConnectionString}>
                                    解析并回填
                                </Button>
                            </div>
                            <div className="space-y-1 text-xs text-muted-foreground">
                                <div>Redis: redis://user:password@host:port/0</div>
                                <div>MongoDB: mongodb://user:password@host:port/admin</div>
                                <div>MySQL: mysql://user:password@host:port/mydb</div>
                            </div>
                        </div>
                        {dataSource === "weaviate" && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">基础网络配置</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={protocol === "http" ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setProtocol("http")}
                                        >
                                            HTTP
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={protocol === "https" ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setProtocol("https")}
                                        >
                                            HTTPS
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-2">
                                            <Label>Host (主机/URL)</Label>
                                            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Port (端口)</Label>
                                            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.weaviate} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">认证配置</div>
                                    <div className="space-y-2">
                                        <Label>API Key</Label>
                                        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox checked={useOidc} onCheckedChange={(checked) => setUseOidc(!!checked)} />
                                        <Label className="text-sm">使用 OIDC (OpenID Connect)</Label>
                                    </div>
                                    {useOidc && (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            <div className="space-y-2">
                                                <Label>Client ID</Label>
                                                <Input value={oidcClientId} onChange={(e) => setOidcClientId(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client Secret</Label>
                                                <Input value={oidcClientSecret} onChange={(e) => setOidcClientSecret(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label>Issuer URL</Label>
                                                <Input value={oidcIssuerUrl} onChange={(e) => setOidcIssuerUrl(e.target.value)} placeholder="https://example.com/issuer" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">高级配置</div>
                                    <div className="space-y-2">
                                        <Label>自定义请求头 (Custom Headers)</Label>
                                        <textarea
                                            value={customHeaders}
                                            onChange={(e) => setCustomHeaders(e.target.value)}
                                            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono"
                                            placeholder="X-OpenAI-Api-Key: sk-xxxx"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>gRPC Port</Label>
                                        <Input value={weaviateGrpcPort} onChange={(e) => setWeaviateGrpcPort(e.target.value)} placeholder="50051" />
                                    </div>
                                </div>
                            </div>
                        )}
                        {dataSource === "redis" && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">基础网络配置</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={!useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(false)}
                                        >
                                            TCP
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(true)}
                                        >
                                            TLS/SSL
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-2">
                                            <Label>Host (主机地址)</Label>
                                            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Port (端口)</Label>
                                            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.redis} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">认证配置</div>
                                    <div className="space-y-2">
                                        <Label>Username (用户名)</Label>
                                        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password (密码)</Label>
                                        <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">高级配置</div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Database Index (数据库索引)</Label>
                                            <Input value={redisDbIndex} onChange={(e) => setRedisDbIndex(e.target.value)} placeholder="0" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Connection Timeout (ms)</Label>
                                            <Input value={connectionTimeout} onChange={(e) => setConnectionTimeout(e.target.value)} placeholder="5000" />
                                        </div>
                                    </div>
                                    {useTls && (
                                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                            <div className="space-y-2">
                                                <Label>CA 证书</Label>
                                                <Input value={tlsCa} onChange={(e) => setTlsCa(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>客户端证书</Label>
                                                <Input value={tlsCert} onChange={(e) => setTlsCert(e.target.value)} placeholder="Optional" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>私钥</Label>
                                                <Input value={tlsKey} onChange={(e) => setTlsKey(e.target.value)} placeholder="Optional" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        {dataSource === "mongodb" && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">基础网络配置</div>
                                    <div className="space-y-2">
                                        <Label>连接模式 (Connection Mode)</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                type="button"
                                                variant={mongoConnectionMode === "standard" ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setMongoConnectionMode("standard")}
                                            >
                                                Standard
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={mongoConnectionMode === "srv" ? "default" : "outline"}
                                                className="h-10 px-4"
                                                onClick={() => setMongoConnectionMode("srv")}
                                            >
                                                DNS Seed List
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={!useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(false)}
                                        >
                                            TCP
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(true)}
                                        >
                                            TLS/SSL
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-2">
                                            <Label>Host (主机地址)</Label>
                                            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Port (端口)</Label>
                                            <Input
                                                value={port}
                                                onChange={(e) => setPort(e.target.value)}
                                                placeholder={mongoConnectionMode === "srv" ? "Optional" : defaultPorts.mongodb}
                                                disabled={mongoConnectionMode === "srv"}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">认证配置</div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Username (用户名)</Label>
                                            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password (密码)</Label>
                                            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Auth Database (authSource)</Label>
                                            <Input value={mongoAuthDb} onChange={(e) => setMongoAuthDb(e.target.value)} placeholder="admin" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">高级配置</div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Database Name (目标数据库)</Label>
                                            <Input value={mongoDatabase} onChange={(e) => setMongoDatabase(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Replica Set</Label>
                                            <Input value={mongoReplicaSet} onChange={(e) => setMongoReplicaSet(e.target.value)} placeholder="Optional" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Read Preference</Label>
                                            <Input value={mongoReadPreference} onChange={(e) => setMongoReadPreference(e.target.value)} placeholder="Primary" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {dataSource === "mysql" && (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">基础网络配置</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={!useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(false)}
                                        >
                                            TCP
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={useTls ? "default" : "outline"}
                                            className="h-10 px-4"
                                            onClick={() => setUseTls(true)}
                                        >
                                            TLS/SSL
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="col-span-2 space-y-2">
                                            <Label>Host (主机地址)</Label>
                                            <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Port (端口)</Label>
                                            <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder={defaultPorts.mysql} />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">认证与目标配置</div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Username (用户名)</Label>
                                            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="root" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password (密码)</Label>
                                            <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Required" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>Database Name (数据库名称)</Label>
                                            <Input value={mysqlDatabase} onChange={(e) => setMysqlDatabase(e.target.value)} placeholder="Optional" />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm font-semibold">高级配置</div>
                                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label>Charset (字符集)</Label>
                                            <Input value={mysqlCharset} onChange={(e) => setMysqlCharset(e.target.value)} placeholder="utf8mb4" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Timezone (时区)</Label>
                                            <Input value={mysqlTimezone} onChange={(e) => setMysqlTimezone(e.target.value)} placeholder="+08:00" />
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label>SSL Mode</Label>
                                            <select
                                                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                                                value={mysqlSslMode}
                                                onChange={(e) => setMysqlSslMode(e.target.value)}
                                            >
                                                <option value="">Optional</option>
                                                <option value="DISABLED">DISABLED</option>
                                                <option value="PREFERRED">PREFERRED</option>
                                                <option value="REQUIRED">REQUIRED</option>
                                                <option value="VERIFY_CA">VERIFY_CA</option>
                                                <option value="VERIFY_IDENTITY">VERIFY_IDENTITY</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {status && (
                            <div
                                className={`p-3 text-sm rounded-lg border text-center ${status.type === "success"
                                    ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                                    : "text-destructive bg-destructive/10 border-destructive/20"
                                    }`}
                            >
                                {status.message}
                            </div>
                        )}
                        {error && (
                            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center">
                                {error}
                            </div>
                        )}

                        <DialogFooter className="gap-3">
                            <Button type="button" variant="outline" onClick={handleTest} disabled={isSubmitting}>
                                测试
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "连接中..." : "连接"}
                            </Button>
                        </DialogFooter>
                        <div className="text-xs text-muted-foreground text-center">
                            凭证仅用于会话连接，敏感信息不会展示为明文
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
