"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Database, LogOut, Search, Layers, Settings, FileText, ShoppingBag, Users, PlusCircle } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [config, setConfig] = useState<{ url: string; apiKey?: string } | null>(null);
    const [classes, setClasses] = useState<{ class: string, count: number }[]>([]);

    useEffect(() => {
        const storedConfig = localStorage.getItem("weaviateConfig");
        if (!storedConfig) {
            router.push("/");
            return;
        }
        try {
            const parsedConfig = JSON.parse(storedConfig);
            setConfig(parsedConfig);

            // Fetch Schema Classes
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
                .catch(console.error);

        } catch (e) {
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
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card flex flex-col items-stretch shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-border bg-card/50">
                    <Database className="w-6 h-6 text-primary mr-3" />
                    <span className="font-bold text-lg text-foreground tracking-tight">Weaviate</span>
                </div>

                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6">
                    <div className="space-y-1">
                        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Class List
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

                    <div className="mt-auto pt-4 border-t border-border">
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                            <PlusCircle className="w-4 h-4" />
                            New Class
                        </Button>
                        <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2">
                            <Settings className="w-4 h-4" />
                            Database Settings
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content wrapper */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top Header */}
                <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground truncate max-w-xl">
                        <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="font-medium text-foreground truncate ">{config?.url}</span>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <LogOut className="w-4 h-4 mr-2" />
                        Disconnect
                    </Button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-background p-6">
                    <div className="mx-auto max-w-6xl">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
