import { NextResponse } from "next/server";
import { getWeaviateClient } from "@/lib/weaviate";

// Helper to extract credentials
function getCredentials(req: Request) {
    const url = req.headers.get("x-weaviate-url");
    const apiKey = req.headers.get("x-weaviate-api-key") || undefined;
    if (!url) return { error: "Missing x-weaviate-url header" };
    return { url, apiKey };
}

export async function GET(req: Request) {
    try {
        const credentials = getCredentials(req);
        if ("error" in credentials) {
            return NextResponse.json({ error: credentials.error }, { status: 400 });
        }
        const { url, apiKey } = credentials;
        const { searchParams } = new URL(req.url);
        const className = searchParams.get("class");
        const limitStr = searchParams.get("limit") || "20";
        const offsetStr = searchParams.get("offset") || "0";
        const query = searchParams.get("query") || "";

        if (!className) return NextResponse.json({ error: "Missing class parameter" }, { status: 400 });

        const client = await getWeaviateClient(url, apiKey);
        const collection = client.collections.get(className);

        // Get total count for pagination
        let totalCount = 0;
        try {
            const agg = await collection.aggregate.overAll();
            totalCount = agg.totalCount || 0;
        } catch {
            // fallback: count unknown
        }

        let result;
        if (query) {
            // BM25 Search
            result = await collection.query.bm25(query, {
                limit: parseInt(limitStr),
            });
        } else {
            // Standard fetch
            result = await collection.query.fetchObjects({
                limit: parseInt(limitStr),
                offset: parseInt(offsetStr),
            });
        }

        const objects = result.objects.map(obj => ({
            id: obj.uuid,
            ...obj.properties,
        }));

        return NextResponse.json({ objects, totalCount });
    } catch (error: any) {
        console.error("Fetch objects error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch objects" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const credentials = getCredentials(req);
        if ("error" in credentials) {
            return NextResponse.json({ error: credentials.error }, { status: 400 });
        }
        const { url, apiKey } = credentials;
        const body = await req.json();
        const { class: className, properties } = body;

        if (!className || !properties) return NextResponse.json({ error: "Missing class or properties" }, { status: 400 });

        const client = await getWeaviateClient(url, apiKey);
        const collection = client.collections.get(className);

        const result = await collection.data.insert(properties);

        return NextResponse.json({ success: true, id: result });
    } catch (error: any) {
        console.error("Insert object error:", error);
        return NextResponse.json({ error: error.message || "Failed to insert object" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const credentials = getCredentials(req);
        if ("error" in credentials) {
            return NextResponse.json({ error: credentials.error }, { status: 400 });
        }
        const { url, apiKey } = credentials;
        const body = await req.json();
        const { class: className, id, properties } = body;

        if (!className || !id || !properties) return NextResponse.json({ error: "Missing class, id, or properties" }, { status: 400 });

        const client = await getWeaviateClient(url, apiKey);
        const collection = client.collections.get(className);

        // Update object properties
        await collection.data.update({
            id: id,
            properties: properties
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update object error:", error);
        return NextResponse.json({ error: error.message || "Failed to update object" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const credentials = getCredentials(req);
        if ("error" in credentials) {
            return NextResponse.json({ error: credentials.error }, { status: 400 });
        }
        const { url, apiKey } = credentials;
        const { searchParams } = new URL(req.url);
        const className = searchParams.get("class");
        const id = searchParams.get("id");

        if (!className) return NextResponse.json({ error: "Missing class parameter" }, { status: 400 });

        const client = await getWeaviateClient(url, apiKey);
        const collection = client.collections.get(className);

        // Batch delete: ids provided in JSON body
        if (!id) {
            const body = await req.json();
            const ids: string[] = body.ids;
            if (!Array.isArray(ids) || ids.length === 0) {
                return NextResponse.json({ error: "Missing id param or ids array in body" }, { status: 400 });
            }
            let deleted = 0;
            for (const batchId of ids) {
                await collection.data.deleteById(batchId);
                deleted++;
            }
            return NextResponse.json({ success: true, deleted });
        }

        // Single delete (backwards compatible)
        await collection.data.deleteById(id);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete object error:", error);
        return NextResponse.json({ error: error.message || "Failed to delete object" }, { status: 500 });
    }
}
