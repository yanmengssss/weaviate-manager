import { NextResponse } from "next/server";
import { getWeaviateClient } from "@/lib/weaviate";

export async function GET(req: Request) {
    try {
        const url = req.headers.get("x-weaviate-url");
        const apiKey = req.headers.get("x-weaviate-api-key") || undefined;

        if (!url) {
            return NextResponse.json({ error: "Missing x-weaviate-url header" }, { status: 400 });
        }

        const client = await getWeaviateClient(url, apiKey);

        // Fetch all classes
        const schema = await client.collections.listAll();

        // Weaviate collections listAll() returns an array of collection configs.
        // Each item has a .name property with the actual collection name.
        const classes = [];

        for (const collectionConfig of schema) {
            const name = collectionConfig.name;
            // Fetch exact object count for each collection
            let count = 0;
            try {
                const collection = client.collections.get(name);
                const agg = await collection.aggregate.overAll();
                count = agg.totalCount || 0;
            } catch (err) {
                console.warn(`Could not fetch count for collection ${name}`, err);
            }

            classes.push({
                class: name,
                description: collectionConfig.description || "",
                count: count,
            });
        }

        // Sort alphabetically
        classes.sort((a, b) => a.class.localeCompare(b.class));

        return NextResponse.json({ classes });
    } catch (error: any) {
        console.error("Schema fetch error:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch schema" }, { status: 500 });
    }
}
