import { and, count, desc, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/database/index.ts";
import { users } from "@/database/schema/users.ts";
import { conversations } from "@/database/schema/conversations.ts";
import { messages } from "@/database/schema/messages.ts";

export class AdminAnalyticsRepository {
  async getUserStats() {
    const totalUsersResult = await db
      .select({ total: count(users.id) })
      .from(users)
      .where(isNull(users.deletedAt));

    const total = Number(totalUsersResult[0]?.total || 0);

    const rolesBreakdown = await db
      .select({
        role: users.role,
        count: count(users.id),
      })
      .from(users)
      .where(isNull(users.deletedAt))
      .groupBy(users.role);

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dauResult = await db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.lastLoginAt, oneDayAgo)));

    const wauResult = await db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.lastLoginAt, sevenDaysAgo)));

    const mauResult = await db
      .select({ count: count(users.id) })
      .from(users)
      .where(and(isNull(users.deletedAt), gte(users.lastLoginAt, thirtyDaysAgo)));

    const rolesMap: Record<string, number> = {
      user: 0,
      superadmin: 0,
      org_admin: 0,
    };
    for (const r of rolesBreakdown) {
      rolesMap[r.role] = Number(r.count);
    }

    return {
      total,
      dau: Number(dauResult[0]?.count || 0),
      wau: Number(wauResult[0]?.count || 0),
      mau: Number(mauResult[0]?.count || 0),
      roles: rolesMap,
    };
  }

  async getConversationAndTurnStats() {
    const totalConversationsResult = await db
      .select({ total: count(conversations.id) })
      .from(conversations)
      .where(isNull(conversations.deletedAt));

    const totalConversations = Number(totalConversationsResult[0]?.total || 0);

    const totalMessagesResult = await db
      .select({ total: count(messages.id) })
      .from(messages)
      .where(and(isNull(messages.deletedAt), eq(messages.status, "completed")));

    const totalTurns = Number(totalMessagesResult[0]?.total || 0);

    return {
      totalConversations,
      totalTurns,
    };
  }

  async getTelemetryAndUsageData() {
    // Fetch raw latency and duration data from completed messages
    const rows = await db
      .select({
        id: messages.id,
        sender: messages.sender,
        transcriptMetadata: messages.transcriptMetadata,
        latencyMetrics: messages.latencyMetrics,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(isNull(messages.deletedAt), eq(messages.status, "completed")))
      .orderBy(desc(messages.createdAt))
      .limit(2000);

    return rows;
  }
}

export const adminAnalyticsRepository = new AdminAnalyticsRepository();
