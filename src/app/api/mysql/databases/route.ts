import { NextResponse } from "next/server";
import { getMysqlConfigFromHeaders, withMysqlConnection } from "@/lib/mysql";

export async function GET(req: Request) {
    try {
        const config = getMysqlConfigFromHeaders(req);
        const data = await withMysqlConnection(config, async (conn) => {
            const [rows] = await conn.query("SHOW DATABASES");
            const databases = Array.isArray(rows) ? rows.map((row: any) => row.Database) : [];
            return databases;
        });
        return NextResponse.json({ databases: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to list databases" }, { status: 500 });
    }
}
