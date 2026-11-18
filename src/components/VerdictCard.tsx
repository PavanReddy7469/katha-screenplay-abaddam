"use client";

import React, { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  Copy,
  Film,
  Flame,
  RotateCcw,
  Share2,
  Sparkles,
  UserCog,
} from "lucide-react";
import { Movie, PERSONA_LIST, PERSONAS, PersonaId } from "@/lib/personas";
import { formatReadableDate, PlayerStats } from "@/lib/gameStats";
import MidnightCountdown from "./MidnightCountdown";

export type CensorRating = "U" | "U/A" | "A" | "S" | "BANNED";

export interface AuditEntry {
  questionNumber: number;
  question: string;
  liars: PersonaId[];
  caughtLiar?: PersonaId;
}

interface VerdictCardProps {
  outcome: "won" | "lost";
  movie: Movie;
  activeDateKey: string;
  stats: PlayerStats;
  gajalaLieReels: number[];
  questionsUsed: number;
  maxQuestions: number;
  finalRating: CensorRating;
  wrongGuess?: string;
  lossReason?: string;
  auditLog: AuditEntry[];
  onPlayAgain: () => void;
  onReturnSplash: () => void;
  onOpenCalendar: () => void;
  onOpenStats: () => void;
}

export default function VerdictCard({
  outcome,
  movie,
  activeDateKey,
  stats,
  gajalaLieReels,
  questionsUsed,
  maxQuestions,
  finalRating,
  wrongGuess,
  lossReason,
  auditLog,
  onPlayAgain,
  onReturnSplash,
  onOpenCalendar,
  onOpenStats,
}: VerdictCardProps) {
  const [copied, setCopied] = useState(false);

  const isWin = outcome === "won";
  const statusLabel = isWin ? "U/A BLOCKBUSTER" : "BANNED UTTER FLOP";
  const totalLiesTold = auditLog.reduce((sum, a) => sum + a.liars.length, 0);
  const readableDate = formatReadableDate(activeDateKey);
  const winRate =
    stats.gamesPlayed > 0
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
      : 0;

  const buildShareText = () => {
    const reelBar = auditLog
      .map((entry) => {
        if (entry.caughtLiar) return "🚨";
        return entry.liars.length > 0 ? "🤥" : "🎞️";
      })
      .join("");

    const remainingReels = Math.max(0, maxQuestions - auditLog.length);
    const unusedBar = "⬜".repeat(remainingReels);

    return [
      `🎬 Katha, Screenplay, Abaddam: Meere!`,
      `📅 Case: ${readableDate}`,
      `${isWin ? "✅" : "🚫"} Verdict: ${statusLabel} (${finalRating})`,
      `👥 Bench: Relangi • Gajala • Kill Bill Pandey`,
      `🎞️ Reels Used: ${questionsUsed}/${maxQuestions} | Panel Lies: ${totalLiesTold}`,
      `🔥 Streak: ${stats.currentStreak} | Win Rate: ${winRate}%`,
      `${reelBar}${unusedBar}`,
      `Play now 👉 https://katha-screenplay-abaddam.vercel.app`,
    ].join("\n");
  };

  const handleCopyScorecard = async () => {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2600);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start sm:items-center justify-center p-2.5 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-2xl my-auto max-h-[94dvh] overflow-y-auto cbfc-paper cbfc-frame text-censor-ink rounded-sm p-4 sm:p-7 md:p-8 relative animate-fade-up">
        {/* Vintage Newspaper / CBFC Gazette Masthead */}
        <div className="border-b-2 border-censor-ink pb-3 text-center">
          <p className="font-typewriter text-[10px] sm:text-xs uppercase tracking-[0.22em] text-censor-ink/70">
            THE HYDERABAD CENSOR GAZETTE • CASE DATE: {readableDate}
          </p>
          <h2 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-censor-ink mt-1 uppercase">
            Katha, Screenplay, Abaddam: Meere!
          </h2>
          <p className="font-telugu text-xs sm:text-sm font-bold text-censor-crimson mt-0.5">
            సెన్సార్ బోర్డ్ తుది తీర్పు • FINAL PANEL REPORT
          </p>
        </div>

        {/* Verdict Status Stamp Banner */}
        <div className="my-5 flex flex-col items-center justify-center text-center">
          <div
            className={`animate-stamp-slam rubber-stamp border-[5px] px-5 sm:px-8 py-2.5 shadow-md ${
              isWin
                ? "border-censor-teal text-censor-teal bg-emerald-950/[0.06]"
                : "border-censor-red text-censor-red bg-censor-red/[0.08]"
            }`}
          >
            <div className="font-typewriter text-[10px] sm:text-xs font-bold tracking-[0.24em]">
              {isWin ? "CERTIFIED HIT • CLEARED" : "PROHIBITED EXHIBITION"}
            </div>
            <div className="font-display font-black text-2xl sm:text-4xl tracking-wider mt-0.5">
              {statusLabel}
            </div>
          </div>

          {!isWin && (wrongGuess || lossReason) && (
            <p className="mt-3 font-typewriter text-xs text-censor-crimson bg-censor-crimson/10 border border-censor-crimson/30 px-3 py-1.5 rounded-sm">
              {wrongGuess
                ? `Your Verdict: "${wrongGuess}" — Incorrect Film Identified!`
                : lossReason}
            </p>
          )}
        </div>

        {/* Secret Film Dossier Reveal */}
        <div className="border-2 border-censor-ink/70 bg-parchment-50/80 p-4 rounded-sm mb-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-censor-ink/30 pb-2 mb-3">
            <div>
              <span className="font-typewriter text-[10px] uppercase tracking-widest text-censor-ink/65 block">
                Classified Telugu Film Revealed
              </span>
              <h3 className="font-display font-black text-xl sm:text-2xl text-censor-ink">
                {movie.title}{" "}
                <span className="font-typewriter text-base font-normal text-censor-ink/70">
                  ({movie.year})
                </span>
              </h3>
            </div>
            <span className="font-typewriter text-[11px] font-bold uppercase px-2.5 py-1 bg-censor-ink text-parchment-100 rounded-[2px]">
              {movie.genre}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-sans text-xs">
            <div>
              <span className="font-typewriter text-[10px] uppercase text-censor-ink/65 block">
                Hero
              </span>
              <strong className="text-censor-ink">{movie.hero}</strong>
            </div>
            <div>
              <span className="font-typewriter text-[10px] uppercase text-censor-ink/65 block">
                Heroine
              </span>
              <strong className="text-censor-ink">{movie.heroine}</strong>
            </div>
            <div>
              <span className="font-typewriter text-[10px] uppercase text-censor-ink/65 block">
                Director
              </span>
              <strong className="text-censor-ink">{movie.director}</strong>
            </div>
            <div>
              <span className="font-typewriter text-[10px] uppercase text-censor-ink/65 block">
                Music
              </span>
              <strong className="text-censor-ink">{movie.music}</strong>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-dashed border-censor-ink/30 flex items-center gap-2 text-xs font-typewriter text-censor-ink/85">
            <Sparkles className="w-4 h-4 text-censor-gold shrink-0" />
            <span>
              <strong>Seized Prop:</strong> {movie.iconicProp}
            </span>
          </div>
        </div>

        {/* Scorecard Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 text-center">
          <div className="border border-censor-ink/50 bg-parchment-200/50 p-2.5 rounded-sm">
            <span className="font-typewriter text-[10px] uppercase text-censor-ink/70 block">
              Reels Used
            </span>
            <span className="font-display font-black text-xl text-censor-ink">
              {questionsUsed}/{maxQuestions}
            </span>
          </div>
          <div className="border border-censor-ink/50 bg-parchment-200/50 p-2.5 rounded-sm">
            <span className="font-typewriter text-[10px] uppercase text-censor-ink/70 block">
              Bench Mode
            </span>
            <span className="font-display font-bold text-sm sm:text-base text-censor-ink leading-tight block mt-0.5">
              3-Witness Panel
            </span>
          </div>
          <div className="border border-censor-ink/50 bg-parchment-200/50 p-2.5 rounded-sm">
            <span className="font-typewriter text-[10px] uppercase text-censor-ink/70 block">
              Final Cert.
            </span>
            <span
              className={`font-display font-black text-xl ${
                finalRating === "BANNED"
                  ? "text-censor-red"
                  : "text-censor-teal"
              }`}
            >
              {finalRating}
            </span>
          </div>
        </div>

        {/* Declassified Panel Lie Rules & Reel Audit */}
        <div className="border border-censor-ink/55 bg-parchment-200/40 p-3.5 rounded-sm mb-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-typewriter text-[11px] font-bold uppercase tracking-wider text-censor-crimson flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              DECLASSIFIED PANEL LIE RULES
            </span>
            <span className="font-typewriter text-[10px] text-censor-ink/70">
              {totalLiesTold} {totalLiesTold === 1 ? "Lie" : "Lies"} Told
            </span>
          </div>
          <ul className="space-y-1 font-sans text-xs text-censor-ink/90 leading-snug">
            {PERSONA_LIST.map((p) => (
              <li key={p.id}>
                <strong>{p.name}:</strong>{" "}
                {p.id === "gajala" && gajalaLieReels.length > 0
                  ? `Secretly rolled random lie reels this game: Reel ${gajalaLieReels
                      .map((r) => `#${r}`)
                      .join(", ")}!`
                  : p.secretRuleDescription}
              </li>
            ))}
          </ul>

          {auditLog.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-censor-ink/25 flex flex-wrap gap-1.5">
              {auditLog.map((entry) => {
                const hasLie = entry.liars.length > 0;
                const liarNames = entry.liars
                  .map((id) => PERSONAS[id].name.split(" ")[0])
                  .join(" & ");
                return (
                  <span
                    key={entry.questionNumber}
                    title={`Q${entry.questionNumber}: ${entry.question}`}
                    className={`font-typewriter text-[10px] font-bold px-2 py-0.5 rounded-[2px] border ${
                      hasLie
                        ? "bg-censor-red/15 border-censor-red/60 text-censor-crimson"
                        : "bg-emerald-900/10 border-emerald-800/40 text-emerald-900"
                    }`}
                  >
                    R#{entry.questionNumber}:{" "}
                    {entry.caughtLiar
                      ? `CAUGHT ${PERSONAS[entry.caughtLiar].name.split(" ")[0].toUpperCase()}!`
                      : hasLie
                      ? `${liarNames.toUpperCase()} LIED`
                      : "ALL TRUTHFUL"}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Compact Officer Service Record Strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border border-censor-ink/45 bg-parchment-50/75 px-3 py-2 rounded-sm font-typewriter text-[11px]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 font-bold text-amber-800">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
              Streak: {stats.currentStreak} (Best: {stats.maxStreak})
            </span>
            <span className="text-censor-ink/80">
              Win Rate: <strong>{winRate}%</strong> ({stats.gamesWon}/
              {stats.gamesPlayed})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenStats}
              className="inline-flex items-center gap-1 underline font-bold text-censor-ink hover:text-censor-crimson"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Full Stats</span>
            </button>
            <button
              type="button"
              onClick={onOpenCalendar}
              className="inline-flex items-center gap-1 underline font-bold text-censor-crimson hover:text-censor-red"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Previous Days</span>
            </button>
          </div>
        </div>

        {/* Share & Replay Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyScorecard}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-censor-ink hover:bg-booth-800 text-parchment-50 font-typewriter font-bold text-xs sm:text-sm tracking-wider uppercase border-2 border-censor-ink shadow-[3px_3px_0px_#991B1B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>COPIED FOR WHATSAPP / X!</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-censor-gold" />
                <Copy className="w-3.5 h-3.5 opacity-80" />
                <span>Copy WhatsApp/X Scorecard</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter font-bold text-xs sm:text-sm tracking-wider uppercase border-2 border-censor-ink transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Replay</span>
          </button>

          <button
            type="button"
            onClick={onReturnSplash}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 bg-parchment-200 hover:bg-parchment-300 text-censor-ink font-typewriter font-bold text-xs tracking-wider uppercase border-2 border-censor-ink transition-colors"
          >
            <UserCog className="w-4 h-4" />
            <span>CBFC Form</span>
          </button>
        </div>

        <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-center font-typewriter text-[10px] text-censor-ink/70 pt-2 border-t border-censor-ink/20">
          <MidnightCountdown compact />
          <span>katha-screenplay-abaddam.vercel.app</span>
        </div>
      </div>
    </div>
  );
}
