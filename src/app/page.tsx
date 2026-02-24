"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Key, Server } from "lucide-react";

export default function ConnectionPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [port, setPort] = useState("8080");
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoConnecting, setAutoConnecting] = useState(true);

  // Auto-connect from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("weaviateConfig");
    if (!stored) {
      setAutoConnecting(false);
      return;
    }

    try {
      const config = JSON.parse(stored);
      // Pre-fill form fields
      setUrl(config.url || "");
      setApiKey(config.apiKey || "");
      try {
        const u = new URL(config.url || "");
        if (u.port) setPort(u.port);
      } catch {}

      // Attempt auto-connect
      fetch("/api/weaviate/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: config.url, apiKey: config.apiKey })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            router.push("/dashboard");
          } else {
            // Connection failed, stay on page — user can manually reconnect
            setAutoConnecting(false);
          }
        })
        .catch(() => {
          setAutoConnecting(false);
        });
    } catch {
      setAutoConnecting(false);
    }
  }, [router]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Basic URL validation
      const urlObj = new URL(url);
      if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
        throw new Error("URL must start with http:// or https://");
      }

      // Validate and merge port if provided
      let finalUrl = url;
      const trimmedPort = port.trim();
      if (!urlObj.port && trimmedPort) {
        const n = Number(trimmedPort);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          throw new Error("Port must be a number between 1 and 65535");
        }
        urlObj.port = String(n);
        finalUrl = urlObj.toString();
      } else if (urlObj.port) {
        finalUrl = urlObj.toString();
      }

      // Extract url and apiKey from state
      const res = await fetch("/api/weaviate/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl, apiKey, port: urlObj.port || trimmedPort || undefined })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to connect to Weaviate instance");
      }

      // Save credentials since connection was successful
      localStorage.setItem("weaviateConfig", JSON.stringify({ url: finalUrl, apiKey }));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid connection configuration. Please check your URL and API Key.");
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

      <Card className="w-full max-w-[420px] shadow-xl border-border/50 backdrop-blur-sm bg-card/90">
        <CardHeader className="space-y-2 text-center pb-8 pt-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 text-primary shadow-sm">
            <Database className="w-8 h-8" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-foreground">
            Weaviate Manager
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Connect to your remote database instance
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleConnect}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-semibold">
                Instance URL
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
                  <Server className="w-4 h-4" />
                </div>
                <Input
                  id="url"
                  placeholder="https://your-weaviate-instance.app"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="pl-10 h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="port" className="text-sm font-semibold">
                Port
              </Label>
              <Input
                id="port"
                placeholder="8080"
                type="number"
                inputMode="numeric"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="h-12 border-muted placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">
                默认 8080；若 URL 已包含端口将优先生效
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey" className="text-sm font-semibold flex justify-between">
                <span>API Key</span>
                <span className="text-xs font-normal text-muted-foreground">(Optional for auth)</span>
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

            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 text-center animate-in fade-in slide-in-from-top-1">
                {error}
              </div>
            )}
          </CardContent>
          <CardFooter className="pb-8 mt-[20px]">
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold shadow-md active:scale-[0.98] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Connecting...
                </span>
              ) : (
                "Connect to Instance"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
