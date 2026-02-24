import mysql, { ConnectionOptions } from "mysql2/promise";

type MysqlConfig = ConnectionOptions;

const getHeader = (req: Request, key: string) => req.headers.get(key) || undefined;

export function getMysqlConfigFromHeaders(req: Request): MysqlConfig {
    const host = getHeader(req, "x-mysql-host");
    const port = getHeader(req, "x-mysql-port");
    const user = getHeader(req, "x-mysql-user");
    const password = getHeader(req, "x-mysql-password");
    const database = getHeader(req, "x-mysql-database");

    if (!host || !user) {
        throw new Error("Missing mysql connection info");
    }

    return {
        host,
        port: port ? Number(port) : 3306,
        user,
        password: password || undefined,
        database: database || undefined,
    };
}

export function getMysqlConfigFromBody(body: any): MysqlConfig {
    const { host, port, user, password, database } = body || {};
    if (!host || !user) {
        throw new Error("Missing mysql connection info");
    }
    return {
        host,
        port: port ? Number(port) : 3306,
        user,
        password: password || undefined,
        database: database || undefined,
    };
}

export async function withMysqlConnection<T>(config: MysqlConfig, fn: (conn: mysql.Connection) => Promise<T>) {
    const conn = await mysql.createConnection(config);
    try {
        return await fn(conn);
    } finally {
        await conn.end();
    }
}
