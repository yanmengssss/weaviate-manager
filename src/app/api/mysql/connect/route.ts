import { NextResponse } from "next/server";
import { getMysqlConfigFromBody, withMysqlConnection } from "@/lib/mysql";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = getMysqlConfigFromBody(body);
        const ok = await withMysqlConnection(config, async (conn) => {
            const [rows] = await conn.query("SELECT 1 as ok");
            return Array.isArray(rows);
        });
        return NextResponse.json({ success: ok });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || "Failed to connect to MySQL" }, { status: 500 });
    }
}
