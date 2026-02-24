import { NextResponse } from "next/server";
import { getWeaviateClient } from "@/lib/weaviate";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { url, apiKey, port } = body;

        if (!url) {
            return NextResponse.json({ success: false, error: "URL is required" }, { status: 400 });
        }

        let finalUrl = url;
        try {
            const urlObj = new URL(url);
            if (!urlObj.port) {
                if (port && /^[0-9]{1,5}$/.test(String(port))) {
                    urlObj.port = String(port);
                } else if (urlObj.protocol === "http:") {
                    urlObj.port = "8080";
                }
            }
            finalUrl = urlObj.toString();
        } catch {
            // keep original url if parsing fails; client init will surface error
        }

        const client = await getWeaviateClient(finalUrl, apiKey);

        // Check if the client is ready
        const isReady = await client.isReady();

        if (isReady) {
            return NextResponse.json({ success: true, message: "Connected successfully", url: finalUrl });
        } else {
            return NextResponse.json({ success: false, error: "Connection failed: Weaviate instance is not ready." }, { status: 400 });
        }

    } catch (error: any) {
        console.error("Connection error:", error);
        return NextResponse.json({ success: false, error: error.message || "Failed to connect to Weaviate" }, { status: 500 });
    }
}
