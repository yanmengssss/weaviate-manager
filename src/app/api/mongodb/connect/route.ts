import { NextResponse } from "next/server";
import { getMongoConfigFromBody, withMongoClient } from "@/lib/mongodb";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = getMongoConfigFromBody(body);
        const ok = await withMongoClient(config, async (client) => {
            const result = await client.db("admin").command({ ping: 1 });
            return result.ok === 1;
        });
        return NextResponse.json({ success: ok });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || "Failed to connect to MongoDB" }, { status: 500 });
    }
}
