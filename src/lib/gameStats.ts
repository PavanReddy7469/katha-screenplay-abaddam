import { GameModeId, Movie, PersonaId } from "./personas";
import type { CensorRating } from "@/components/VerdictCard";

export interface DailyRecord {
  dateKey: string; // YYYY-MM-DD (local time)
  movieId: string;
  movieTitle: string;
  outcome: "won" | "lost";
  questionsUsed: number;
  personaId: GameModeId;
  finalRating: CensorRating;
  liesCaught: number;
  playedAt: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  totalLiesCaught: number;
  reelDistribution: Record<number, number>; // 1..8
  witnessBreakdown: Record<PersonaId, { played: number; won: number }>;
  dailyRecords: Record<string, DailyRecord>;
}

const STORAGE_KEY = "ksa_censor_stats_v1";

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatReadableDate(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getPreviousDateKey(dateKey: string, daysBack = 1): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() - daysBack);
  return getLocalDateKey(date);
}

export function getMovieForDate(dateKey: string, movies: Movie[]): Movie {
  if (movies.length <= 1) return movies[0];
  // 1. Check for an explicitly scheduled Daily Case for this date (YYYY-MM-DD)
  const scheduled = movies.find((m) => m.featuredDate === dateKey);
  if (scheduled) return scheduled;
  // 2. Fallback deterministic hash for any other date so all players see the same Daily Case
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return movies[hash % movies.length];
}

export function createEmptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    maxStreak: 0,
    totalLiesCaught: 0,
    reelDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
    witnessBreakdown: {
      relangi: { played: 0, won: 0 },
      gajala: { played: 0, won: 0 },
      pandey: { played: 0, won: 0 },
    },
    dailyRecords: {},
  };
}

export function loadPlayerStats(): PlayerStats {
  if (typeof window === "undefined") return createEmptyStats();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyStats();
    const parsed = JSON.parse(raw) as Partial<PlayerStats>;
    const base = createEmptyStats();
    return {
      ...base,
      ...parsed,
      reelDistribution: {
        ...base.reelDistribution,
        ...(parsed.reelDistribution ?? {}),
      },
      witnessBreakdown: {
        relangi: {
          ...base.witnessBreakdown.relangi,
          ...(parsed.witnessBreakdown?.relangi ?? {}),
        },
        gajala: {
          ...base.witnessBreakdown.gajala,
          ...(parsed.witnessBreakdown?.gajala ?? {}),
        },
        pandey: {
          ...base.witnessBreakdown.pandey,
          ...(parsed.witnessBreakdown?.pandey ?? {}),
        },
      },
      dailyRecords: parsed.dailyRecords ?? {},
    };
  } catch {
    return createEmptyStats();
  }
}

export function savePlayerStats(stats: PlayerStats): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // Ignore quota/private-mode storage failures gracefully
  }
}

export function resetPlayerStats(): PlayerStats {
  const empty = createEmptyStats();
  savePlayerStats(empty);
  return empty;
}

function recalculateStreaks(dailyRecords: Record<string, DailyRecord>): {
  currentStreak: number;
  maxStreak: number;
} {
  const wonDates = Object.values(dailyRecords)
    .filter((r) => r.outcome === "won")
    .map((r) => r.dateKey)
    .sort();

  if (wonDates.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Max consecutive winning days across all recorded dates
  let maxStreak = 1;
  let running = 1;
  for (let i = 1; i < wonDates.length; i++) {
    const expectedPrev = getPreviousDateKey(wonDates[i], 1);
    if (wonDates[i - 1] === expectedPrev) {
      running += 1;
      if (running > maxStreak) maxStreak = running;
    } else {
      running = 1;
    }
  }

  // Current active streak anchored at today (or yesterday if today isn't played yet)
  const todayKey = getLocalDateKey();
  const yesterdayKey = getPreviousDateKey(todayKey, 1);
  const wonSet = new Set(wonDates);

  let anchor: string | null = null;
  if (wonSet.has(todayKey)) {
    anchor = todayKey;
  } else if (!dailyRecords[todayKey] && wonSet.has(yesterdayKey)) {
    anchor = yesterdayKey;
  }

  let currentStreak = 0;
  if (anchor) {
    let cursor = anchor;
    while (wonSet.has(cursor)) {
      currentStreak += 1;
      cursor = getPreviousDateKey(cursor, 1);
    }
  }

  return { currentStreak, maxStreak };
}

export function recordGameOutcome(
  currentStats: PlayerStats,
  record: Omit<DailyRecord, "playedAt">
): PlayerStats {
  const alreadyRecorded = Boolean(currentStats.dailyRecords[record.dateKey]);
  const fullRecord: DailyRecord = {
    ...record,
    playedAt: new Date().toISOString(),
  };

  const nextDailyRecords = {
    ...currentStats.dailyRecords,
    // Keep the player's first official attempt if already won, otherwise allow updating
    [record.dateKey]:
      alreadyRecorded && currentStats.dailyRecords[record.dateKey].outcome === "won"
        ? currentStats.dailyRecords[record.dateKey]
        : fullRecord,
  };

  const nextWitness = { ...currentStats.witnessBreakdown };
  if (record.personaId === "panel") {
    (["relangi", "gajala", "pandey"] as PersonaId[]).forEach((pid) => {
      nextWitness[pid] = {
        played: nextWitness[pid].played + 1,
        won: nextWitness[pid].won + (record.outcome === "won" ? 1 : 0),
      };
    });
  } else {
    nextWitness[record.personaId] = {
      played: nextWitness[record.personaId].played + 1,
      won:
        nextWitness[record.personaId].won + (record.outcome === "won" ? 1 : 0),
    };
  }

  const nextReelDist = { ...currentStats.reelDistribution };
  if (record.outcome === "won") {
    const bucket = Math.max(1, Math.min(8, record.questionsUsed || 1));
    nextReelDist[bucket] = (nextReelDist[bucket] ?? 0) + 1;
  }

  const { currentStreak, maxStreak } = recalculateStreaks(nextDailyRecords);

  const updated: PlayerStats = {
    gamesPlayed: currentStats.gamesPlayed + 1,
    gamesWon: currentStats.gamesWon + (record.outcome === "won" ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(currentStats.maxStreak, maxStreak),
    totalLiesCaught: (currentStats.totalLiesCaught ?? 0) + record.liesCaught,
    reelDistribution: nextReelDist,
    witnessBreakdown: nextWitness,
    dailyRecords: nextDailyRecords,
  };

  savePlayerStats(updated);
  return updated;
}

