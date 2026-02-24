import { NextResponse } from "next/server";
import { getMysqlConfigFromHeaders, withMysqlConnection } from "@/lib/mysql";

const isValidIdentifier = (value: string) => /^[A-Za-z0-9_]+$/.test(value);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const db = searchParams.get("db");
        if (!db) {
            return NextResponse.json({ error: "Missing db" }, { status: 400 });
        }
        if (!isValidIdentifier(db)) {
            return NextResponse.json({ error: "Invalid db name" }, { status: 400 });
        }
        const config = getMysqlConfigFromHeaders(req);
        const data = await withMysqlConnection(config, async (conn) => {
            const [rows] = await conn.query(`SHOW TABLES FROM \`${db}\``);
            const tables = Array.isArray(rows)
                ? rows.map((row: any) => row[`Tables_in_${db}`])
                : [];
            return tables;
        });
        return NextResponse.json({ tables: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to list tables" }, { status: 500 });
    }
}
