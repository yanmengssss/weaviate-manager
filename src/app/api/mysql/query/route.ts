import { NextResponse } from "next/server";
import { getMysqlConfigFromHeaders, withMysqlConnection } from "@/lib/mysql";

const isDangerousSql = (sql: string) => {
    const normalized = sql.trim().toLowerCase();
    if (/drop\s+table|truncate\s+table|drop\s+database/.test(normalized)) {
        return true;
    }
    if (/delete\s+from\s+\S+/.test(normalized) && !/\swhere\s/.test(normalized)) {
        return true;
    }
    if (/update\s+\S+/.test(normalized) && !/\swhere\s/.test(normalized)) {
        return true;
    }
    return false;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { sql, database, confirmDangerous } = body || {};
        if (!sql) {
            return NextResponse.json({ error: "Missing sql" }, { status: 400 });
        }

        if (isDangerousSql(sql) && !confirmDangerous) {
            return NextResponse.json({ error: "Dangerous operation requires confirmation", requiresConfirmation: true }, { status: 400 });
        }

        const config = getMysqlConfigFromHeaders(req);
        const data = await withMysqlConnection(config, async (conn) => {
            if (database) {
                await conn.query(`USE \`${database}\``);
            }
            const [result, fields] = await conn.query(sql);
            if (Array.isArray(result)) {
                return { rows: result, fields };
            }
            return { result };
        });

        return NextResponse.json({ success: true, ...data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to execute query" }, { status: 500 });
    }
}
