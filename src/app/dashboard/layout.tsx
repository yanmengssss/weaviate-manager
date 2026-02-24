"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Database, FileText, Key, Layers, LogOut, PlusCircle, Table } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [config, setConfig] = useState<{
        type?: "redis" | "mongodb" | "mysql" | "weaviate";
        url?: string;
        host?: string;
        port?: string;
        protocol?: "http" | "https";
        username?: string;
        apiKey?: string;
        useTls?: boolean;
    } | null>(null);
    const [classes, setClasses] = useState<{ class: string, count: number }[]>([]);
    const [mongoDatabases, setMongoDatabases] = useState<{ name: string }[]>([]);
    const [mysqlDatabases, setMysqlDatabases] = useState<string[]>([]);
    const [redisKeys, setRedisKeys] = useState<{ key: string; type: string; ttl: number }[]>([]);
    const [activeTab, setActiveTab] = useState("primary");
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
        if (config?.host) {
            return config.port ? `${config.host}:${config.port}` : config.host;
        }
        return "";
    }, [config?.host, config?.port, config?.url]);
    const sessionTabs = useMemo(() => ([
        { id: "primary", label: `${dataSourceLabel}:prod`, tone: "bg-blue-500" },
        { id: "mysql-analytics", label: "MySQL:analytics", tone: "bg-amber-500" },
        { id: "redis-cache", label: "Redis:cache", tone: "bg-emerald-500" },
        { id: "weaviate-lab", label: "Weaviate:lab", tone: "bg-sky-500" }
    ]), [dataSourceLabel]);

    useEffect(() => {
        const storedConfig = localStorage.getItem("weaviateConfig");
        if (!storedConfig) {
            router.push("/");
            return;
        }
        try {
            const parsedConfig = JSON.parse(storedConfig);
            setConfig(parsedConfig);
            const type = parsedConfig.type || "weaviate";

            if (type === "weaviate") {
                fetch("/api/weaviate/schema", {
                    headers: {
                        "x-weaviate-url": parsedConfig.url,
                        ...(parsedConfig.apiKey && { "x-weaviate-api-key": parsedConfig.apiKey })
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
                        "x-mongo-host": parsedConfig.host,
                        "x-mongo-port": parsedConfig.port,
                        "x-mongo-username": parsedConfig.username || "",
                        "x-mongo-password": parsedConfig.apiKey || "",
                        "x-mongo-tls": parsedConfig.useTls ? "true" : "false"
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
                        "x-mysql-host": parsedConfig.host,
                        "x-mysql-port": parsedConfig.port,
                        "x-mysql-user": parsedConfig.username || "",
                        "x-mysql-password": parsedConfig.apiKey || ""
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
                        "x-redis-host": parsedConfig.host,
                        "x-redis-port": parsedConfig.port,
                        "x-redis-password": parsedConfig.apiKey || "",
                        "x-redis-tls": parsedConfig.useTls ? "true" : "false"
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

        } catch {
            router.push("/");
        }
    }, [router]);

    const handleDisconnect = () => {
        localStorage.removeItem("weaviateConfig");
        router.push("/");
    };

    if (!config) return null; // or a loading spinner

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <aside className="w-64 border-r border-border bg-card flex flex-col items-stretch shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-border bg-card/50">
                    <Database className="w-6 h-6 text-primary mr-3" />
                    <span className="font-bold text-lg text-foreground tracking-tight">Data Manager</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
                    {dataSourceLabel === "Weaviate" && (
                        <div className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Weaviate Classes
                            </h3>
                            {classes.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground italic">No classes found</div>
                            ) : (
                                classes.map((cls) => (
                                    <Link key={cls.class} href={`/dashboard/class/${cls.class}`} className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-muted hover:text-foreground text-foreground/80 transition-colors">
                                        <FileText className="w-4 h-4 text-primary" />
                                        {cls.class}
                                        <span className="ml-auto text-xs opacity-60">{cls.count}</span>
                                    </Link>
                                ))
                            )}
                        </div>
                    )}

                    {dataSourceLabel === "MongoDB" && (
                        <div className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                MongoDB Databases
                            </h3>
                            {mongoDatabases.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground italic">No databases found</div>
                            ) : (
                                mongoDatabases.map((db) => (
                                    <div
                                        key={db.name}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/80"
                                    >
                                        <Layers className="w-4 h-4 text-primary" />
                                        {db.name}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {dataSourceLabel === "MySQL" && (
                        <div className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                MySQL Schemas
                            </h3>
                            {mysqlDatabases.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground italic">No schemas found</div>
                            ) : (
                                mysqlDatabases.map((schema) => (
                                    <div
                                        key={schema}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/80"
                                    >
                                        <Table className="w-4 h-4 text-primary" />
                                        {schema}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {dataSourceLabel === "Redis" && (
                        <div className="space-y-1">
                            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Redis Keyspace
                            </h3>
                            {redisKeys.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground italic">No keys found</div>
                            ) : (
                                redisKeys.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/80"
                                    >
                                        <Key className="w-4 h-4 text-primary" />
                                        <span className="truncate">{item.key}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    <div className="mt-auto pt-4 border-t border-border space-y-2">
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                            <PlusCircle className="w-4 h-4" />
                            New Connection
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                            <Database className="w-4 h-4" />
                            Workspace Settings
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="border-b border-border bg-card/50 backdrop-blur-md shrink-0 z-10">
                    <div className="h-16 flex items-center justify-between px-6">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground truncate max-w-xl">
                            <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{dataSourceLabel}</span>
                                <span className="font-medium text-foreground truncate">{connectionHost || "Connected"}</span>
                            </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                            <LogOut className="w-4 h-4 mr-2" />
                            Disconnect
                        </Button>
                    </div>
                    <div className="border-t border-border bg-background/60 px-6">
                        <div className="flex items-center gap-2 py-3 overflow-x-auto">
                            {sessionTabs.map((tab) => {
                                const isActive = activeTab === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                                            isActive
                                                ? "border-primary/30 bg-primary/10 text-foreground"
                                                : "border-transparent bg-muted/60 text-muted-foreground hover:text-foreground"
                                        }`}
                                        onClick={() => setActiveTab(tab.id)}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${tab.tone}`} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                            <Button variant="outline" size="sm" className="ml-auto h-8">
                                <PlusCircle className="w-4 h-4 mr-1" />
                                New Tab
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-background p-6">
                    <div className="mx-auto max-w-7xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
