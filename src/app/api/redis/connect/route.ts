import { NextResponse } from "next/server";
import { getRedisConfigFromBody, withRedisClient } from "@/lib/redis";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const config = getRedisConfigFromBody(body);
        const pong = await withRedisClient(config, (client) => client.ping());
        return NextResponse.json({ success: pong === "PONG" });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || "Failed to connect to Redis" }, { status: 500 });
    }
}
