import { NextResponse } from "next/server";
import { getWeaviateClient } from "@/lib/weaviate";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { url, apiKey } = body;

        if (!url) {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        const client = await getWeaviateClient(url, apiKey);

        // Check if the client is ready
        const isReady = await client.isReady();

        if (isReady) {
            return NextResponse.json({ success: true, message: "Connected successfully" });
        } else {
            return NextResponse.json({ success: false, error: "Connection failed: Weaviate instance is not ready." }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Connection error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to connect to Weaviate" }, { status: 500 });
    }
}
