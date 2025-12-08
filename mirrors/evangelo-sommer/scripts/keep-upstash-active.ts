import { Redis } from "@upstash/redis";

/**
 * Script to keep Upstash Redis database active by sending periodic traffic.
 * Run this script periodically (e.g., weekly) to prevent database archival.
 *
 * Usage: npx tsx scripts/keep-upstash-active.ts
 */

async function keepUpstashActive() {
  console.log("🔄 Sending traffic to Upstash Redis...");

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Missing Upstash environment variables");
  }

  const redis = Redis.fromEnv();

  try {
    // Perform a simple SET and GET operation
    const timestamp = new Date().toISOString();
    const key = "keepalive:ping";

    await redis.set(key, timestamp, { ex: 86400 }); // Expires in 24 hours
    const result = await redis.get(key);

    console.log("✅ Successfully pinged Upstash Redis");
    console.log(`   Timestamp: ${result}`);

    // Also increment a counter to track pings
    const pingCount = await redis.incr("keepalive:ping_count");
    console.log(`   Total pings: ${pingCount}`);

  } catch (error) {
    console.error("❌ Error connecting to Upstash:", error);
    process.exit(1);
  }
}

keepUpstashActive();
