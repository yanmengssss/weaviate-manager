import { MongoClient } from "mongodb";

type MongoConfig = {
    uri: string;
};

const getHeader = (req: Request, key: string) => req.headers.get(key) || undefined;

const parseBoolean = (value?: string) => value === "true" || value === "1";

export function getMongoConfigFromHeaders(req: Request): MongoConfig {
    const uri = getHeader(req, "x-mongo-uri");
    if (uri) {
        return { uri };
    }

    const host = getHeader(req, "x-mongo-host");
    const port = getHeader(req, "x-mongo-port") || "27017";
    const username = getHeader(req, "x-mongo-username");
    const password = getHeader(req, "x-mongo-password");
    const authDb = getHeader(req, "x-mongo-auth-db") || "admin";
    const tls = parseBoolean(getHeader(req, "x-mongo-tls"));

    if (!host) {
        throw new Error("Missing mongo connection info");
    }

    const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || "")}@` : "";
    const query = tls ? `?tls=true&authSource=${encodeURIComponent(authDb)}` : `?authSource=${encodeURIComponent(authDb)}`;
    return { uri: `mongodb://${authPart}${host}:${port}/${query}` };
}

export function getMongoConfigFromBody(body: any): MongoConfig {
    const { uri, host, port, username, password, authDb, tls } = body || {};
    if (uri) {
        return { uri };
    }
    if (!host) {
        throw new Error("Missing mongo connection info");
    }
    const authPart = username ? `${encodeURIComponent(username)}:${encodeURIComponent(password || "")}@` : "";
    const query = tls ? `?tls=true&authSource=${encodeURIComponent(authDb || "admin")}` : `?authSource=${encodeURIComponent(authDb || "admin")}`;
    return { uri: `mongodb://${authPart}${host}:${port || "27017"}/${query}` };
}

export async function withMongoClient<T>(config: MongoConfig, fn: (client: MongoClient) => Promise<T>) {
    const client = new MongoClient(config.uri);
    await client.connect();
    try {
        return await fn(client);
    } finally {
        await client.close();
    }
}
