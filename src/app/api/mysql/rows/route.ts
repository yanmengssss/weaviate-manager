import { NextResponse } from "next/server";
import { getMysqlConfigFromHeaders, withMysqlConnection } from "@/lib/mysql";

const isValidIdentifier = (value: string) => /^[A-Za-z0-9_]+$/.test(value);

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const db = searchParams.get("db");
        const table = searchParams.get("table");
        const limit = Number(searchParams.get("limit") || "20");
        const offset = Number(searchParams.get("offset") || "0");

        if (!db || !table) {
            return NextResponse.json({ error: "Missing db or table" }, { status: 400 });
        }
        if (!isValidIdentifier(db) || !isValidIdentifier(table)) {
            return NextResponse.json({ error: "Invalid db or table" }, { status: 400 });
        }

        const config = getMysqlConfigFromHeaders(req);
        const data = await withMysqlConnection(config, async (conn) => {
            const [rows] = await conn.query(`SELECT * FROM \`${db}\`.\`${table}\` LIMIT ? OFFSET ?`, [limit, offset]);
            const [countRows] = await conn.query(`SELECT COUNT(*) as total FROM \`${db}\`.\`${table}\``);
            const total = Array.isArray(countRows) && countRows.length ? countRows[0].total : 0;
            return { rows, total };
        });

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch rows" }, { status: 500 });
    }
}
