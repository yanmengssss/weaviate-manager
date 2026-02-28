"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StoredConfig = {
    type: "redis" | "mongodb" | "mysql" | "weaviate";
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

const fetchJson = async (url: string, options?: RequestInit) => {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "请求失败");
    }
    return data;
};

export default function DashboardOverviewPage() {
    const [config, setConfig] = useState<StoredConfig | null>(null);
    const [loadError, setLoadError] = useState("");
    const [weaviateStatus, setWeaviateStatus] = useState<"idle" | "loading" | "empty">("idle");
    const router = useRouter();

    const headers = useMemo(() => {
        if (!config) return {};
        if (config.type === "redis") {
            return {
                "x-redis-url": config.redisUrl || "",
                "x-redis-host": config.host || "",
                "x-redis-port": config.port || "",
                "x-redis-username": config.username || "",
                "x-redis-password": config.apiKey || "",
                "x-redis-tls": config.useTls ? "true" : "false"
            };
        }
        if (config.type === "mongodb") {
            return {
                "x-mongo-uri": config.mongoUri || "",
                "x-mongo-host": config.host || "",
                "x-mongo-port": config.port || "",
                "x-mongo-username": config.username || "",
                "x-mongo-password": config.apiKey || "",
                "x-mongo-auth-db": config.authDb || "admin",
                "x-mongo-tls": config.useTls ? "true" : "false"
            };
        }
        if (config.type === "mysql") {
            return {
                "x-mysql-host": config.host || "",
                "x-mysql-port": config.port || "",
                "x-mysql-user": config.username || "",
                "x-mysql-password": config.apiKey || "",
                "x-mysql-database": config.database || ""
            };
        }
        return {
            "x-weaviate-url": config.url || "",
            ...(config.apiKey ? { "x-weaviate-api-key": config.apiKey } : {})
        };
    }, [config]);

    useEffect(() => {
        const storedSessions = localStorage.getItem("weaviateSessions");
        const storedActiveId = localStorage.getItem("weaviateActiveSessionId");
        const stored = localStorage.getItem("weaviateConfig");
        if (!storedSessions && !stored) {
            setLoadError("未检测到连接信息，请返回重新连接");
            return;
        }
        try {
            if (storedSessions) {
                const sessions = JSON.parse(storedSessions) as SessionItem[];
                const active = sessions.find((item) => item.id === storedActiveId) || sessions[0];
                if (!active) {
                    setLoadError("未检测到连接信息，请返回重新连接");
                    return;
                }
                setConfig(active.config);
                return;
            }
            const parsed = JSON.parse(stored || "{}") as StoredConfig;
            if (!parsed.type) {
                setLoadError("连接信息解析失败，请返回重新连接");
                return;
            }
            setConfig(parsed);
        } catch {
            setLoadError("连接信息解析失败，请返回重新连接");
        }
    }, []);

    useEffect(() => {
        if (!config || config.type !== "weaviate") return;
        let cancelled = false;
        const loadClasses = async () => {
            setWeaviateStatus("loading");
            try {
                const data = await fetchJson("/api/weaviate/schema", { headers });
                const nextClass = data.classes?.[0]?.class;
                if (cancelled) return;
                if (nextClass) {
                    router.replace(`/dashboard/class/${nextClass}`);
                    return;
                }
                setWeaviateStatus("empty");
            } catch {
                if (!cancelled) {
                    setWeaviateStatus("empty");
                }
            }
        };
        loadClasses();
        return () => {
            cancelled = true;
        };
    }, [config, headers, router]);

    if (loadError) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="rounded-2xl border border-border/60 bg-card/70 px-10 py-8 text-center text-muted-foreground shadow-sm">
                    {loadError}
                </div>
            </div>
        );
    }

    if (!config) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/70 px-4 py-2 shadow-sm">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    加载中...
                </div>
            </div>
        );
    }

    if (config.type === "weaviate") {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                {weaviateStatus === "empty" ? (
                    <div className="rounded-2xl border border-border/60 bg-card/70 px-8 py-6 text-sm">暂无 Class 数据</div>
                ) : (
                    <div className="flex items-center gap-3 rounded-full border border-border/60 bg-card/70 px-4 py-2 shadow-sm">
                        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        正在加载 Class...
                    </div>
                )}
            </div>
        );
    }

    if (config.type === "redis") {
        return <RedisPanel headers={headers} />;
    }

    if (config.type === "mongodb") {
        return <MongoPanel headers={headers} />;
    }

    return <MysqlPanel headers={headers} />;
}

function RedisPanel({ headers }: { headers: Record<string, string> }) {
    const [pattern, setPattern] = useState("*");
    const [cursor, setCursor] = useState("0");
    const [keys, setKeys] = useState<{ key: string; type: string; ttl: number }[]>([]);
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [selectedValue, setSelectedValue] = useState<any>(null);
    const [type, setType] = useState("string");
    const [valueText, setValueText] = useState("");
    const [ttl, setTtl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const loadKeys = async (nextCursor?: string) => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/redis/keys?pattern=${encodeURIComponent(pattern)}&cursor=${encodeURIComponent(nextCursor || "0")}&count=50`, { headers });
            setKeys(data.keys || []);
            setCursor(data.cursor || "0");
        } catch (e: any) {
            setError(e.message || "读取 Key 失败");
        } finally {
            setLoading(false);
        }
    };

    const loadKeyDetail = async (key: string) => {
        setSelectedKey(key);
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/redis/key?key=${encodeURIComponent(key)}`, { headers });
            setSelectedValue(data);
            if (data?.type) {
                setType(data.type);
                if (data.type === "string") {
                    setValueText(data.value ?? "");
                } else {
                    setValueText(JSON.stringify(data.value ?? {}, null, 2));
                }
            }
        } catch (e: any) {
            setError(e.message || "读取 Key 失败");
        } finally {
            setLoading(false);
        }
    };

    const saveKey = async () => {
        if (!selectedKey) {
            setError("请输入 Key");
            return;
        }
        setLoading(true);
        setError("");
        try {
            let value: any = valueText;
            if (type !== "string") {
                value = valueText ? JSON.parse(valueText) : type === "list" || type === "set" || type === "zset" ? [] : {};
            }
            const ttlValue = ttl ? Number(ttl) : undefined;
            await fetchJson("/api/redis/key", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    key: selectedKey,
                    type,
                    value,
                    ttl: Number.isFinite(ttlValue) ? ttlValue : undefined,
                    replace: true
                })
            });
            await loadKeyDetail(selectedKey);
            await loadKeys(cursor);
        } catch (e: any) {
            setError(e.message || "保存失败");
        } finally {
            setLoading(false);
        }
    };

    const deleteKey = async () => {
        if (!selectedKey) return;
        setLoading(true);
        setError("");
        try {
            await fetchJson(`/api/redis/key?key=${encodeURIComponent(selectedKey)}`, {
                method: "DELETE",
                headers
            });
            setSelectedKey(null);
            setSelectedValue(null);
            await loadKeys(cursor);
        } catch (e: any) {
            setError(e.message || "删除失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadKeys();
    }, []);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-4">
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">Keyspace</div>
                        <div className="ml-auto text-xs text-muted-foreground">Cursor: {cursor}</div>
                    </div>
                    <div className="p-3 space-y-3">
                        <div className="flex gap-2">
                            <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="搜索 key 或 pattern" />
                            <Button onClick={() => loadKeys()} disabled={loading}>扫描</Button>
                        </div>
                        <div className="rounded-lg border border-border/60 bg-background/70">
                            <div className="grid grid-cols-[1fr_72px_64px] gap-2 px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border/60">
                                <div>Key</div>
                                <div>Type</div>
                                <div>TTL</div>
                            </div>
                            <div className="max-h-[520px] overflow-auto">
                                {keys.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                                        {loading ? "加载中..." : "暂无 Key"}
                                    </div>
                                ) : (
                                    keys.map((item) => (
                                        <button
                                            key={item.key}
                                            type="button"
                                            onClick={() => loadKeyDetail(item.key)}
                                            className={`grid w-full grid-cols-[1fr_72px_64px] gap-2 px-3 py-2 text-left text-sm border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${selectedKey === item.key ? "bg-muted/40 text-foreground" : "text-foreground/80"}`}
                                        >
                                            <div className="truncate">{item.key}</div>
                                            <div className="uppercase text-xs">{item.type}</div>
                                            <div className="text-xs">{item.ttl}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Button variant="outline" onClick={() => loadKeys(cursor)} disabled={loading || cursor === "0"}>下一页</Button>
                            <span className="text-xs text-muted-foreground">共 {keys.length} 条</span>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">Key 详情</div>
                        <div className="ml-auto flex items-center gap-2">
                            <Button onClick={saveKey} disabled={loading}>保存</Button>
                            <Button variant="destructive" onClick={deleteKey} disabled={loading || !selectedKey}>删除</Button>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-2 md:col-span-2">
                                <Label>Key</Label>
                                <Input value={selectedKey || ""} onChange={(e) => setSelectedKey(e.target.value)} placeholder="例如 user:1" />
                            </div>
                            <div className="space-y-2">
                                <Label>TTL</Label>
                                <Input value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="秒" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                                    {["string", "hash", "list", "set", "zset"].map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>加载方式</Label>
                                <Input value="Live" readOnly />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Value</Label>
                            <textarea
                                value={valueText}
                                onChange={(e) => setValueText(e.target.value)}
                                className="min-h-[260px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                            />
                        </div>
                        {selectedValue && (
                            <pre className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-3 overflow-auto">
                                {JSON.stringify(selectedValue, null, 2)}
                            </pre>
                        )}
                        {error && <div className="text-sm text-destructive">{error}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function MongoPanel({ headers }: { headers: Record<string, string> }) {
    const [databases, setDatabases] = useState<{ name: string }[]>([]);
    const [collections, setCollections] = useState<{ name: string }[]>([]);
    const [db, setDb] = useState("");
    const [collection, setCollection] = useState("");
    const [documents, setDocuments] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [filterJson, setFilterJson] = useState("{}");
    const [limit, setLimit] = useState("20");
    const [skip, setSkip] = useState("0");
    const [insertJson, setInsertJson] = useState("{\n  \n}");
    const [updateFilterJson, setUpdateFilterJson] = useState("{}");
    const [updateJson, setUpdateJson] = useState("{\n  \n}");
    const [deleteFilterJson, setDeleteFilterJson] = useState("{}");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadDatabases = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson("/api/mongodb/databases", { headers });
            setDatabases(data.databases || []);
            if (data.databases?.length && !db) {
                setDb(data.databases[0].name);
            }
        } catch (e: any) {
            setError(e.message || "读取数据库失败");
        } finally {
            setLoading(false);
        }
    };

    const loadCollections = async (targetDb: string) => {
        if (!targetDb) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/mongodb/collections?db=${encodeURIComponent(targetDb)}`, { headers });
            setCollections(data.collections || []);
            if (data.collections?.length) {
                setCollection(data.collections[0].name);
            } else {
                setCollection("");
            }
        } catch (e: any) {
            setError(e.message || "读取集合失败");
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        if (!db || !collection) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/mongodb/documents?db=${encodeURIComponent(db)}&collection=${encodeURIComponent(collection)}&limit=${encodeURIComponent(limit)}&skip=${encodeURIComponent(skip)}&filter=${encodeURIComponent(filterJson)}`, { headers });
            setDocuments(data.items || []);
            setTotal(data.total || 0);
        } catch (e: any) {
            setError(e.message || "读取文档失败");
        } finally {
            setLoading(false);
        }
    };

    const formatMongoId = (value: any) => {
        if (value === null || value === undefined) return "-";
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return String(value);
        }
        if (typeof value === "object") {
            if ("$oid" in value) return String(value.$oid);
            if ("oid" in value) return String(value.oid);
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    };

    const insertDocument = async () => {
        if (!db || !collection) return;
        setLoading(true);
        setError("");
        try {
            const document = JSON.parse(insertJson);
            await fetchJson("/api/mongodb/documents", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ db, collection, document })
            });
            await loadDocuments();
        } catch (e: any) {
            setError(e.message || "插入失败");
        } finally {
            setLoading(false);
        }
    };

    const updateDocument = async () => {
        if (!db || !collection) return;
        setLoading(true);
        setError("");
        try {
            const filter = JSON.parse(updateFilterJson);
            const update = JSON.parse(updateJson);
            await fetchJson("/api/mongodb/documents", {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ db, collection, filter, update })
            });
            await loadDocuments();
        } catch (e: any) {
            setError(e.message || "更新失败");
        } finally {
            setLoading(false);
        }
    };

    const deleteDocument = async () => {
        if (!db || !collection) return;
        setLoading(true);
        setError("");
        try {
            const filter = JSON.parse(deleteFilterJson);
            await fetchJson("/api/mongodb/documents", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ db, collection, filter })
            });
            await loadDocuments();
        } catch (e: any) {
            setError(e.message || "删除失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDatabases();
    }, []);

    useEffect(() => {
        if (db) {
            loadCollections(db);
        }
    }, [db]);

    useEffect(() => {
        if (db && collection) {
            loadDocuments();
        }
    }, [db, collection]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="border-b border-border/60 bg-background/70 px-4 py-3 text-sm font-semibold">MongoDB</div>
                    <div className="p-3 space-y-4">
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Databases</div>
                            <div className="space-y-1">
                                {databases.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-muted-foreground">暂无数据库</div>
                                ) : (
                                    databases.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setDb(item.name)}
                                            className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40 ${db === item.name ? "bg-muted/40 text-foreground" : "text-foreground/80"}`}
                                        >
                                            {item.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Collections</div>
                            <div className="space-y-1">
                                {collections.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-muted-foreground">暂无集合</div>
                                ) : (
                                    collections.map((item) => (
                                        <button
                                            key={item.name}
                                            type="button"
                                            onClick={() => setCollection(item.name)}
                                            className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40 ${collection === item.name ? "bg-muted/40 text-foreground" : "text-foreground/80"}`}
                                        >
                                            {item.name}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <span>Documents</span>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{db || "未选择数据库"}</span>
                                <span>/</span>
                                <span>{collection || "未选择集合"}</span>
                            </div>
                            <Button variant="outline" onClick={loadDocuments} disabled={loading}>刷新</Button>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_120px_120px_auto] gap-3 items-end">
                            <div className="space-y-2">
                                <Label>Filter</Label>
                                <Input value={filterJson} onChange={(e) => setFilterJson(e.target.value)} placeholder='{"status":"active"}' />
                            </div>
                            <div className="space-y-2">
                                <Label>Limit</Label>
                                <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Skip</Label>
                                <Input value={skip} onChange={(e) => setSkip(e.target.value)} />
                            </div>
                            <div className="flex items-end">
                                <Button onClick={loadDocuments} disabled={loading}>Find</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
                            <div className="space-y-3">
                                <div className="rounded-md border border-border overflow-hidden">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[220px]">_id</TableHead>
                                                <TableHead>Document</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {documents.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                                                        {loading ? "加载中..." : "暂无数据"}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                documents.map((doc, index) => {
                                                    const docId = formatMongoId(doc?._id);
                                                    return (
                                                        <TableRow key={docId !== "-" ? docId : `${index}`}>
                                                            <TableCell className="truncate">{docId}</TableCell>
                                                            <TableCell>
                                                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(doc, null, 2)}</pre>
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                <div className="text-xs text-muted-foreground">Total: {total}</div>
                            </div>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>插入文档</Label>
                                    <textarea value={insertJson} onChange={(e) => setInsertJson(e.target.value)} className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                                    <Button onClick={insertDocument} disabled={loading}>插入</Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>更新文档 Filter</Label>
                                    <textarea value={updateFilterJson} onChange={(e) => setUpdateFilterJson(e.target.value)} className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                                    <Label>更新文档 Update</Label>
                                    <textarea value={updateJson} onChange={(e) => setUpdateJson(e.target.value)} className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                                    <Button onClick={updateDocument} disabled={loading}>更新</Button>
                                </div>
                                <div className="space-y-2">
                                    <Label>删除文档 Filter</Label>
                                    <textarea value={deleteFilterJson} onChange={(e) => setDeleteFilterJson(e.target.value)} className="min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                                    <Button variant="destructive" onClick={deleteDocument} disabled={loading}>删除</Button>
                                </div>
                                {error && <div className="text-sm text-destructive">{error}</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MysqlPanel({ headers }: { headers: Record<string, string> }) {
    const [databases, setDatabases] = useState<string[]>([]);
    const [database, setDatabase] = useState("");
    const [tables, setTables] = useState<string[]>([]);
    const [table, setTable] = useState("");
    const [rows, setRows] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [limit, setLimit] = useState("20");
    const [offset, setOffset] = useState("0");
    const [sql, setSql] = useState("SELECT 1;");
    const [queryResult, setQueryResult] = useState<any>(null);
    const [confirmRequired, setConfirmRequired] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const loadDatabases = async () => {
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson("/api/mysql/databases", { headers });
            setDatabases(data.databases || []);
            if (data.databases?.length && !database) {
                setDatabase(data.databases[0]);
            }
        } catch (e: any) {
            setError(e.message || "读取数据库失败");
        } finally {
            setLoading(false);
        }
    };

    const loadTables = async (db: string) => {
        if (!db) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/mysql/tables?db=${encodeURIComponent(db)}`, { headers });
            setTables(data.tables || []);
            if (data.tables?.length) {
                setTable(data.tables[0]);
            } else {
                setTable("");
            }
        } catch (e: any) {
            setError(e.message || "读取表失败");
        } finally {
            setLoading(false);
        }
    };

    const loadRows = async () => {
        if (!database || !table) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchJson(`/api/mysql/rows?db=${encodeURIComponent(database)}&table=${encodeURIComponent(table)}&limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, { headers });
            setRows(data.rows || []);
            setTotal(data.total || 0);
        } catch (e: any) {
            setError(e.message || "读取行失败");
        } finally {
            setLoading(false);
        }
    };

    const runSql = async (confirmDangerous?: boolean) => {
        setLoading(true);
        setError("");
        setConfirmRequired(false);
        try {
            const data = await fetchJson("/api/mysql/query", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ sql, database, confirmDangerous })
            });
            setQueryResult(data);
        } catch (e: any) {
            if (e.message?.includes("requires confirmation") || e.message?.includes("requiresConfirmation")) {
                setConfirmRequired(true);
            } else {
                setError(e.message || "执行失败");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDatabases();
    }, []);

    useEffect(() => {
        if (database) {
            loadTables(database);
        }
    }, [database]);

    useEffect(() => {
        if (database && table) {
            loadRows();
        }
    }, [table]);

    const columns = useMemo(() => {
        if (!rows.length) return [];
        return Object.keys(rows[0]);
    }, [rows]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-[260px_1fr] gap-4">
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="border-b border-border/60 bg-background/70 px-4 py-3 text-sm font-semibold">MySQL</div>
                    <div className="p-3 space-y-4">
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Databases</div>
                            <div className="space-y-1">
                                {databases.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-muted-foreground">暂无数据库</div>
                                ) : (
                                    databases.map((dbName) => (
                                        <button
                                            key={dbName}
                                            type="button"
                                            onClick={() => setDatabase(dbName)}
                                            className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40 ${database === dbName ? "bg-muted/40 text-foreground" : "text-foreground/80"}`}
                                        >
                                            {dbName}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Tables</div>
                            <div className="space-y-1">
                                {tables.length === 0 ? (
                                    <div className="px-2 py-2 text-xs text-muted-foreground">暂无表</div>
                                ) : (
                                    tables.map((tb) => (
                                        <button
                                            key={tb}
                                            type="button"
                                            onClick={() => setTable(tb)}
                                            className={`w-full rounded-md px-2 py-2 text-left text-sm hover:bg-muted/40 ${table === tb ? "bg-muted/40 text-foreground" : "text-foreground/80"}`}
                                        >
                                            {tb}
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-border/60 bg-card/60 overflow-hidden">
                    <div className="flex items-center gap-3 border-b border-border/60 bg-background/70 px-4 py-3">
                        <div className="text-sm font-semibold text-foreground">SQL Console</div>
                        <div className="ml-auto text-xs text-muted-foreground">
                            {database || "未选择数据库"}
                            {table ? ` / ${table}` : ""}
                        </div>
                    </div>
                    <div className="border-b border-border/60 bg-background/60 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button variant="outline" disabled>Query</Button>
                            <Button variant="ghost" disabled>History</Button>
                            <Button variant="ghost" disabled>Explain</Button>
                            <div className="ml-auto flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <Label>Limit</Label>
                                    <Input value={limit} onChange={(e) => setLimit(e.target.value)} className="h-9 w-24" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label>Offset</Label>
                                    <Input value={offset} onChange={(e) => setOffset(e.target.value)} className="h-9 w-24" />
                                </div>
                                <Button onClick={loadRows} disabled={loading}>刷新</Button>
                            </div>
                        </div>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <Label>SQL 编辑器</Label>
                            <textarea value={sql} onChange={(e) => setSql(e.target.value)} className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono" />
                            <div className="flex gap-2">
                                <Button onClick={() => runSql(false)} disabled={loading}>执行</Button>
                                {confirmRequired && (
                                    <Button variant="destructive" onClick={() => runSql(true)} disabled={loading}>确认执行</Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="rounded-md border border-border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            {columns.length === 0 ? (
                                                <TableHead>Result</TableHead>
                                            ) : (
                                                columns.map((col) => (
                                                    <TableHead key={col}>{col}</TableHead>
                                                ))
                                            )}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={Math.max(columns.length, 1)} className="text-center text-muted-foreground">
                                                    {loading ? "加载中..." : "暂无数据"}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            rows.map((row, index) => (
                                                <TableRow key={index}>
                                                    {columns.map((col) => (
                                                        <TableCell key={col}>{String(row[col])}</TableCell>
                                                    ))}
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="text-xs text-muted-foreground">Total: {total}</div>
                        </div>
                        {queryResult && (
                            <pre className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-3 overflow-auto">
                                {JSON.stringify(queryResult, null, 2)}
                            </pre>
                        )}
                        {error && <div className="text-sm text-destructive">{error}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}
