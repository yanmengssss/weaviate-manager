import { NextResponse } from "next/server";
import { getMongoConfigFromHeaders, withMongoClient } from "@/lib/mongodb";

const parseJson = (value?: string) => {
    if (!value) return {};
    return JSON.parse(value);
};

const normalizeUpdate = (update: any) => {
    if (!update || typeof update !== "object") return {};
    const keys = Object.keys(update);
    const hasOperator = keys.some((key) => key.startsWith("$"));
    return hasOperator ? update : { $set: update };
};

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const dbName = searchParams.get("db");
        const collectionName = searchParams.get("collection");
        const limit = Number(searchParams.get("limit") || "20");
        const skip = Number(searchParams.get("skip") || "0");
        const filterParam = searchParams.get("filter");

        if (!dbName || !collectionName) {
            return NextResponse.json({ error: "Missing db or collection" }, { status: 400 });
        }

        const filter = parseJson(filterParam || "{}");
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const collection = client.db(dbName).collection(collectionName);
            const [items, total] = await Promise.all([
                collection.find(filter).skip(skip).limit(limit).toArray(),
                collection.countDocuments(filter)
            ]);
            return { items, total };
        });

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch documents" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { db, collection, document } = body || {};
        if (!db || !collection || !document) {
            return NextResponse.json({ error: "Missing db, collection, or document" }, { status: 400 });
        }
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const result = await client.db(db).collection(collection).insertOne(document);
            return { insertedId: result.insertedId };
        });
        return NextResponse.json({ success: true, ...data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to insert document" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { db, collection, filter, update, options } = body || {};
        if (!db || !collection || !filter || !update) {
            return NextResponse.json({ error: "Missing db, collection, filter, or update" }, { status: 400 });
        }
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const normalized = normalizeUpdate(update);
            const result = await client.db(db).collection(collection).updateOne(filter, normalized, options);
            return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount };
        });
        return NextResponse.json({ success: true, ...data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to update document" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { db, collection, filter } = body || {};
        if (!db || !collection || !filter) {
            return NextResponse.json({ error: "Missing db, collection, or filter" }, { status: 400 });
        }
        const config = getMongoConfigFromHeaders(req);
        const data = await withMongoClient(config, async (client) => {
            const result = await client.db(db).collection(collection).deleteOne(filter);
            return { deletedCount: result.deletedCount };
        });
        return NextResponse.json({ success: true, ...data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete document" }, { status: 500 });
    }
}
