"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  Film,
  Flame,
  Stamp,
  Users,
} from "lucide-react";
import { PERSONA_LIST } from "@/lib/personas";
import {
  formatReadableDate,
  getLocalDateKey,
  PlayerStats,
} from "@/lib/gameStats";
import MidnightCountdown from "./MidnightCountdown";

interface CensorSplashProps {
  activeDateKey: string;
  vaultCount: number;
  loadingCase?: boolean;
  stats: PlayerStats;
  onEnterRoom: () => void;
  onOpenStats: () => void;
  onOpenCalendar: () => void;
  onResetToToday: () => void;
  onMidnightRollover?: (newDateKey: string) => void;
}

export default function CensorSplash({
  activeDateKey,
  vaultCount,
  loadingCase = false,
  stats,
  onEnterRoom,
  onOpenStats,
  onOpenCalendar,
  onResetToToday,
  onMidnightRollover,
}: CensorSplashProps) {
  const [isSlamming, setIsSlamming] = useState(false);
  const todayKey = getLocalDateKey();
  const isToday = activeDateKey === todayKey;
  const activeDayRecord = stats.dailyRecords[activeDateKey];
  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const handleEnter = () => {
    if (isSlamming) return;
    setIsSlamming(true);
    setTimeout(() => {
      onEnterRoom();
    }, 560);
  };

  return (
    <main className="min-h-[100dvh] w-full screening-room-bg flex flex-col items-center justify-center p-2.5 min-[375px]:p-3.5 sm:p-6 md:p-8 relative overflow-x-hidden">
      <div className="fixed top-0 inset-x-0 h-2.5 sm:h-3 sprocket-strip opacity-70 pointer-events-none" />
      <div className="fixed bottom-0 inset-x-0 h-2.5 sm:h-3 sprocket-strip opacity-70 pointer-events-none" />

      <section
        className={`relative w-full max-w-4xl cbfc-paper cbfc-frame text-censor-ink rounded-sm p-4 min-[375px]:p-5 sm:p-8 md:p-10 transition-transform ${
          isSlamming ? "animate-screen-shake" : ""
        }`}
      >
        {/* Watermark Background Emblem */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.045] select-none overflow-hidden">
          <div className="w-80 h-80 sm:w-[440px] sm:h-[440px] rounded-full border-[14px] border-censor-ink flex flex-col items-center justify-center text-center">
            <Film className="w-28 h-28 mb-2" />
            <span className="font-typewriter text-2xl tracking-[0.25em] font-bold">
              CBFC • HYD
            </span>
          </div>
        </div>

        {/* Corner registration ornaments */}
        <span className="pointer-events-none absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-censor-ink/60" />
        <span className="pointer-events-none absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-censor-ink/60" />
        <span className="pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-censor-ink/60" />
        <span className="pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-censor-ink/60" />

        {/* DAILY CASE & STATS/CALENDAR UTILITY BAR */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-dashed border-censor-ink/40">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-typewriter text-[10px] sm:text-xs font-bold uppercase px-2.5 py-1 rounded-[2px] border ${
                isToday
                  ? "bg-censor-ink text-parchment-50 border-censor-ink"
                  : "bg-amber-800 text-parchment-50 border-censor-ink"
              }`}
            >
              {isToday ? "TODAY'S DAILY CASE" : "ARCHIVE CASE"} •{" "}
              {formatReadableDate(activeDateKey)}
            </span>

            {!isToday && (
              <button
                type="button"
                onClick={onResetToToday}
                className="font-typewriter text-[10px] underline font-bold text-censor-crimson hover:text-censor-red"
              >
                Back to Today
              </button>
            )}

            {activeDayRecord && (
              <span
                className={`font-typewriter text-[10px] font-bold uppercase px-2 py-0.5 rounded-[2px] border ${
                  activeDayRecord.outcome === "won"
                    ? "bg-emerald-900/15 border-censor-teal text-censor-teal"
                    : "bg-censor-red/15 border-censor-red text-censor-crimson"
                }`}
              >
                {activeDayRecord.outcome === "won"
                  ? `CLEARED (${activeDayRecord.questionsUsed}R)`
                  : "BANNED"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {stats.gamesPlayed > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 font-typewriter text-[11px] font-bold text-censor-ink bg-parchment-200/80 border border-censor-ink/40 px-2 py-1 rounded-[2px]">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                {stats.currentStreak} Streak • {winRate}%
              </span>
            )}

            <button
              type="button"
              onClick={onOpenStats}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-parchment-50 hover:bg-parchment-200 border border-censor-ink text-censor-ink font-typewriter text-[11px] font-bold uppercase tracking-wider rounded-[2px] transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Stats</span>
            </button>

            <button
              type="button"
              onClick={onOpenCalendar}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-parchment-50 hover:bg-parchment-200 border border-censor-ink text-censor-ink font-typewriter text-[11px] font-bold uppercase tracking-wider rounded-[2px] transition-colors"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          </div>
        </div>

        {/* TOP HEADER ROW: Official CBFC Identification + U/A Stamp */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-b-2 border-censor-ink/75 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-censor-ink flex items-center justify-center bg-parchment-200/70 shrink-0 shadow-inner">
              <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full border border-dashed border-censor-ink/80 flex flex-col items-center justify-center p-1 text-center">
                <Film className="w-5 h-5 sm:w-6 sm:h-6 text-censor-ink" />
                <span className="font-typewriter text-[8px] sm:text-[9px] leading-tight tracking-widest font-bold mt-0.5">
                  CBFC
                </span>
                <span className="font-typewriter text-[7px] leading-none tracking-wider">
                  HYD • IND
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left">
              <p className="font-telugu text-xs sm:text-sm font-bold tracking-wide text-censor-ink/90">
                సెంట్రల్ బోర్డ్ ఆఫ్ ఫిల్మ్ సర్టిఫికేషన్ • హైదరాబాద్
              </p>
              <h2 className="font-typewriter text-xs sm:text-sm md:text-base font-bold tracking-[0.14em] uppercase text-censor-ink">
                CENTRAL BOARD OF FILM CERTIFICATION
              </h2>
              <p className="font-typewriter text-[10px] sm:text-xs text-censor-ink/75 tracking-wider">
                GOVERNMENT OF INDIA • JOINT 3-WITNESS SCREENING ROOM (TELUGU)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="border-[3px] border-censor-ink bg-parchment-50/75 px-3.5 py-1.5 text-center shadow-sm">
              <div className="font-display font-black text-3xl sm:text-4xl leading-none tracking-tight text-censor-ink">
                U/A
              </div>
              <div className="font-typewriter text-[8px] sm:text-[9px] tracking-[0.12em] uppercase mt-1 border-t border-censor-ink/60 pt-0.5 leading-tight">
                UNRESTRICTED
                <br />
                WITH CAUTION
              </div>
            </div>
          </div>
        </div>

        {/* OFFICIAL METADATA STRIP */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 border-b border-censor-ink/40 font-typewriter text-[10px] sm:text-xs">
          <div>
            <span className="text-censor-ink/65 block text-[9px] uppercase">
              Certificate No.
            </span>
            <span className="font-bold">CIL/2/84/2026-HYD</span>
          </div>
          <div>
            <span className="text-censor-ink/65 block text-[9px] uppercase">
              Length / Reels
            </span>
            <span className="font-bold">08 REELS (YES/NO)</span>
          </div>
          <div>
            <span className="text-censor-ink/65 block text-[9px] uppercase">
              Panel Format
            </span>
            <span className="font-bold">3-IN-1 CHAOS BENCH</span>
          </div>
          <div>
            <span className="text-censor-ink/65 block text-[9px] uppercase">
              Colour Process
            </span>
            <span className="font-bold">EASTMANCOLOR</span>
          </div>
        </div>

        {/* VINTAGE TITLE CARD */}
        <div className="relative z-10 text-center py-4 sm:py-6 border-b-2 border-censor-ink/75">
          <p className="font-telugu text-base min-[375px]:text-lg sm:text-2xl font-extrabold text-censor-crimson tracking-wide mb-1">
            కథ • స్క్రీన్ ప్లే • అబద్ధం : మీరే!
          </p>
          <h1 className="font-display font-black text-[1.35rem] min-[375px]:text-2xl sm:text-4xl md:text-[2.65rem] leading-[1.1] tracking-tight text-censor-ink uppercase break-words">
            KATHA • SCREENPLAY • ABADDAM
            <span className="block text-censor-red mt-1 text-lg min-[375px]:text-xl sm:text-3xl tracking-[0.12em]">
              : MEERE!
            </span>
          </h1>
          <p className="mt-2 font-typewriter text-[11px] min-[375px]:text-xs sm:text-sm text-censor-ink/80 max-w-2xl mx-auto leading-relaxed">
            Interrogate <strong>all 3 Tollywood legends together</strong> in{" "}
            <strong className="underline decoration-censor-red decoration-2">
              8 Yes/No Questions
            </strong>
            . Catch them contradicting each other, accuse the liar with{" "}
            <strong>OBJECTION!</strong>, and name the secret Telugu film!
          </p>
        </div>

        {/* 3-LINE CENSOR WARNING BOX */}
        <div className="relative z-10 my-5 border-2 border-censor-crimson/80 bg-censor-crimson/[0.06] p-3.5 sm:p-4 rounded-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-censor-crimson shrink-0" />
            <span className="font-typewriter text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-censor-crimson">
              MANDATORY CENSOR BOARD WARNING
            </span>
          </div>
          <ul className="space-y-1.5 font-typewriter text-xs sm:text-[13px] leading-snug text-censor-ink/95">
            <li>
              <strong>1. WARNING:</strong> Witness statements inside contain
              extreme Gajala-level corporate logic, Boyapati physics, and
              deliberate contradictions right on the bench.
            </li>
            <li>
              <strong>2. HOW IT WORKS:</strong> 2 witnesses testify on every
              reel while the 3rd heckles! Every wrong (<strong>NO</strong>) lead
              unlocks a non-spoiler CBFC Press Clipping clue.
            </li>
            <li>
              <strong>3. NOTICE:</strong> Spot a contradiction? Slam{" "}
              <em>&ldquo;OBJECTION! (ABADDAM!)&rdquo;</em> and accuse the exact
              liar for +2 reels—false accusations invite an immediate Censor
              downgrade!
            </li>
          </ul>
        </div>

        {/* SUMMONED 3-WITNESS PANEL ROSTER (ALL 3 IN ONE ROOM) */}
        <div className="relative z-10 mt-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="font-typewriter text-xs sm:text-sm font-bold uppercase tracking-[0.14em] text-censor-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-censor-crimson" />
              PART II — SUMMONED WITNESS BENCH (ALL 3 TOGETHER IN ROOM #04):
            </div>
            <span className="font-typewriter text-[10px] font-bold uppercase px-2 py-0.5 bg-censor-ink text-parchment-50 rounded-[2px]">
              JOINT INTERROGATION
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PERSONA_LIST.map((persona) => {
              const roleBadge =
                persona.id === "relangi"
                  ? "THE OPTIMIST"
                  : persona.id === "gajala"
                  ? "THE CORPORATE CEO"
                  : "THE FRUSTRATED COP";

              return (
                <div
                  key={persona.id}
                  className="text-left p-3.5 rounded-sm border-2 border-censor-ink/60 bg-parchment-50/75 shadow-sm relative"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-typewriter text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase rounded-[2px] bg-censor-ink text-parchment-50">
                      {roleBadge}
                    </span>
                    <span className="font-typewriter text-[9px] uppercase text-censor-crimson font-bold">
                      ON BENCH
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div
                      className="w-9 h-9 rounded-sm font-display font-black text-sm flex items-center justify-center text-parchment-50 shrink-0 shadow-sm border border-censor-ink/40"
                      style={{ backgroundColor: persona.accentColor }}
                    >
                      {persona.monogram}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-base leading-tight text-censor-ink truncate">
                        {persona.name}
                      </h3>
                      <p className="font-typewriter text-[10px] text-censor-ink/70 truncate">
                        {persona.title}
                      </p>
                    </div>
                  </div>

                  <p className="font-sans text-xs leading-relaxed text-censor-ink/85 mt-1.5">
                    {persona.shortDossier}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER SIGN-OFF & RUBBER STAMP CTA */}
        <div className="relative z-10 mt-6 pt-5 border-t-2 border-censor-ink/75 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-typewriter text-[11px] text-censor-ink/75 text-center sm:text-left space-y-1">
            <p className="font-bold uppercase tracking-wider text-censor-ink">
              Examining Committee Sign-Off
            </p>
            <p>
              Regional Officer, CBFC Hyderabad • {vaultCount} Released{" "}
              {vaultCount === 1 ? "Film" : "Films"} in Archive •{" "}
              <a
                href="/login"
                className="underline hover:text-censor-crimson text-censor-ink/90 font-semibold"
                title="CBFC Official Admin Login"
              >
                Officer Portal (/login)
              </a>
            </p>
            <div className="pt-0.5 text-censor-ink">
              <MidnightCountdown onMidnightRollover={onMidnightRollover} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleEnter}
            disabled={isSlamming || loadingCase}
            className="w-full sm:w-auto group relative inline-flex items-center justify-center gap-2 px-5 sm:px-7 py-3.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter font-bold text-xs min-[375px]:text-sm sm:text-base tracking-[0.12em] uppercase border-[3px] border-censor-ink shadow-[4px_4px_0px_#261B12] hover:shadow-[2px_2px_0px_#261B12] hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-90"
          >
            <Stamp className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-rotate-12 transition-transform shrink-0" />
            <span>
              {loadingCase
                ? "LOADING CASE..."
                : isSlamming
                ? "STAMPING ENTRY..."
                : "ENTER SCREENING ROOM"}
            </span>
          </button>
        </div>

        {/* RUBBER STAMP SLAM OVERLAY ANIMATION */}
        {isSlamming && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-parchment-100/35 backdrop-blur-[1px] pointer-events-none p-4">
            <div className="animate-stamp-slam rubber-stamp border-[5px] sm:border-[6px] border-censor-red text-censor-red bg-parchment-50/90 px-4 min-[375px]:px-6 sm:px-10 py-3 sm:py-4 text-center shadow-2xl max-w-[90vw]">
              <div className="font-typewriter text-[10px] sm:text-sm font-bold tracking-[0.22em]">
                CBFC HYDERABAD • U/A
              </div>
              <div className="font-display font-black text-xl min-[375px]:text-2xl sm:text-4xl tracking-wider mt-1">
                PANEL ASSEMBLED
              </div>
              <div className="font-telugu text-xs sm:text-base font-bold mt-1">
                విచారణ ప్రారంభం!
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
