import { NextResponse } from "next/server";
import { getRedisConfigFromHeaders, withRedisClient } from "@/lib/redis";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get("key");
        if (!key) {
            return NextResponse.json({ error: "Missing key" }, { status: 400 });
        }

        const config = getRedisConfigFromHeaders(req);
        const data = await withRedisClient(config, async (client) => {
            const type = await client.type(key);
            if (type === "none") {
                return { key, type: "none", value: null };
            }
            if (type === "string") {
                const value = await client.get(key);
                return { key, type, value };
            }
            if (type === "hash") {
                const value = await client.hGetAll(key);
                return { key, type, value };
            }
            if (type === "list") {
                const value = await client.lRange(key, 0, -1);
                return { key, type, value };
            }
            if (type === "set") {
                const value = await client.sMembers(key);
                return { key, type, value };
            }
            if (type === "zset") {
                const value = await client.zRangeWithScores(key, 0, -1);
                return { key, type, value };
            }
            return { key, type, value: null };
        });

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch key" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { key, type, value, ttl, replace } = body || {};
        if (!key || !type) {
            return NextResponse.json({ error: "Missing key or type" }, { status: 400 });
        }

        const config = getRedisConfigFromHeaders(req);
        const result = await withRedisClient(config, async (client) => {
            if (replace !== false) {
                await client.del(key);
            }
            if (type === "string") {
                await client.set(key, String(value ?? ""));
            } else if (type === "hash") {
                await client.hSet(key, value || {});
            } else if (type === "list") {
                const items = Array.isArray(value) ? value : [value];
                if (items.length) {
                    await client.rPush(key, items.map((item) => String(item)));
                } else {
                    await client.rPush(key, "");
                }
            } else if (type === "set") {
                const items = Array.isArray(value) ? value : [value];
                if (items.length) {
                    await client.sAdd(key, items.map((item) => String(item)));
                }
            } else if (type === "zset") {
                const items = Array.isArray(value) ? value : [];
                if (items.length) {
                    await client.zAdd(key, items.map((item: any) => ({
                        score: Number(item.score ?? 0),
                        value: String(item.value ?? "")
                    })));
                }
            } else {
                throw new Error("Unsupported type");
            }

            if (typeof ttl === "number") {
                await client.expire(key, ttl);
            }
            return { success: true };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to set key" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const key = searchParams.get("key");
        if (!key) {
            return NextResponse.json({ error: "Missing key" }, { status: 400 });
        }

        const config = getRedisConfigFromHeaders(req);
        const result = await withRedisClient(config, async (client) => {
            const count = await client.del(key);
            return { success: true, deleted: count };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete key" }, { status: 500 });
    }
}
