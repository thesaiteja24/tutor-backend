import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/database/index.ts";
import { conversations } from "@/database/schema/conversations.ts";
import { messages } from "@/database/schema/messages.ts";
import { type User,users } from "@/database/schema/users.ts";
import { DEFAULT_USER_ID } from "@/database/seeds/default-user.seed.ts";

export class UserRepository {
  private cache = new Map<string, User>();

  clearCache() {
    this.cache.clear();
  }

  async findById(id: string): Promise<User | null> {
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    const user = rows[0] || null;
    if (user) {
      this.cache.set(user.id, user);
    }
    return user;
  }

  async findDefaultUser(): Promise<User | null> {
    const user = await this.findById(DEFAULT_USER_ID);
    if (user) return user;

    const rows = await db
      .select()
      .from(users)
      .where(isNull(users.deletedAt))
      .limit(1);

    const found = rows[0] || null;
    if (found) {
      this.cache.set(found.id, found);
    }
    return found;
  }

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const rows = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    const updated = rows[0] || null;
    this.cache.delete(id);
    if (updated) {
      this.cache.set(id, updated);
    }
    return updated;
  }

  async getUserAnalytics(userId: string) {
    // 1. Fetch all conversations for user with persona and practiceMode
    const userConversations = await db.query.conversations.findMany({
      where: and(eq(conversations.userId, userId), isNull(conversations.deletedAt)),
      with: {
        persona: true,
        practiceMode: true,
      },
      orderBy: [desc(conversations.updatedAt)],
    });

    const conversationIds = userConversations.map((c) => c.id);

    // 2. If no conversations, return baseline defaults
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Generate last 7 days ending today
    const weeklyDaysMap = new Map<string, { date: string; dayLabel: string; dateNum: number; turns: number; seconds: number; isToday: boolean }>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      weeklyDaysMap.set(dStr, {
        date: dStr,
        dayLabel: dayNames[d.getDay()] || "D",
        dateNum: d.getDate(),
        turns: 0,
        seconds: 0,
        isToday: i === 0,
      });
    }

    if (conversationIds.length === 0) {
      const weeklyDays = Array.from(weeklyDaysMap.values()).map((w) => ({
        ...w,
        isCompleted: false,
        minutes: 0,
      }));

      return {
        summary: {
          totalConversations: 0,
          totalTurns: 0,
          totalSpeakingMinutes: 0,
          totalWordsLearned: 0,
        },
        today: {
          minutes: 0,
          goalMinutes: 15,
          turns: 0,
          progressPercentage: 0,
        },
        streak: {
          currentStreakDays: 0,
          longestStreakDays: 0,
          weeklyDays,
        },
        skills: {
          fluency: 0,
          grammar: 0,
          vocabulary: 0,
          codeMixing: 0,
        },
        vocabularyVault: [],
        recentHistory: [],
      };
    }

    // 3. Query all completed messages for user conversations
    const allMessages = await db.query.messages.findMany({
      where: and(
        inArray(messages.conversationId, conversationIds),
        eq(messages.status, "completed"),
        isNull(messages.deletedAt),
      ),
      orderBy: [desc(messages.createdAt)],
    });

    const userMessages = allMessages.filter((m) => m.sender === "user");
    const assistantMessages = allMessages.filter((m) => m.sender === "assistant");

    // Map conversation turn counts
    const convTurnsMap = new Map<string, number>();
    for (const m of userMessages) {
      convTurnsMap.set(m.conversationId, (convTurnsMap.get(m.conversationId) || 0) + 1);
    }

    // Aggregate speaking time & daily buckets
    let totalSpeakingSeconds = 0;
    let todayTurns = 0;
    let todaySeconds = 0;
    const activeDatesSet = new Set<string>();

    for (const m of userMessages) {
      const dur = m.transcriptMetadata?.durationSeconds || (m.transcriptMetadata?.source === "audio" ? 12 : 5);
      totalSpeakingSeconds += dur;

      const dateStr = new Date(m.createdAt).toISOString().slice(0, 10);
      activeDatesSet.add(dateStr);

      if (dateStr === todayStr) {
        todayTurns += 1;
        todaySeconds += dur;
      }

      if (weeklyDaysMap.has(dateStr)) {
        const item = weeklyDaysMap.get(dateStr)!;
        item.turns += 1;
        item.seconds += dur;
      }
    }

    // Streak calculation (consecutive days)
    let currentStreak = 0;
    const checkDate = new Date();
    // If no turns today yet, check starting from yesterday
    const todayHasTurns = activeDatesSet.has(todayStr);
    if (!todayHasTurns) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dStr = checkDate.toISOString().slice(0, 10);
      if (activeDatesSet.has(dStr)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const weeklyDays = Array.from(weeklyDaysMap.values()).map((w) => ({
      date: w.date,
      dayLabel: w.dayLabel,
      dateNum: w.dateNum,
      isCompleted: w.turns > 0,
      isToday: w.isToday,
      minutes: Math.round(w.seconds / 60 * 10) / 10,
      turns: w.turns,
    }));

    // Vocabulary vault extraction from assistant responseData & feedback
    const vocabMap = new Map<string, { term: string; count: number; lastEncountered: string; type: string }>();
    let recastsCount = 0;

    for (const m of assistantMessages) {
      const res = m.responseData as Record<string, unknown> | null;
      const terms: string[] = [
        ...(((res?.learningState as Record<string, unknown> | undefined)?.introducedTerms as string[]) || []),
        ...((((res?.turn as Record<string, unknown> | undefined)?.learningState as Record<string, unknown> | undefined)?.introducedTerms as string[]) || []),
        ...(((res?.feedback as Record<string, unknown> | undefined)?.vocabularySuggestions as string[]) || []),
      ];

      for (const term of terms) {
        if (typeof term === "string" && term.trim().length > 1) {
          const clean = term.trim().toLowerCase();
          const existing = vocabMap.get(clean);
          const isIdiom = clean.includes(" ") || clean.length > 12;
          if (existing) {
            existing.count += 1;
          } else {
            vocabMap.set(clean, {
              term: clean,
              count: 1,
              type: isIdiom ? "idiom" : "vocabulary",
              lastEncountered: m.createdAt ? new Date(m.createdAt).toISOString() : new Date().toISOString(),
            });
          }
        }
      }

      const hasCorrection = Boolean(
        (res?.correction as Record<string, unknown> | undefined)?.naturalRewrite ||
        ((res?.turn as Record<string, unknown> | undefined)?.correction as Record<string, unknown> | undefined)?.naturalRewrite ||
        ((res?.feedback as Record<string, unknown> | undefined)?.grammarCorrections as unknown[] | undefined)?.length,
      );
      if (hasCorrection) {
        recastsCount++;
      }
    }

    const vocabularyVault = Array.from(vocabMap.values()).slice(0, 20);

    // Skills calculation
    const totalTurns = userMessages.length;
    const grammarScore = totalTurns > 0
      ? Math.max(65, Math.min(98, Math.round(100 - (recastsCount / Math.max(1, totalTurns)) * 25)))
      : 0;
    const fluencyScore = totalTurns > 0
      ? Math.max(65, Math.min(96, Math.round(72 + Math.min(22, totalTurns * 0.5))))
      : 0;
    const vocabScore = totalTurns > 0
      ? Math.max(60, Math.min(95, Math.round(68 + Math.min(27, vocabularyVault.length * 2.5))))
      : 0;
    const codeMixingScore = totalTurns > 0
      ? Math.max(70, Math.min(95, Math.round(78 + Math.min(17, totalTurns * 0.3))))
      : 0;

    const todayMinutes = Math.round(todaySeconds / 60 * 10) / 10;
    const goalMinutes = 15;
    const progressPercentage = Math.min(100, Math.round((todayMinutes / goalMinutes) * 100));

    // Recent History (top 5 conversations)
    const recentHistory = userConversations.slice(0, 5).map((c) => {
      const turns = convTurnsMap.get(c.id) || 0;
      const pName = c.persona?.name || "AI Tutor";
      const mName = c.practiceMode?.name || "Live Conversation";
      const pAvatar = c.persona?.avatarUrl || null;

      return {
        id: c.id,
        title: c.title || `${pName} Practice`,
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        turnCount: turns,
        turnsCount: turns,
        personaName: pName,
        personaAvatarUrl: pAvatar,
        practiceModeName: mName,
        persona: {
          id: c.persona?.id || "",
          name: pName,
          avatarUrl: pAvatar,
          voiceId: c.persona?.voiceId || "ritu",
        },
        practiceMode: {
          id: c.practiceMode?.id || "",
          name: mName,
        },
      };
    });

    return {
      summary: {
        totalConversations: userConversations.length,
        totalTurns,
        totalSpeakingMinutes: Math.round(totalSpeakingSeconds / 60 * 10) / 10,
        totalWordsLearned: vocabularyVault.length,
      },
      today: {
        minutes: todayMinutes,
        goalMinutes,
        turns: todayTurns,
        progressPercentage,
      },
      streak: {
        currentStreakDays: currentStreak,
        longestStreakDays: currentStreak,
        weeklyDays,
      },
      skills: {
        fluency: fluencyScore,
        grammar: grammarScore,
        vocabulary: vocabScore,
        codeMixing: codeMixingScore,
      },
      vocabularyVault,
      recentHistory,
    };
  }
}

export const userRepository = new UserRepository();
