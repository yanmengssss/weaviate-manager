"use client";

import { useEffect, useMemo, useState } from "react";
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

    const headers = useMemo(() => {
        if (!config) return {};
        if (config.type === "redis") {
            return {
                "x-redis-host": config.host || "",
                "x-redis-port": config.port || "",
                "x-redis-password": config.apiKey || "",
                "x-redis-tls": config.useTls ? "true" : "false"
            };
        }
        if (config.type === "mongodb") {
            return {
                "x-mongo-host": config.host || "",
                "x-mongo-port": config.port || "",
                "x-mongo-username": config.username || "",
                "x-mongo-password": config.apiKey || "",
                "x-mongo-tls": config.useTls ? "true" : "false"
            };
        }
        if (config.type === "mysql") {
            return {
                "x-mysql-host": config.host || "",
                "x-mysql-port": config.port || "",
                "x-mysql-user": config.username || "",
                "x-mysql-password": config.apiKey || ""
            };
        }
        return {
            "x-weaviate-url": config.url || "",
            ...(config.apiKey ? { "x-weaviate-api-key": config.apiKey } : {})
        };
    }, [config]);

    useEffect(() => {
        const stored = localStorage.getItem("weaviateConfig");
        if (!stored) {
            setLoadError("未检测到连接信息，请返回重新连接");
            return;
        }
        try {
            const parsed = JSON.parse(stored) as StoredConfig;
            setConfig(parsed);
        } catch {
            setLoadError("连接信息解析失败，请返回重新连接");
        }
    }, []);

    if (loadError) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                {loadError}
            </div>
        );
    }

    if (!config) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground">
                加载中...
            </div>
        );
    }

    if (config.type === "weaviate") {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center py-16 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-primary/5 p-6 rounded-full mb-6 ring-8 ring-primary/5">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-primary opacity-80"
                    >
                        <ellipse cx="12" cy="5" rx="9" ry="3" />
                        <path d="M3 5V19A9 3 0 0 0 21 19V5" />
                        <path d="M3 12A9 3 0 0 0 21 12" />
                    </svg>
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">
                    已连接数据源
                </h2>
                <p className="text-muted-foreground max-w-2xl text-lg mb-8">
                    在左侧选择 Weaviate Class 进行对象管理
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
                    {[
                        { title: "Weaviate 类管理", desc: "查看 Class、对象数量与结构" },
                        { title: "对象 CRUD", desc: "新增、编辑、删除对象并支持搜索" },
                        { title: "分页浏览", desc: "支持分页、批量选择与删除" }
                    ].map((item) => (
                        <div
                            key={item.title}
                            className="border border-border rounded-lg px-4 py-4 bg-card/40 text-left"
                        >
                            <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                            <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </div>
                    ))}
                </div>
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
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 space-y-3">
                    <div className="flex gap-2">
                        <Input value={pattern} onChange={(e) => setPattern(e.target.value)} placeholder="Key pattern" />
                        <Button onClick={() => loadKeys()} disabled={loading}>扫描</Button>
                    </div>
                    <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Key</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>TTL</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {keys.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                                            {loading ? "加载中..." : "暂无 Key"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    keys.map((item) => (
                                        <TableRow key={item.key} className="cursor-pointer" onClick={() => loadKeyDetail(item.key)}>
                                            <TableCell className="truncate max-w-[260px]">{item.key}</TableCell>
                                            <TableCell>{item.type}</TableCell>
                                            <TableCell>{item.ttl}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => loadKeys(cursor)} disabled={loading || cursor === "0"}>下一页</Button>
                        <span className="text-xs text-muted-foreground">Cursor: {cursor}</span>
                    </div>
                </div>
                <div className="flex-1 space-y-3">
                    <div className="space-y-2">
                        <Label>Key</Label>
                        <Input value={selectedKey || ""} onChange={(e) => setSelectedKey(e.target.value)} placeholder="例如 user:1" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
                                {["string", "hash", "list", "set", "zset"].map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>TTL</Label>
                            <Input value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="秒" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Value</Label>
                        <textarea
                            value={valueText}
                            onChange={(e) => setValueText(e.target.value)}
                            className="min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={saveKey} disabled={loading}>保存</Button>
                        <Button variant="destructive" onClick={deleteKey} disabled={loading || !selectedKey}>删除</Button>
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
    }, [collection]);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Database</Label>
                            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={db} onChange={(e) => setDb(e.target.value)}>
                                {databases.map((item) => (
                                    <option key={item.name} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Collection</Label>
                            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={collection} onChange={(e) => setCollection(e.target.value)}>
                                {collections.map((item) => (
                                    <option key={item.name} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Filter</Label>
                            <Input value={filterJson} onChange={(e) => setFilterJson(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Limit</Label>
                            <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Skip</Label>
                            <Input value={skip} onChange={(e) => setSkip(e.target.value)} />
                        </div>
                    </div>
                    <Button onClick={loadDocuments} disabled={loading}>刷新</Button>
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
                                    documents.map((doc, index) => (
                                        <TableRow key={doc._id ? String(doc._id) : index}>
                                            <TableCell className="truncate">{doc._id ? String(doc._id) : "-"}</TableCell>
                                            <TableCell>
                                                <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{JSON.stringify(doc, null, 2)}</pre>
                                            </TableCell>
                                        </TableRow>
                                    ))
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label>Database</Label>
                            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={database} onChange={(e) => setDatabase(e.target.value)}>
                                {databases.map((db) => (
                                    <option key={db} value={db}>{db}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Table</Label>
                            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={table} onChange={(e) => setTable(e.target.value)}>
                                {tables.map((tb) => (
                                    <option key={tb} value={tb}>{tb}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label>Limit</Label>
                            <Input value={limit} onChange={(e) => setLimit(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Offset</Label>
                            <Input value={offset} onChange={(e) => setOffset(e.target.value)} />
                        </div>
                        <div className="flex items-end">
                            <Button onClick={loadRows} disabled={loading}>刷新</Button>
                        </div>
                    </div>
                    <div className="rounded-md border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {columns.map((col) => (
                                        <TableHead key={col}>{col}</TableHead>
                                    ))}
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
                <div className="space-y-3">
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
                    {queryResult && (
                        <pre className="text-xs text-muted-foreground bg-muted/30 border border-border rounded-md p-3 overflow-auto">
                            {JSON.stringify(queryResult, null, 2)}
                        </pre>
                    )}
                    {error && <div className="text-sm text-destructive">{error}</div>}
                </div>
            </div>
        </div>
    );
}
