import { NextResponse } from "next/server";
import { getMongoConfigFromHeaders, withMongoClient } from "@/lib/mongodb";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dbName = searchParams.get("db");
        if (!dbName) {
            return NextResponse.json({ error: "Missing db" }, { status: 400 });
        }
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const collections = await client.db(dbName).listCollections().toArray();
            return collections.map((col) => ({
                name: col.name,
                type: col.type
            }));
        });
        return NextResponse.json({ collections: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to list collections" }, { status: 500 });
    }
}
