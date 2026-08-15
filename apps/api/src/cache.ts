import { env } from "./env.js";
import { logger } from "./logger.js";

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();

let redis: { get(k: string): Promise<string | null>; set(k: string, v: string, ex: string, ttl: number): Promise<unknown> } | null =
  null;

export async function initCache(): Promise<void> {
  if (!env.redisUrl) return;
  try {
    const mod = (await import("ioredis")) as unknown as { default: new (url: string, opts?: object) => { connect(): Promise<void>; get(k: string): Promise<string | null>; set(k: string, v: string, ex: string, ttl: number): Promise<unknown> } };
    const client = new mod.default(env.redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    await client.connect();
    redis = client;
    logger.info("redis cache connected");
  } catch (err) {
    logger.warn({ err }, "redis unavailable; using in-memory cache");
    redis = null;
  }
}

export async function cacheGet(key: string): Promise<string | null> {
  if (redis) return redis.get(key);
  const hit = memory.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds: number): Promise<void> {
  if (redis) {
    await redis.set(key, value, "EX", ttlSeconds);
    return;
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
