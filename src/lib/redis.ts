import { createClient, RedisClientType } from "redis";

type RedisConfig = {
    url: string;
    password?: string;
};

const getHeader = (req: Request, key: string) => req.headers.get(key) || undefined;

const parseBoolean = (value?: string) => value === "true" || value === "1";

export function getRedisConfigFromHeaders(req: Request): RedisConfig {
    const url = getHeader(req, "x-redis-url");
    const host = getHeader(req, "x-redis-host");
    const port = getHeader(req, "x-redis-port") || "6379";
    const tls = parseBoolean(getHeader(req, "x-redis-tls"));
    const password = getHeader(req, "x-redis-password") || undefined;

    if (!url && !host) {
        throw new Error("Missing redis connection info");
    }

    const finalUrl = url || `${tls ? "rediss" : "redis"}://${host}:${port}`;
    return { url: finalUrl, password };
}

export function getRedisConfigFromBody(body: any): RedisConfig {
    const { url, host, port, tls, password } = body || {};
    const finalUrl = url || `${tls ? "rediss" : "redis"}://${host}:${port || "6379"}`;
    if (!finalUrl || finalUrl.includes("undefined")) {
        throw new Error("Missing redis connection info");
    }
    return { url: finalUrl, password };
}

export async function withRedisClient<T>(config: RedisConfig, fn: (client: RedisClientType) => Promise<T>) {
    const client = createClient({ url: config.url, password: config.password });
    await client.connect();
    try {
        return await fn(client);
    } finally {
        try {
            await client.quit();
        } catch {
            try {
                await client.disconnect();
            } catch {
                return;
            }
        }
    }
}
