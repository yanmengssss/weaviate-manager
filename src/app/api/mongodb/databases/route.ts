import { NextResponse } from "next/server";
import { getMongoConfigFromHeaders, withMongoClient } from "@/lib/mongodb";

export async function GET(req: Request) {
    try {
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const result = await client.db().admin().listDatabases();
            return result.databases.map((db) => ({
                name: db.name,
                sizeOnDisk: db.sizeOnDisk,
                empty: db.empty
            }));
        });
        return NextResponse.json({ databases: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to list databases" }, { status: 500 });
    }
}
