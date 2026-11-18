"use client";

import React, { useMemo, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  Lock,
  Play,
  RotateCcw,
  Trash2,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import {
  formatReadableDate,
  getLocalDateKey,
  parseDateKey,
  PlayerStats,
} from "@/lib/gameStats";
import { PERSONA_LIST, PERSONAS } from "@/lib/personas";
import MidnightCountdown from "./MidnightCountdown";

interface StatsCalendarModalProps {
  isOpen: boolean;
  initialTab: "stats" | "calendar";
  stats: PlayerStats;
  activeDateKey: string;
  onClose: () => void;
  onSelectArchiveDate: (dateKey: string) => void;
  onResetStats: () => void;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StatsCalendarModal({
  isOpen,
  initialTab,
  stats,
  activeDateKey,
  onClose,
  onSelectArchiveDate,
  onResetStats,
}: StatsCalendarModalProps) {
  const todayKey = useMemo(() => getLocalDateKey(), []);
  const todayDate = useMemo(() => parseDateKey(todayKey), [todayKey]);

  const [tab, setTab] = useState<"stats" | "calendar">(initialTab);
  const [viewYear, setViewYear] = useState<number>(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(todayDate.getMonth());
  const [selectedDayKey, setSelectedDayKey] = useState<string>(activeDateKey);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  // Sync tab when modal re-opens
  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setSelectedDayKey(activeDateKey);
      const activeDate = parseDateKey(activeDateKey);
      setViewYear(activeDate.getFullYear());
      setViewMonth(activeDate.getMonth());
      setConfirmReset(false);
    }
  }, [isOpen, initialTab, activeDateKey]);

  if (!isOpen) return null;

  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const maxReelCount = Math.max(
    1,
    ...Object.values(stats.reelDistribution)
  );

  // Build calendar cells for viewYear / viewMonth
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDayOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = firstDayOfMonth.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const canGoNextMonth =
    viewYear < todayDate.getFullYear() ||
    (viewYear === todayDate.getFullYear() && viewMonth < todayDate.getMonth());

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNextMonth) return;
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const selectedRecord = stats.dailyRecords[selectedDayKey];
  const isSelectedFuture = selectedDayKey > todayKey;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto max-h-[94dvh] overflow-y-auto cbfc-paper cbfc-frame text-censor-ink rounded-sm p-4 sm:p-7 relative animate-fade-up">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-sm hover:bg-censor-ink/10 text-censor-ink transition-colors"
          aria-label="Close CBFC Dossier Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="border-b-2 border-censor-ink/75 pb-3 mb-4 pr-8">
          <p className="font-typewriter text-[10px] uppercase tracking-[0.2em] text-censor-ink/70">
            CBFC HYDERABAD • OFFICER RECORD &amp; CASE REGISTER
          </p>
          <h2 className="font-display font-black text-2xl sm:text-3xl text-censor-ink">
            {tab === "stats"
              ? "OFFICER SERVICE STATS"
              : "PREVIOUS DAYS ARCHIVE"}
          </h2>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => setTab("stats")}
            className={`py-2.5 px-2 sm:px-3 rounded-sm font-typewriter font-bold text-[11px] min-[375px]:text-xs sm:text-sm uppercase tracking-wider border-2 inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              tab === "stats"
                ? "bg-censor-ink text-parchment-50 border-censor-ink shadow-sm"
                : "bg-parchment-200/70 text-censor-ink border-censor-ink/40 hover:border-censor-ink"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Stats</span>
          </button>

          <button
            type="button"
            onClick={() => setTab("calendar")}
            className={`py-2.5 px-2 sm:px-3 rounded-sm font-typewriter font-bold text-[11px] min-[375px]:text-xs sm:text-sm uppercase tracking-wider border-2 inline-flex items-center justify-center gap-1.5 sm:gap-2 transition-all ${
              tab === "calendar"
                ? "bg-censor-ink text-parchment-50 border-censor-ink shadow-sm"
                : "bg-parchment-200/70 text-censor-ink border-censor-ink/40 hover:border-censor-ink"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="sm:hidden">Archive</span>
            <span className="hidden sm:inline">Previous Days Calendar</span>
          </button>
        </div>

        {/* TAB 1: STATS */}
        {tab === "stats" && (
          <div className="space-y-5 animate-fade-up">
            {/* 4 Headline KPI Stamps */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
              <div className="border-2 border-censor-ink/60 bg-parchment-50/80 p-3 rounded-sm">
                <span className="font-display font-black text-2xl sm:text-3xl text-censor-ink block leading-none">
                  {stats.gamesPlayed}
                </span>
                <span className="font-typewriter text-[10px] uppercase tracking-wider text-censor-ink/70 mt-1 block">
                  Cases Played
                </span>
              </div>

              <div className="border-2 border-censor-ink/60 bg-parchment-50/80 p-3 rounded-sm">
                <span className="font-display font-black text-2xl sm:text-3xl text-censor-teal block leading-none">
                  {winRate}%
                </span>
                <span className="font-typewriter text-[10px] uppercase tracking-wider text-censor-ink/70 mt-1 block">
                  Win Rate
                </span>
              </div>

              <div className="border-2 border-censor-ink/60 bg-parchment-50/80 p-3 rounded-sm">
                <span className="font-display font-black text-2xl sm:text-3xl text-amber-700 flex items-center justify-center gap-1 leading-none">
                  <Flame className="w-5 h-5 text-amber-600" />
                  {stats.currentStreak}
                </span>
                <span className="font-typewriter text-[10px] uppercase tracking-wider text-censor-ink/70 mt-1 block">
                  Day Streak
                </span>
              </div>

              <div className="border-2 border-censor-ink/60 bg-parchment-50/80 p-3 rounded-sm">
                <span className="font-display font-black text-2xl sm:text-3xl text-censor-crimson flex items-center justify-center gap-1 leading-none">
                  <Trophy className="w-5 h-5 text-censor-gold" />
                  {stats.maxStreak}
                </span>
                <span className="font-typewriter text-[10px] uppercase tracking-wider text-censor-ink/70 mt-1 block">
                  Best Streak
                </span>
              </div>
            </div>

            {/* Reel Distribution Chart (1–8 Reels) */}
            <div className="border-2 border-censor-ink/55 bg-parchment-50/75 p-4 rounded-sm">
              <h3 className="font-typewriter text-xs font-bold uppercase tracking-[0.14em] text-censor-ink mb-3">
                WIN DISTRIBUTION BY REELS USED
              </h3>
              <div className="space-y-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((reelNum) => {
                  const count = stats.reelDistribution[reelNum] ?? 0;
                  const widthPct =
                    count > 0 ? Math.max(10, Math.round((count / maxReelCount) * 100)) : 0;

                  return (
                    <div
                      key={reelNum}
                      className="flex items-center gap-2.5 font-typewriter text-xs"
                    >
                      <span className="w-14 shrink-0 font-bold text-censor-ink/80">
                        Reel #{reelNum}
                      </span>
                      <div className="flex-1 h-5 bg-parchment-200/80 border border-censor-ink/25 rounded-[2px] overflow-hidden">
                        {count > 0 && (
                          <div
                            className="h-full bg-censor-teal text-parchment-50 text-[10px] font-bold flex items-center justify-end pr-2 transition-all duration-500"
                            style={{ width: `${widthPct}%` }}
                          >
                            {count}
                          </div>
                        )}
                      </div>
                      {count === 0 && (
                        <span className="w-4 text-right text-[10px] text-censor-ink/45">
                          0
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Witness Breakdown */}
            <div className="border-2 border-censor-ink/55 bg-parchment-50/75 p-4 rounded-sm">
              <h3 className="font-typewriter text-xs font-bold uppercase tracking-[0.14em] text-censor-ink mb-3">
                RECORD BY WITNESS DIFFICULTY
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {PERSONA_LIST.map((p) => {
                  const rec = stats.witnessBreakdown[p.id];
                  const pct =
                    rec.played > 0
                      ? Math.round((rec.won / rec.played) * 100)
                      : 0;
                  return (
                    <div
                      key={p.id}
                      className="border border-censor-ink/40 bg-parchment-200/50 p-2.5 rounded-sm"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-6 h-6 rounded-[2px] text-[10px] font-display font-black text-parchment-50 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: p.accentColor }}
                        >
                          {p.monogram}
                        </span>
                        <span className="font-display font-bold text-sm truncate">
                          {p.name}
                        </span>
                      </div>
                      <p className="font-typewriter text-[11px] text-censor-ink/80">
                        {rec.won}W / {rec.played - rec.won}L ({pct}%)
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Reset Action */}
            <div className="flex items-center justify-between pt-1">
              <span className="font-typewriter text-[10px] text-censor-ink/65">
                Stats saved locally on this device.
              </span>
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <span className="font-typewriter text-[11px] font-bold text-censor-crimson">
                    Wipe all records?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onResetStats();
                      setConfirmReset(false);
                    }}
                    className="px-2.5 py-1 bg-censor-red text-parchment-50 font-typewriter text-[10px] font-bold uppercase rounded-sm"
                  >
                    Yes, Reset
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="px-2.5 py-1 bg-parchment-200 border border-censor-ink font-typewriter text-[10px] font-bold uppercase rounded-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmReset(true)}
                  className="inline-flex items-center gap-1 font-typewriter text-[11px] text-censor-ink/70 hover:text-censor-crimson transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset Stats</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PREVIOUS DAYS CALENDAR ARCHIVE */}
        {tab === "calendar" && (
          <div className="space-y-4 animate-fade-up">
            {/* Month Navigation Bar */}
            <div className="flex items-center justify-between bg-parchment-200/70 border-2 border-censor-ink/60 px-3 py-2 rounded-sm">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-sm hover:bg-censor-ink/10 text-censor-ink transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="font-display font-black text-lg uppercase tracking-wide text-censor-ink">
                {monthLabel}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={!canGoNextMonth}
                className="p-1.5 rounded-sm hover:bg-censor-ink/10 text-censor-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="border-2 border-censor-ink/60 bg-parchment-50/80 p-2 sm:p-3 rounded-sm">
              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5 sm:mb-2 text-center">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="font-typewriter text-[9px] sm:text-[10px] font-bold uppercase text-censor-ink/65"
                  >
                    {day.slice(0, 2)}
                    <span className="hidden min-[375px]:inline">{day.slice(2)}</span>
                  </div>
                ))}
              </div>

              {/* Day Cells */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                {Array.from({ length: startWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 min-[375px]:h-12 sm:h-14" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const cellDate = new Date(viewYear, viewMonth, dayNum);
                  const cellKey = getLocalDateKey(cellDate);
                  const isFuture = cellKey > todayKey;
                  const isToday = cellKey === todayKey;
                  const isSelected = cellKey === selectedDayKey;
                  const record = stats.dailyRecords[cellKey];

                  let cellClasses =
                    "border border-censor-ink/35 bg-parchment-100 hover:border-censor-ink hover:bg-parchment-200/80 text-censor-ink";

                  if (isFuture) {
                    cellClasses =
                      "border border-censor-ink/15 bg-parchment-200/35 text-censor-ink/35 cursor-not-allowed";
                  } else if (record?.outcome === "won") {
                    cellClasses =
                      "border-2 border-censor-teal bg-emerald-900/15 text-emerald-950 hover:bg-emerald-900/25";
                  } else if (record?.outcome === "lost") {
                    cellClasses =
                      "border-2 border-censor-red bg-censor-red/12 text-censor-crimson hover:bg-censor-red/20";
                  }

                  return (
                    <button
                      key={cellKey}
                      type="button"
                      disabled={isFuture}
                      onClick={() => setSelectedDayKey(cellKey)}
                      className={`h-10 min-[375px]:h-12 sm:h-14 rounded-[2px] p-0.5 sm:p-1 flex flex-col items-center justify-between transition-all relative ${cellClasses} ${
                        isSelected
                          ? "ring-2 ring-censor-ink ring-offset-1 ring-offset-parchment-50 scale-[1.03] z-10"
                          : ""
                      } ${isToday && !isSelected ? "ring-2 ring-censor-gold" : ""}`}
                    >
                      <span className="font-typewriter text-[11px] sm:text-xs font-bold leading-none">
                        {dayNum}
                      </span>

                      {isFuture ? (
                        <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 opacity-50" />
                      ) : record?.outcome === "won" ? (
                        <span className="inline-flex items-center gap-0.5 font-typewriter text-[8px] sm:text-[9px] font-bold text-censor-teal">
                          <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span>{record.questionsUsed}R</span>
                        </span>
                      ) : record?.outcome === "lost" ? (
                        <span className="inline-flex items-center gap-0.5 font-typewriter text-[8px] sm:text-[9px] font-bold text-censor-red">
                          <XCircle className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          <span className="hidden min-[375px]:inline">BAN</span>
                        </span>
                      ) : isToday ? (
                        <span className="font-typewriter text-[7px] sm:text-[8px] font-bold uppercase px-0.5 sm:px-1 bg-censor-gold text-booth-950 rounded-[1px]">
                          NOW
                        </span>
                      ) : (
                        <span className="font-typewriter text-[7px] sm:text-[8px] uppercase text-censor-ink/45">
                          OPEN
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend & Midnight Unlock Countdown */}
              <div className="mt-3 pt-2 border-t border-censor-ink/20 flex flex-col items-center gap-1.5 font-typewriter text-[10px] text-censor-ink/75">
                <div className="flex flex-wrap items-center justify-center gap-4">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-censor-teal" />
                    U/A Blockbuster
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-censor-red" />
                    Banned Flop
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-censor-gold inline-block" />
                    Today&apos;s Screening
                  </span>
                </div>
                <MidnightCountdown compact />
              </div>
            </div>

            {/* Selected Day Action Drawer */}
            <div className="border-2 border-censor-ink bg-parchment-200/75 p-3.5 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="font-typewriter text-[10px] uppercase tracking-widest text-censor-ink/70">
                  {selectedDayKey === todayKey
                    ? "TODAY'S OFFICIAL DAILY CASE"
                    : "CBFC ARCHIVE CASE FILE"}
                </p>
                <h4 className="font-display font-black text-lg text-censor-ink">
                  {formatReadableDate(selectedDayKey)}
                </h4>

                {selectedRecord ? (
                  <p className="font-sans text-xs text-censor-ink/85 mt-0.5">
                    <strong>
                      {selectedRecord.outcome === "won"
                        ? `Cleared (${selectedRecord.finalRating})`
                        : "BANNED"}
                    </strong>{" "}
                    • Film: <strong>{selectedRecord.movieTitle}</strong> •{" "}
                    {selectedRecord.questionsUsed}/8 reels •{" "}
                    {selectedRecord.personaId === "panel"
                      ? "3-Witness Panel"
                      : PERSONAS[selectedRecord.personaId]?.name ??
                        selectedRecord.personaId}
                  </p>
                ) : (
                  <p className="font-sans text-xs text-censor-ink/80 mt-0.5">
                    Unplayed screening case! Interrogate a witness to crack this
                    day&apos;s film.
                  </p>
                )}
              </div>

              {!isSelectedFuture && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectArchiveDate(selectedDayKey);
                    onClose();
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter font-bold text-xs uppercase tracking-wider border-2 border-censor-ink shadow-[3px_3px_0px_#261B12] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all shrink-0"
                >
                  {selectedRecord ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Replay Case</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play This Day</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

