"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Key, Server } from "lucide-react";

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

export default function ConnectionPage() {
  const router = useRouter();
  const [dataSource, setDataSource] = useState<"redis" | "mongodb" | "mysql" | "weaviate">("weaviate");
  const [protocol, setProtocol] = useState<"http" | "https">("http");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("8080");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [useTls, setUseTls] = useState(false);
  const [useOidc, setUseOidc] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [autoConnecting, setAutoConnecting] = useState(true);
  const dataSourceOptions = [
    { id: "redis", label: "Redis" },
    { id: "mongodb", label: "MongoDB" },
    { id: "mysql", label: "MySQL" },
    { id: "weaviate", label: "Weaviate" }
  ] as const;
  const defaultPorts: Record<typeof dataSource, string> = {
    redis: "6379",
    mongodb: "27017",
    mysql: "3306",
    weaviate: "8080"
  };

  // Auto-connect from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("weaviateConfig");
    if (!stored) {
      setAutoConnecting(false);
      return;
    }

    try {
      const config = JSON.parse(stored) as StoredConfig;
      // Pre-fill form fields
      if (config.type) {
        setDataSource(config.type);
        // @ts-ignore
        setPort(defaultPorts[config.type] || "8080");
      }
      if (config.url) {
        try {
          const u = new URL(config.url);
          setProtocol(u.protocol === "https:" ? "https" : "http");
          setHost(u.hostname);
          if (u.port) setPort(u.port);
        } catch {
          setHost(config.url);
        }
      }
      if (config.host) setHost(config.host);
      if (config.port) setPort(config.port);
      if (config.protocol) setProtocol(config.protocol);
      if (typeof config.useTls === "boolean") setUseTls(config.useTls);
      if (config.username) setUsername(config.username);
      setApiKey(config.apiKey || "");

      // Attempt auto-connect
      const connect = async () => {
        if (config.type === "weaviate") {
          const res = await fetch("/api/weaviate/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: config.url, apiKey: config.apiKey })
          });
          return res.json();
        }
        if (config.type === "redis") {
          const res = await fetch("/api/redis/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: config.host,
              port: config.port,
              tls: config.useTls,
              password: config.apiKey
            })
          });
          return res.json();
        }
        if (config.type === "mongodb") {
          const res = await fetch("/api/mongodb/connect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              host: config.host,
              port: config.port,
              username: config.username,
              password: config.apiKey,
              tls: config.useTls
            })
          });
          return res.json();
        }
        const res = await fetch("/api/mysql/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.apiKey
          })
        });
        return res.json();
      };

      connect()
        .then(data => {
          if (data.success) {
            router.push("/dashboard");
          } else {
            setAutoConnecting(false);
          }
        })
        .catch(() => setAutoConnecting(false));
    } catch {
      setAutoConnecting(false);
    }
  }, [router]);

  const buildFinalUrl = () => {
    const trimmedHost = host.trim();
    if (!trimmedHost) {
      throw new Error("请填写 Host");
    }
    const portValue = port.trim();
    if (portValue) {
      const n = Number(portValue);
      if (!Number.isInteger(n) || n < 1 || n > 65535) {
        throw new Error("Port 必须是 1-65535 的数字");
      }
    }
    const base = /^https?:\/\//i.test(trimmedHost)
      ? trimmedHost
      : `${protocol}://${trimmedHost}`;
    const urlObj = new URL(base);
    if (portValue) {
      urlObj.port = portValue;
    }
    return urlObj.toString();
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatus(null);
    setIsLoading(true);

    try {
      let res: Response;
      if (dataSource === "weaviate") {
        const finalUrl = buildFinalUrl();
        res = await fetch("/api/weaviate/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: finalUrl, apiKey, port: new URL(finalUrl).port || undefined })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to connect to Weaviate instance");
        }
        localStorage.setItem("weaviateConfig", JSON.stringify({ url: finalUrl, apiKey, type: dataSource }));
        router.push("/dashboard");
        return;
      }
      if (dataSource === "redis") {
        res = await fetch("/api/redis/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, tls: useTls, password: apiKey })
        });
      } else if (dataSource === "mongodb") {
        res = await fetch("/api/mongodb/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, username, password: apiKey, tls: useTls })
        });
      } else {
        res = await fetch("/api/mysql/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, user: username, password: apiKey })
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "连接失败，请检查配置");
      }

      localStorage.setItem("weaviateConfig", JSON.stringify({
        type: dataSource,
        host,
        port,
        protocol,
        username,
        apiKey,
        useTls
      }));
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "连接失败，请检查配置");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setError("");
    setStatus(null);
    setIsLoading(true);
    try {
      let res: Response;
      if (dataSource === "weaviate") {
        const finalUrl = buildFinalUrl();
        res = await fetch("/api/weaviate/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: finalUrl, apiKey, port: new URL(finalUrl).port || undefined })
        });
      } else if (dataSource === "redis") {
        res = await fetch("/api/redis/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, tls: useTls, password: apiKey })
        });
      } else if (dataSource === "mongodb") {
        res = await fetch("/api/mongodb/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, username, password: apiKey, tls: useTls })
        });
      } else {
        res = await fetch("/api/mysql/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ host, port, user: username, password: apiKey })
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "连接测试失败");
      }
      setStatus({ type: "success", message: "连接测试通过" });
    } catch (err: any) {
      setStatus({ type: "error", message: err.message || "连接测试失败" });
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading screen during auto-connect
  if (autoConnecting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-500">
          <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center text-primary shadow-sm">
            <Database className="w-8 h-8" />
          </div>
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground font-medium">Reconnecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/5 blur-[100px] pointer-events-none" />

      <Card className="w-full max-w-[560px] shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
        <CardHeader className="space-y-2 text-center pb-6 pt-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-sm">
            <Database className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Data Manager
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            统一连接与管理 Redis / MongoDB / MySQL / Weaviate
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleConnect}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">数据源类型</Label>
              <div className="grid grid-cols-2 gap-2">
                {dataSourceOptions.map((option) => {
                  const isActive = dataSource === option.id;
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={isActive ? "default" : "outline"}
                      className={`h-11 justify-start ${isActive ? "" : "text-muted-foreground"}`}
                      onClick={() => {
                        setDataSource(option.id);
                        setPort(defaultPorts[option.id]);
                        setStatus(null);
                        setError("");
                      }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="host" className="text-sm font-semibold">
                Host
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                    <Server className="w-4 h-4" />
                  </div>
                  <Input
                    id="host"
                    placeholder="127.0.0.1 或 https://your-endpoint"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    className="pl-10 h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={protocol === "http" ? "secondary" : "outline"}
                    className="h-12 px-3"
                    onClick={() => setProtocol("http")}
                  >
                    http
                  </Button>
                  <Button
                    type="button"
                    variant={protocol === "https" ? "secondary" : "outline"}
                    className="h-12 px-3"
                    onClick={() => setProtocol("https")}
                  >
                    https
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                支持直接输入完整 URL；未填写协议时将使用所选协议
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="port" className="text-sm font-semibold">
                  Port
                </Label>
                <Input
                  id="port"
                  placeholder={defaultPorts[dataSource]}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={65535}
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  className="h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold">
                  用户名
                </Label>
                <Input
                  id="username"
                  placeholder="可选"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-semibold flex justify-between">
                <span>Auth / API Key</span>
                <span className="text-xs font-normal text-muted-foreground">可选</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Key className="w-4 h-4" />
                </div>
                <Input
                  id="apiKey"
                  placeholder="**********************"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="pl-10 h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={useTls} onCheckedChange={(value) => setUseTls(Boolean(value))} />
                SSL/TLS
              </label>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox checked={useOidc} onCheckedChange={(value) => setUseOidc(Boolean(value))} />
                使用 OIDC (Weaviate)
              </label>
            </div>

            {status && (
              <div
                className={`p-3 text-sm rounded-lg border text-center animate-in fade-in slide-in-from-top-1 ${
                  status.type === "success"
                    ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
                    : "text-destructive bg-destructive/10 border-destructive/20"
                }`}
              >
                {status.message}
              </div>
            )}
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-8 mt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                type="submit"
                className="h-12 text-base font-semibold shadow-md active:scale-[0.98] transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    连接中...
                  </span>
                ) : (
                  "连接"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 text-base font-semibold"
                onClick={handleTest}
                disabled={isLoading}
              >
                测试
              </Button>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              凭证仅用于会话连接，敏感信息不会展示为明文
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
