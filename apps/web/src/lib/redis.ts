import Redis from "ioredis";

let redis: Redis | null = null;
let redisUnavailable = false;

function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });
    redis.on("error", () => {
      redisUnavailable = true;
    });
  }
  return redis;
}

export async function readLiveKv<T>(key: string): Promise<T | null> {
  if (redisUnavailable) return null;

  const client = getRedisClient();
  try {
    if (client.status !== "ready") await client.connect();
    const raw = await client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    redisUnavailable = true;
    return null;
  }
}
