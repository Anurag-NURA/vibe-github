import { auth } from "@clerk/nextjs/server";
import { RateLimiterPrisma } from "rate-limiter-flexible";

import { prisma } from "@/lib/prisma";

const FREE_POINTS = 5;
const PRO_POINTS = 100;
const DURATION = 30 * 24 * 60 * 60; //30 days
const GENERATE_COST = 1;

const { has } = await auth();
const hasProAccess = has({ plan: "pro" });

// Singleton pattern
// We create a single instance of RateLimiterPrisma and reuse it for all requests
const usageTracker = new RateLimiterPrisma({
  storeClient: prisma,
  tableName: "usage",
  points: hasProAccess ? PRO_POINTS : FREE_POINTS, // Pro users get more points
  duration: DURATION,
});

export async function getUsageTracker() {
  return usageTracker;
}

export async function consumeCredits() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();

  console.log("MODEL CHECK:", prisma["usage"]);

  try {
    const result = await usageTracker.consume(userId, GENERATE_COST);
    return result;
  } catch (error) {
    console.error("rate limiter error:", error);
    throw error;
  }
}

export async function getUsageStatus() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("User not authenticated");
  }

  const usageTracker = await getUsageTracker();
  const result = await usageTracker.get(userId);

  return result;
}
