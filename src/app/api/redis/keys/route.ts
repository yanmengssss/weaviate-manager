import { NextResponse } from "next/server";
import { getRedisConfigFromHeaders, withRedisClient } from "@/lib/redis";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const pattern = searchParams.get("pattern") || "*";
    const cursorParam = searchParams.get("cursor") || "0";
    const countParam = searchParams.get("count") || "50";

    const config = getRedisConfigFromHeaders(req);
    const result = await withRedisClient(config, async (client) => {
      const scanResult = await client.scan(cursorParam, {
        MATCH: pattern,
        COUNT: Number(countParam),
      });
      const keys = scanResult.keys || [];

      const pipeline = client.multi();
      keys.forEach((key) => {
        pipeline.type(key);
        pipeline.ttl(key);
      });

      const meta = await pipeline.exec();
      const items = keys.map((key, index) => ({
        key,
        type: meta ? (meta[index * 2] as unknown as string) : "unknown",
        ttl: meta ? (meta[index * 2 + 1] as unknown as number) : -1,
      }));

      return {
        cursor: scanResult.cursor || "0",
        keys: items,
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to scan keys" },
      { status: 500 },
    );
  }
}
