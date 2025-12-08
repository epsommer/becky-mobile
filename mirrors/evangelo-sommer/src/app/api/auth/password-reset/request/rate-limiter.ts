import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  throw new Error("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
}

// Rate limiter for requesting a password reset link.
// Allows 5 requests from the same IP in a 10-minute window.
export const requestPasswordResetLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  analytics: true,
  prefix: "ratelimit:request_password_reset",
});

// Rate limiter for submitting the new password.
// Allows 10 requests from the same IP in a 10-minute window.
export const resetPasswordLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "10 m"),
    analytics: true,
    prefix: "ratelimit:reset_password",
});