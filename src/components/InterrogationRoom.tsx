"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import {
  AlertOctagon,
  ArrowLeft,
  BarChart3,
  Calendar,
  CalendarDays,
  Disc3,
  Film,
  Gavel,
  Lock,
  MessageSquareQuote,
  Mic,
  Newspaper,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  Unlock,
  Users,
  X,
  Zap,
} from "lucide-react";
import { TELUGU_IMDB_CATALOG } from "@/data/teluguCatalog";
import {
  Movie,
  PERSONA_LIST,
  PERSONAS,
  PersonaId,
  pickRandomGajalaLieReels,
  PressHint,
} from "@/lib/personas";
import {
  DailyRecord,
  formatReadableDate,
  getLocalDateKey,
  PlayerStats,
} from "@/lib/gameStats";
import VerdictCard, { AuditEntry, CensorRating } from "./VerdictCard";

export interface CaseFile {
  movieId: string;
  pressHints: PressHint[];
}

const MAX_TOKENS = 8;

interface MovieSuggestion {
  title: string;
  year?: number;
  source: "catalog" | "imdb";
}

interface PersonSuggestion {
  name: string;
  role?: string;
  knownFor?: string;
  source: "catalog" | "imdb" | "tmdb";
}

const LOCAL_CATALOG_FUSE = new Fuse(TELUGU_IMDB_CATALOG, {
  keys: [
    { name: "title", weight: 0.7 },
    { name: "aliases", weight: 0.3 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

const RATING_ORDER: CensorRating[] = ["U", "U/A", "A", "S", "BANNED"];

const RATING_META: Record<
  CensorRating,
  {
    label: string;
    subtitle: string;
    badgeClass: string;
    barClass: string;
    fillPercent: number;
  }
> = {
  U: {
    label: "U",
    subtitle: "Universal Clean Chit • Upgraded!",
    badgeClass:
      "bg-emerald-950 text-emerald-200 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.35)]",
    barClass: "bg-emerald-500",
    fillPercent: 100,
  },
  "U/A": {
    label: "U/A",
    subtitle: "Unrestricted Public Exhibition — Caution",
    badgeClass:
      "bg-parchment-100 text-censor-ink border-censor-gold shadow-[0_0_14px_rgba(212,155,53,0.3)]",
    barClass: "bg-censor-gold",
    fillPercent: 80,
  },
  A: {
    label: "A",
    subtitle: "Adults Only — Danger Zone!",
    badgeClass:
      "bg-orange-950 text-orange-200 border-orange-500 shadow-[0_0_16px_rgba(249,115,22,0.4)]",
    barClass: "bg-orange-500",
    fillPercent: 50,
  },
  S: {
    label: "S",
    subtitle: "Strictly Restricted — Critical Alert!",
    badgeClass:
      "bg-red-950 text-red-200 border-red-500 shadow-[0_0_18px_rgba(239,68,68,0.5)] animate-pulse",
    barClass: "bg-red-600",
    fillPercent: 24,
  },
  BANNED: {
    label: "BANNED",
    subtitle: "BANNED BY CENSOR BOARD",
    badgeClass:
      "bg-censor-red text-parchment-50 border-parchment-100 shadow-[0_0_24px_rgba(220,38,38,0.75)]",
    barClass: "bg-censor-red",
    fillPercent: 0,
  },
};

const TACTICAL_CHIP_POOL = [
  "Brahmanandam (Comedy)",
  "Mahesh Babu (Hero)",
  "Prabhas (Hero)",
  "Allu Arjun (Hero)",
  "Ram Charan (Hero)",
  "Jr NTR (Hero)",
  "Pawan Kalyan (Hero)",
  "Chiranjeevi (Megastar)",
  "Nani (Natural Star)",
  "S.S. Rajamouli (Director)",
  "Trivikram Srinivas (Director)",
  "Sukumar (Director)",
  "Puri Jagannadh (Director)",
  "Devi Sri Prasad (Music)",
  "M.M. Keeravani (Music)",
  "Mani Sharma (Music)",
  "Thaman S (Music)",
  "Samantha (Heroine)",
  "Kajal Aggarwal (Heroine)",
  "Anushka Shetty (Heroine)",
  "Trisha (Heroine)",
  "Sunil (Comedy)",
  "Ali (Comedy)",
  "Prakash Raj (Character)",
  "Rao Ramesh (Character)",
  "Kota Srinivasa Rao (Legend)",
  "2015 or after",
  "2010 or before",
  "2020 or after",
  "Between 2000 and 2012",
  "1990s",
];

// Deterministic daily shuffle seeded ONLY by dateKey (completely independent of the movie!)
function getDailyChipDeck(dateKey: string): string[] {
  let seed = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    seed ^= dateKey.charCodeAt(i);
    seed = Math.imul(seed, 16777619) >>> 0;
  }

  const nextRand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const deck = [...TACTICAL_CHIP_POOL];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

interface PanelStatement {
  personaId: PersonaId;
  reply: string;
  wasLie: boolean;
  claimedAnswer: "YES" | "NO";
}

interface ChatMessage {
  id: string;
  sender: "user" | "witness" | "heckle" | "system";
  personaId?: PersonaId;
  text: string;
  reelNumber?: number;
  wasLie?: boolean;
  isInvalid?: boolean;
  isContradictionBanner?: boolean;
  isObjectionResult?: "caught" | "wrong";
}

interface LastPanelTurn {
  reelNumber: number;
  statements: PanelStatement[];
  heckler?: PersonaId;
}

interface InterrogationRoomProps {
  caseFile: CaseFile;
  activeDateKey: string;
  stats: PlayerStats;
  allMovies?: Movie[];
  onGameComplete: (record: Omit<DailyRecord, "playedAt">) => void;
  onPlayAgain: () => void;
  onReturnSplash: () => void;
  onOpenStats: () => void;
  onOpenCalendar: () => void;
}

function getBaseRatingIndex(tokensLeft: number): number {
  if (tokensLeft >= 6) return 1; // U/A
  if (tokensLeft >= 3) return 2; // A
  if (tokensLeft >= 1) return 3; // S
  return 3;
}

export default function InterrogationRoom({
  caseFile,
  activeDateKey,
  stats,
  onGameComplete,
  onPlayAgain,
  onReturnSplash,
  onOpenStats,
  onOpenCalendar,
}: InterrogationRoomProps) {
  const isTodayCase = activeDateKey === getLocalDateKey();
  const hasRecordedOutcomeRef = useRef<boolean>(false);

  const [tokensLeft, setTokensLeft] = useState<number>(MAX_TOKENS);
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [gajalaLieReels] = useState<number[]>(() => pickRandomGajalaLieReels());
  const [tierOffset, setTierOffset] = useState<number>(0);
  const [objectionUsed, setObjectionUsed] = useState<boolean>(false);
  const [accusePickerOpen, setAccusePickerOpen] = useState<boolean>(false);
  const [aiMode, setAiMode] = useState<"groq" | "gemini" | "simulator" | null>(null);
  const [lastPanelTurn, setLastPanelTurn] = useState<LastPanelTurn | null>(
    null
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "opening-system",
      sender: "system",
      text: `JOINT PANEL CONVENED • Relangi Mavayya, Gajala & Inspector Kill Bill Pandey are all seated together! Everyone can lie unpredictably to confuse you—probe Cast/Crew or Release Years, watch for contradictions, and slam OBJECTION! (ABADDAM!) to catch a liar!`,
    },
    {
      id: "opening-relangi",
      sender: "witness",
      personaId: "relangi",
      text: "Haha babu! Screening room lo ki vachava raa? Manushulu ante ne manchollu raa! Cast, crew, release year edaina adugu—chirunavvuthone cheptha!",
    },
    {
      id: "opening-gajala",
      sender: "witness",
      personaId: "gajala",
      text: "Hello! CEO Gajala from Washington D.C., Sonic Solutions—ignore these amateurs and listen to my corporate KPI facts!",
    },
    {
      id: "opening-pandey",
      sender: "heckle",
      personaId: "pandey",
      text: "FRUSTRATION! Stop bragging about Washington D.C., Gajala—fast ga interrogation start cheyyandi!",
    },
  ]);

  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [usedChips, setUsedChips] = useState<string[]>([]);

  // --- Probe System State (Cast/Crew vs Release Year) ---
  const [probeMode, setProbeMode] = useState<"people" | "year" | "custom">("people");
  const [personQuery, setPersonQuery] = useState<string>("");
  const [personSuggestions, setPersonSuggestions] = useState<PersonSuggestion[]>([]);
  const [personDropdownOpen, setPersonDropdownOpen] = useState<boolean>(false);
  const [personHighlightedIdx, setPersonHighlightedIdx] = useState<number>(-1);
  const [loadingPersonSuggestions, setLoadingPersonSuggestions] = useState<boolean>(false);
  const personSearchRef = useRef<HTMLDivElement>(null);

  const [yearOperator, setYearOperator] = useState<"exact" | "before" | "after">("after");
  const [yearValue, setYearValue] = useState<string>("2015");

  // Press Clippings / Non-Spoiler Hints Column State (unlocks every 2 questions for courtroom relief!)
  const pressHints: PressHint[] = caseFile.pressHints;
  const [submittingVerdict, setSubmittingVerdict] = useState<boolean>(false);

  const [unlockedCluesCount, setUnlockedCluesCount] = useState<number>(0);
  const [newlyUnlockedClipId, setNewlyUnlockedClipId] = useState<string | null>(
    null
  );
  const [mobileHintsOpen, setMobileHintsOpen] = useState<boolean>(false);

  // Modals & Dramatic Overlays
  const [verdictModalOpen, setVerdictModalOpen] = useState<boolean>(false);
  const [guessInput, setGuessInput] = useState<string>("");
  const [guessError, setGuessError] = useState<string>("");
  const [movieSuggestions, setMovieSuggestions] = useState<MovieSuggestion[]>(
    []
  );
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  const [objectionBanner, setObjectionBanner] = useState<{
    status: "caught" | "wrong";
    headline: string;
    subtext: string;
  } | null>(null);

  const [bannedSlamActive, setBannedSlamActive] = useState<boolean>(false);
  const [screenShake, setScreenShake] = useState<boolean>(false);

  const [gameOutcome, setGameOutcome] = useState<{
    status: "won" | "lost";
    revealedMovie: Movie;
    wrongGuess?: string;
    lossReason?: string;
    showCard: boolean;
  } | null>(null);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Live IMDb + 180+ Telugu catalog autocomplete inside Final Verdict modal
  useEffect(() => {
    if (!verdictModalOpen) return;
    const q = guessInput.trim();
    if (q.length < 2) {
      setMovieSuggestions([]);
      setHighlightedIdx(-1);
      setLoadingSuggestions(false);
      return;
    }

    // 1. Instant 0ms local fuzzy matches
    const instantLocal: MovieSuggestion[] = LOCAL_CATALOG_FUSE.search(q, {
      limit: 6,
    }).map((r) => ({
      title: r.item.title,
      year: r.item.year,
      source: "catalog",
    }));
    setMovieSuggestions(instantLocal);
    setHighlightedIdx(-1);

    // 2. Debounced live IMDb suggestion enrichment
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/suggest-movies?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: MovieSuggestion[] };
        if (data.suggestions && data.suggestions.length > 0) {
          setMovieSuggestions(data.suggestions);
        }
      } catch {
        // Keep instant local suggestions on abort or offline
      } finally {
        setLoadingSuggestions(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [guessInput, verdictModalOpen]);

  // Live IMDb + Telugu Catalog people autocomplete for Cast/Crew probe
  useEffect(() => {
    const q = personQuery.trim();
    if (q.length < 2) {
      setPersonSuggestions([]);
      setPersonHighlightedIdx(-1);
      setLoadingPersonSuggestions(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingPersonSuggestions(true);
      try {
        const res = await fetch(
          `/api/suggest-people?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions?: PersonSuggestion[] };
        if (data.suggestions) {
          setPersonSuggestions(data.suggestions);
        }
      } catch {
        // Ignore aborted fetches
      } finally {
        setLoadingPersonSuggestions(false);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [personQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        personSearchRef.current &&
        !personSearchRef.current.contains(e.target as Node)
      ) {
        setPersonDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentRating: CensorRating = useMemo(() => {
    if (gameOutcome?.status === "lost" || bannedSlamActive) {
      return "BANNED";
    }
    const baseIdx = getBaseRatingIndex(tokensLeft);
    const adjustedIdx = Math.max(0, Math.min(3, baseIdx + tierOffset));
    return RATING_ORDER[adjustedIdx];
  }, [tokensLeft, tierOffset, gameOutcome, bannedSlamActive]);

  const ratingInfo = RATING_META[currentRating];

  const dailyChipDeck = useMemo(
    () => getDailyChipDeck(activeDateKey),
    [activeDateKey]
  );

  const activeChips = useMemo(() => {
    return dailyChipDeck.filter((chip) => !usedChips.includes(chip)).slice(
      0,
      3
    );
  }, [dailyChipDeck, usedChips]);

  const unlockedHintsCount = useMemo(
    () => Math.min(pressHints.length, unlockedCluesCount),
    [pressHints.length, unlockedCluesCount]
  );

  const canObject =
    !objectionUsed && !isLoading && !gameOutcome && lastPanelTurn !== null;

  const canAskQuestion = !isLoading && !gameOutcome && tokensLeft > 0;

  const triggerShake = () => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 450);
  };

  const recordOutcomeOnce = (
    outcome: "won" | "lost",
    finalRating: CensorRating,
    revealedMovie: Movie
  ) => {
    if (hasRecordedOutcomeRef.current) return;
    hasRecordedOutcomeRef.current = true;
    onGameComplete({
      dateKey: activeDateKey,
      movieId: revealedMovie.id,
      movieTitle: revealedMovie.title,
      outcome,
      questionsUsed: questionCount,
      personaId: "panel",
      finalRating,
      liesCaught: auditLog.filter((a) => Boolean(a.caughtLiar)).length,
    });
  };

  const fetchServerVerdict = async (payload: {
    guess?: string;
    surrender?: boolean;
  }): Promise<{ isCorrect: boolean; movie: Movie }> => {
    const res = await fetch("/api/verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: caseFile.movieId,
        ...payload,
      }),
    });
    if (!res.ok) {
      throw new Error("Verdict check failed");
    }
    return (await res.json()) as { isCorrect: boolean; movie: Movie };
  };

  const triggerBannedLoss = async (options: {
    wrongGuess?: string;
    lossReason?: string;
    revealedMovie?: Movie;
  }) => {
    setVerdictModalOpen(false);
    setAccusePickerOpen(false);
    setBannedSlamActive(true);
    triggerShake();

    let revealed = options.revealedMovie;
    if (!revealed) {
      try {
        const res = await fetchServerVerdict({ surrender: true });
        revealed = res.movie;
      } catch {
        revealed = {
          id: caseFile.movieId,
          title: "Classified Film",
          alternateSpellings: [],
          year: 0,
          hero: "—",
          heroine: "—",
          director: "—",
          music: "—",
          genre: "Telugu Cinema",
          tropes: [],
          iconicProp: "—",
          hint: "—",
        };
      }
    }

    recordOutcomeOnce("lost", "BANNED", revealed);
    setGameOutcome({
      status: "lost",
      revealedMovie: revealed,
      wrongGuess: options.wrongGuess,
      lossReason: options.lossReason,
      showCard: false,
    });
    setTimeout(() => {
      setBannedSlamActive(false);
      setGameOutcome((prev) => (prev ? { ...prev, showCard: true } : null));
    }, 1250);
  };

  const handleProbePerson = (personName: string) => {
    const clean = personName.trim();
    if (!clean || !canAskQuestion) return;
    setPersonDropdownOpen(false);
    setPersonQuery("");
    setPersonHighlightedIdx(-1);
    handleAskQuestion(`Cast/Crew: ${clean}`);
  };

  const handleProbeYear = (operator: "exact" | "before" | "after", year: string) => {
    const yr = year.trim();
    if (!yr || !canAskQuestion) return;
    let query = "";
    if (operator === "before") {
      query = `Release Year: ${yr} or before`;
    } else if (operator === "after") {
      query = `Release Year: ${yr} or after`;
    } else {
      query = `Release Year: ${yr}`;
    }
    handleAskQuestion(query);
  };

  const handleAskQuestion = async (rawQuestion: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || !canAskQuestion) return;

    const nextQuestionNum = questionCount + 1;
    const nextTokens = Math.max(0, tokensLeft - 1);
    const userMsgId = `user-${Date.now()}`;

    setInput("");
    setAccusePickerOpen(false);
    setQuestionCount(nextQuestionNum);
    setTokensLeft(nextTokens);
    setIsLoading(true);

    if (TACTICAL_CHIP_POOL.includes(trimmed)) {
      setUsedChips((prev) =>
        prev.includes(trimmed) ? prev : [...prev, trimmed]
      );
    }

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: trimmed,
      reelNumber: nextQuestionNum,
    };

    setMessages((prev) => [...prev, userMsg]);

    try {
      const historyPayload = messages
        .filter(
          (m) =>
            (m.sender === "user" || m.sender === "witness") && !m.isInvalid
        )
        .map((m) => ({
          role: m.sender === "user" ? "user" : "witness",
          speaker: m.personaId,
          text: m.text,
        }));

      const res = await fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: caseFile.movieId,
          personaId: "panel",
          question: trimmed,
          questionNumber: nextQuestionNum,
          gajalaLieReels,
          history: historyPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Interrogation failed");
      }

      if (data.mode === "groq" || data.mode === "gemini" || data.mode === "simulator") {
        setAiMode(data.mode);
      }

      // Gibberish / non-movie input -> refund reel, zero clues unlocked!
      if (data.invalidQuestion) {
        setTokensLeft((prev) => Math.min(MAX_TOKENS, prev + 1));
        setQuestionCount((prev) => Math.max(0, prev - 1));
        const roasterId: PersonaId = data.roast?.personaId ?? "gajala";
        const roastReply: string = data.roast?.reply ?? data.reply;

        setMessages((prev) => [
          ...prev.map((m) =>
            m.id === userMsgId
              ? { ...m, reelNumber: undefined, isInvalid: true }
              : m
          ),
          {
            id: `witness-invalid-${Date.now()}`,
            sender: "witness",
            personaId: roasterId,
            text: roastReply,
            isInvalid: true,
          },
        ]);
        return;
      }

      const statements: PanelStatement[] = data.statements ?? [];
      const heckle: { personaId: PersonaId; text: string } | undefined =
        data.heckle;

      setLastPanelTurn({
        reelNumber: nextQuestionNum,
        statements,
        heckler: heckle?.personaId,
      });

      const newMessages: ChatMessage[] = statements.map((stmt, idx) => ({
        id: `witness-${Date.now()}-${idx}`,
        sender: "witness",
        personaId: stmt.personaId,
        text: stmt.reply,
        reelNumber: nextQuestionNum,
        wasLie: Boolean(stmt.wasLie),
      }));

      if (heckle?.text) {
        newMessages.push({
          id: `heckle-${Date.now() + 5}`,
          sender: "heckle",
          personaId: heckle.personaId,
          text: heckle.text,
          reelNumber: nextQuestionNum,
        });
      }

      if (data.hasContradiction) {
        newMessages.push({
          id: `contradiction-${Date.now() + 8}`,
          sender: "system",
          isContradictionBanner: true,
          text: `PANEL CONTRADICTION ON REEL #${nextQuestionNum}! The witnesses just gave opposite answers — ONE OF THEM IS LYING! Use OBJECTION! (ABADDAM!) to accuse the liar.`,
        });
      }

      // Release 1 clue for every 2 questions (Reel #2, #4, #6, #8) as courtroom relief!
      const targetClueCount = Math.min(
        pressHints.length,
        nextTokens === 0 ? 5 : Math.floor(nextQuestionNum / 2)
      );

      if (targetClueCount > unlockedCluesCount) {
        const newlyOpenedIdx = unlockedCluesCount;
        const unlockedClip = pressHints[newlyOpenedIdx];
        setUnlockedCluesCount(targetClueCount);

        if (unlockedClip) {
          setNewlyUnlockedClipId(unlockedClip.id);
          setTimeout(() => setNewlyUnlockedClipId(null), 3500);

          newMessages.push({
            id: `clue-unlock-${Date.now() + 10}`,
            sender: "system",
            text: `🔓 COURTROOM RELIEF • CLUE #${newlyOpenedIdx + 1} UNLOCKED (Reel #${nextQuestionNum})! Press Clipping "${unlockedClip.category}" is now available in your Case File hints column.`,
          });
        }
      }

      if (nextTokens === 0) {
        newMessages.push({
          id: `final-warning-${Date.now() + 12}`,
          sender: "system",
          text: "ALL 8 FILM REELS EXHAUSTED! Slam 'DECLARE FINAL VERDICT' to name the movie now—or call 'OBJECTION!' if you caught a liar on Reel #8!",
        });
      }

      setMessages((prev) => [...prev, ...newMessages]);
      setAuditLog((prev) => [
        ...prev,
        {
          questionNumber: nextQuestionNum,
          question: trimmed,
          liars: statements.filter((s) => s.wasLie).map((s) => s.personaId),
        },
      ]);
    } catch {
      setTokensLeft((prev) => Math.min(MAX_TOKENS, prev + 1));
      setQuestionCount((prev) => Math.max(0, prev - 1));
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "system",
          text: "Projector reel jammed! Your token was refunded—please ask your question again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccuseWitness = (accusedId: PersonaId) => {
    if (!canObject || !lastPanelTurn) return;

    const targetStatement = lastPanelTurn.statements.find(
      (s) => s.personaId === accusedId
    );
    if (!targetStatement) return;

    const accusedPersona = PERSONAS[accusedId];

    setObjectionUsed(true);
    setAccusePickerOpen(false);
    triggerShake();

    const prevRatingIdx = RATING_ORDER.indexOf(currentRating);

    if (targetStatement.wasLie) {
      // CAUGHT THE EXACT LIAR!
      const refundedTokens = Math.min(MAX_TOKENS, tokensLeft + 2);
      const targetRatingIdx = Math.max(0, prevRatingIdx - 1);
      const newBaseIdx = getBaseRatingIndex(refundedTokens);
      const requiredOffset = targetRatingIdx - newBaseIdx;

      setTokensLeft(refundedTokens);
      setTierOffset(requiredOffset);

      const caughtLine =
        accusedPersona.objectionCaughtLines[
          questionCount % accusedPersona.objectionCaughtLines.length
        ];

      setAuditLog((prev) =>
        prev.map((entry) =>
          entry.questionNumber === lastPanelTurn.reelNumber
            ? { ...entry, caughtLiar: accusedId }
            : entry
        )
      );

      setObjectionBanner({
        status: "caught",
        headline: `${accusedPersona.name.toUpperCase()} CAUGHT LYING!`,
        subtext: `అబద్ధం! +2 FILM REELS REFUNDED • CERT UPGRADED TO ${RATING_ORDER[targetRatingIdx]}`,
      });

      // Bonus clue unlock as court reward for exposing a liar!
      setUnlockedCluesCount((prev) => {
        const nextCount = Math.min(pressHints.length, prev + 1);
        if (nextCount > prev && pressHints[prev]) {
          const bonusClip = pressHints[prev];
          setNewlyUnlockedClipId(bonusClip.id);
          setTimeout(() => setNewlyUnlockedClipId(null), 3500);
        }
        return nextCount;
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `obj-sys-${Date.now()}`,
          sender: "system",
          text: `OBJECTION SUSTAINED! You nailed ${accusedPersona.name} lying on Reel #${lastPanelTurn.reelNumber}! +2 Film Reels refunded & Certificate upgraded to ${RATING_ORDER[targetRatingIdx]}.`,
          isObjectionResult: "caught",
        },
        {
          id: `obj-wit-${Date.now() + 1}`,
          sender: "witness",
          personaId: accusedId,
          text: caughtLine,
          isObjectionResult: "caught",
        },
      ]);

      setTimeout(() => setObjectionBanner(null), 2200);
    } else {
      // ACCUSED AN HONEST WITNESS!
      const penalizedTokens = Math.max(0, tokensLeft - 2);
      const wrongLine =
        accusedPersona.objectionWrongLines[
          questionCount % accusedPersona.objectionWrongLines.length
        ];

      setTokensLeft(penalizedTokens);

      if (penalizedTokens === 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `obj-sys-fail-${Date.now()}`,
            sender: "system",
            text: `OBJECTION OVERRULED! ${accusedPersona.name} was telling the TRUTH on Reel #${lastPanelTurn.reelNumber}! -2 Reels penalty dropped you to 0 reels!`,
            isObjectionResult: "wrong",
          },
          {
            id: `obj-wit-fail-${Date.now() + 1}`,
            sender: "witness",
            personaId: accusedId,
            text: wrongLine,
            isObjectionResult: "wrong",
          },
        ]);

        triggerBannedLoss({
          lossReason: `Falsely accused ${accusedPersona.name} (who told the truth) and lost your remaining reels!`,
        });
        return;
      }

      const targetRatingIdx = Math.min(3, Math.max(2, prevRatingIdx + 1));
      const newBaseIdx = getBaseRatingIndex(penalizedTokens);
      const requiredOffset = targetRatingIdx - newBaseIdx;

      setTierOffset(requiredOffset);

      setObjectionBanner({
        status: "wrong",
        headline: "OBJECTION OVERRULED!",
        subtext: `${accusedPersona.name.toUpperCase()} TOLD THE TRUTH • -2 REELS • DOWNGRADED TO ${RATING_ORDER[targetRatingIdx]}`,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `obj-sys-${Date.now()}`,
          sender: "system",
          text: `OBJECTION OVERRULED! ${accusedPersona.name} told the TRUTH on Reel #${lastPanelTurn.reelNumber}. Penalty: -2 Film Reels & Certificate downgraded to ${RATING_ORDER[targetRatingIdx]}!`,
          isObjectionResult: "wrong",
        },
        {
          id: `obj-wit-${Date.now() + 1}`,
          sender: "witness",
          personaId: accusedId,
          text: wrongLine,
          isObjectionResult: "wrong",
        },
      ]);

      setTimeout(() => setObjectionBanner(null), 2200);
    }
  };

  const handleSubmitVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingVerdict) return;
    const trimmed = guessInput.trim();
    if (trimmed.length < 2) {
      setGuessError("Enter a Telugu movie title before slamming the verdict!");
      return;
    }

    setGuessError("");
    setSubmittingVerdict(true);
    try {
      const verdictRes = await fetchServerVerdict({ guess: trimmed });
      if (verdictRes.isCorrect) {
        setVerdictModalOpen(false);
        recordOutcomeOnce("won", currentRating, verdictRes.movie);
        setGameOutcome({
          status: "won",
          revealedMovie: verdictRes.movie,
          showCard: true,
        });
      } else {
        await triggerBannedLoss({
          wrongGuess: trimmed,
          revealedMovie: verdictRes.movie,
        });
      }
    } catch {
      setGuessError("Could not reach Censor Board verdict desk. Try again!");
    } finally {
      setSubmittingVerdict(false);
    }
  };

  const handleSurrender = () => {
    triggerBannedLoss({
      lossReason: "Walked out of the Censor Screening Room without a verdict!",
    });
  };

  const activeSpeakerIds = new Set(
    lastPanelTurn?.statements.map((s) => s.personaId) ?? []
  );

  const renderHintsColumnContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 border-b border-censor-gold/35 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-censor-gold shrink-0" />
          <div>
            <h2 className="font-typewriter text-xs font-bold uppercase tracking-[0.14em] text-parchment-100">
              Press Clippings &amp; Hype
            </h2>
            <p className="font-sans text-[11px] text-parchment-300/75">
              Courtroom Relief • <strong>1 Clue unlocks every 2 questions</strong>
            </p>
          </div>
        </div>
        <span className="font-typewriter text-[10px] font-bold px-2 py-0.5 rounded-[2px] bg-censor-gold/15 border border-censor-gold/40 text-censor-gold shrink-0">
          {unlockedHintsCount}/{pressHints.length} OPEN
        </span>
      </div>

      <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1">
        {pressHints.map((hint, idx) => {
          const isUnlocked = idx < unlockedCluesCount;
          const isJustUnlocked = newlyUnlockedClipId === hint.id;
          const levelLabel =
            hint.difficulty ??
            (idx === 0
              ? "HARD"
              : idx <= 2
              ? "MEDIUM"
              : idx === 3
              ? "WARM"
              : "EASY");

          const levelBadgeClass =
            levelLabel === "HARD"
              ? "bg-red-900 text-red-100"
              : levelLabel === "MEDIUM"
              ? "bg-amber-800 text-amber-100"
              : levelLabel === "WARM"
              ? "bg-amber-600 text-booth-950"
              : "bg-emerald-800 text-emerald-100";

          return (
            <div
              key={hint.id}
              className={`rounded-sm border transition-all ${
                isUnlocked
                  ? `cbfc-paper text-censor-ink border-2 border-censor-gold/80 p-3.5 shadow-md ${
                      isJustUnlocked
                        ? "ring-2 ring-censor-gold glow-gold animate-fade-up"
                        : ""
                    }`
                  : "bg-booth-950/80 border border-booth-700/60 p-3 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`font-typewriter text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] ${levelBadgeClass}`}
                  >
                    {levelLabel}
                  </span>
                  <span
                    className={`font-typewriter text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-[2px] ${
                      isUnlocked
                        ? "bg-censor-ink text-parchment-100"
                        : "bg-booth-800 text-parchment-300/60"
                    }`}
                  >
                    CLUE #{idx + 1} • {isUnlocked ? hint.category : "SEALED FILE"}
                  </span>
                </div>

                {isUnlocked ? (
                  <Unlock className="w-3.5 h-3.5 text-censor-teal shrink-0" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-parchment-300/45 shrink-0" />
                )}
              </div>

              {isUnlocked ? (
                <div className="animate-fade-up">
                  <h3 className="font-display font-bold text-sm text-censor-ink leading-snug mb-1">
                    {hint.headline}
                  </h3>
                  <p className="font-sans text-xs text-censor-ink/90 leading-relaxed">
                    {hint.body}
                  </p>
                </div>
              ) : (
                <p className="font-typewriter text-[11px] text-parchment-300/60">
                  {idx < 4
                    ? `Sealed • Unlocks at Question #${(idx + 1) * 2}`
                    : "Sealed • Unlocks at Final Reel / Liar Caught"}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2.5 border-t border-booth-700/80 text-[11px] font-sans text-parchment-300/75 leading-relaxed">
        <strong className="font-typewriter text-[10px] uppercase tracking-wider text-censor-gold block mb-0.5">
          How to Beat the 3-Witness Panel:
        </strong>
        Watch for contradictions! When 2 witnesses give opposite answers, slam{" "}
        <strong>OBJECTION!</strong> and accuse the exact liar.
      </div>
    </div>
  );

  return (
    <div
      className={`min-h-[100dvh] w-full screening-room-bg flex flex-col relative overflow-x-hidden ${
        screenShake ? "animate-screen-shake" : ""
      }`}
    >
      {/* TOP BAR: Live Censor Board Certificate Meter + 8 Vintage Film Reels */}
      <header className="sticky top-0 z-30 border-b border-censor-gold/30 bg-booth-950/95 backdrop-blur-md shadow-xl">
        <div className="h-1.5 sm:h-2 sprocket-strip opacity-75" />

        <div className="max-w-7xl mx-auto px-2.5 sm:px-5 py-2 sm:py-3 flex flex-col gap-2 sm:gap-3">
          {/* Row 1: Title, Case Date, Engine Badge, Stats/Calendar & Verdict */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onReturnSplash}
                className="inline-flex items-center justify-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-sm border border-parchment-300/25 bg-booth-800 hover:bg-booth-700 text-parchment-200 font-typewriter text-[11px] uppercase tracking-wider transition-colors shrink-0"
                title="Return to Censor Certificate Splash"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">CBFC Form</span>
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <h1 className="font-display font-extrabold text-xs min-[375px]:text-sm sm:text-base text-parchment-100 truncate tracking-wide">
                    <span className="sm:hidden">KATHA • ABADDAM</span>
                    <span className="hidden sm:inline">
                      KATHA • SCREENPLAY • ABADDAM : MEERE!
                    </span>
                  </h1>
                  {aiMode && (
                    <span
                      className={`font-typewriter text-[8px] sm:text-[9px] uppercase px-1 sm:px-1.5 py-0.5 rounded-[2px] border shrink-0 ${
                        aiMode !== "simulator"
                          ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                          : "bg-booth-800 border-booth-600 text-parchment-300/75"
                      }`}
                    >
                      <span className="sm:hidden">
                        {aiMode !== "simulator" ? "LIVE" : "SIM"}
                      </span>
                      <span className="hidden sm:inline">
                        {aiMode === "groq" ? "GROQ LIVE" : aiMode === "gemini" ? "GEMINI LIVE" : "SIMULATOR MODE"}
                      </span>
                    </span>
                  )}
                </div>
                <p className="font-typewriter text-[9px] sm:text-[10px] text-censor-gold/90 truncate">
                  {isTodayCase ? "DAILY" : "ARCHIVE"} •{" "}
                  {formatReadableDate(activeDateKey)}
                  <span className="hidden min-[400px]:inline">
                    {" "}
                    •{" "}
                    <strong className="text-parchment-50 uppercase">
                      3-WITNESS PANEL
                    </strong>
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 min-[375px]:gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenStats}
                className="inline-flex items-center justify-center gap-1 p-2 sm:px-2.5 sm:py-2 rounded-sm bg-booth-800 hover:bg-booth-700 border border-booth-600 text-parchment-200 font-typewriter text-xs uppercase transition-colors"
                title="Officer Stats"
              >
                <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-censor-gold" />
                <span className="hidden md:inline">Stats</span>
              </button>

              <button
                type="button"
                onClick={onOpenCalendar}
                className="inline-flex items-center justify-center gap-1 p-2 sm:px-2.5 sm:py-2 rounded-sm bg-booth-800 hover:bg-booth-700 border border-booth-600 text-parchment-200 font-typewriter text-xs uppercase transition-colors"
                title="Previous Days Calendar"
              >
                <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-censor-gold" />
                <span className="hidden md:inline">Archive</span>
              </button>

              <button
                type="button"
                onClick={() => setMobileHintsOpen(true)}
                className="lg:hidden inline-flex items-center gap-1 px-2 min-[375px]:px-2.5 py-2 rounded-sm bg-booth-800 hover:bg-booth-700 border border-censor-gold/55 text-parchment-100 font-typewriter font-bold text-[10px] min-[375px]:text-xs uppercase tracking-wider"
                title="Open Non-Spoiler Press Clippings"
              >
                <Newspaper className="w-3.5 h-3.5 text-censor-gold shrink-0" />
                <span>
                  {unlockedHintsCount}/{pressHints.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setGuessError("");
                  setVerdictModalOpen(true);
                }}
                disabled={Boolean(gameOutcome)}
                className="hidden sm:inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-sm bg-censor-gold hover:bg-amber-400 text-booth-950 font-typewriter font-bold text-xs uppercase tracking-wider shadow-[0_0_16px_rgba(212,155,53,0.35)] transition-all disabled:opacity-40"
              >
                <Gavel className="w-4 h-4" />
                <span>Final Verdict</span>
              </button>
            </div>
          </div>

          {/* Row 2: Live Censor Certificate Health Bar + 8 Vintage Film Reels */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3 items-center bg-gradient-to-r from-booth-900/95 via-booth-850/95 to-booth-900/95 border border-censor-gold/30 rounded-sm p-2 sm:p-2.5 shadow-md">
            <div className="md:col-span-6 flex items-center gap-2.5 sm:gap-3">
              <div
                className={`min-w-[48px] sm:min-w-[60px] px-2 py-1 text-center border-2 rounded-[2px] font-display font-black text-base sm:text-xl leading-none transition-all duration-300 shadow-sm ${ratingInfo.badgeClass}`}
              >
                {ratingInfo.label}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-typewriter text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-censor-gold/90 truncate">
                    Censor Cert. Health
                  </span>
                  <span className="font-typewriter text-[9px] sm:text-[10px] font-semibold text-parchment-300/80 shrink-0">
                    U/A → A → S → BAN
                  </span>
                </div>

                <div className="h-2 w-full bg-booth-950 rounded-full overflow-hidden border border-booth-700/80 shadow-inner">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${ratingInfo.barClass}`}
                    style={{ width: `${ratingInfo.fillPercent}%` }}
                  />
                </div>

                <p className="font-typewriter text-[9px] sm:text-[10px] text-parchment-200/85 mt-0.5 truncate">
                  {ratingInfo.subtitle}
                </p>
              </div>
            </div>

            <div className="md:col-span-6 flex items-center justify-between gap-2 md:border-l md:border-booth-700/80 md:pl-3.5 pt-1.5 md:pt-0 border-t border-booth-700/60 md:border-t-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-typewriter text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-censor-gold/90 hidden min-[400px]:inline">
                  Reels
                </span>
                <span
                  className={`font-typewriter text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-[2px] ${
                    tokensLeft <= 2
                      ? "bg-red-950 text-red-200 border border-red-500/60 glow-crimson"
                      : "bg-booth-800 text-censor-gold border border-censor-gold/40 shadow-sm"
                  }`}
                >
                  {tokensLeft}/{MAX_TOKENS}
                </span>
              </div>

              <div
                className="flex items-center gap-1 min-[375px]:gap-1.5"
                aria-label={`${tokensLeft} of ${MAX_TOKENS} film reels remaining`}
              >
                {Array.from({ length: MAX_TOKENS }).map((_, idx) => {
                  const isActive = idx < tokensLeft;
                  return (
                    <div
                      key={idx}
                      title={
                        isActive
                          ? `Film Reel #${idx + 1} (Available)`
                          : `Film Reel #${idx + 1} (Spent)`
                      }
                      className={`w-6 h-6 min-[375px]:w-7 min-[375px]:h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? "border-censor-gold bg-gradient-to-br from-censor-gold/25 to-amber-950/40 text-censor-gold shadow-[0_0_8px_rgba(212,155,53,0.35)] scale-100"
                          : "border-booth-700/80 bg-booth-950 text-booth-600 opacity-40 scale-90"
                      }`}
                    >
                      <Disc3
                        className={`w-3.5 h-3.5 min-[375px]:w-4 min-[375px]:h-4 ${
                          isActive && isLoading && idx === tokensLeft - 1
                            ? "animate-reel-spin text-amber-300"
                            : ""
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN 2-COLUMN WORKSPACE: 3-Witness Interrogation Bench (Left) + Press Clippings Column (Right) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-2.5 sm:px-5 py-2.5 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 items-stretch">
        {/* LEFT COLUMN (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-2.5 sm:gap-3 min-w-0">
          {/* LIVE 3-WITNESS BENCH BAR (THEATRICAL COURT DESK) */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5">
            {PERSONA_LIST.map((p) => {
              const isOnMic = activeSpeakerIds.has(p.id);
              const isHeckling = lastPanelTurn?.heckler === p.id;
              const shortName =
                p.id === "relangi"
                  ? "Relangi"
                  : p.id === "gajala"
                  ? "Gajala"
                  : "Pandey";

              const podiumClass =
                p.id === "relangi"
                  ? `podium-relangi ${isOnMic ? "active-mic" : ""}`
                  : p.id === "gajala"
                  ? `podium-gajala ${isOnMic ? "active-mic" : ""}`
                  : `podium-pandey ${isOnMic ? "active-mic" : ""}`;

              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 sm:gap-2.5 px-2 py-1.5 sm:px-3 sm:py-2.5 rounded-sm border transition-all duration-300 min-w-0 relative ${podiumClass} ${
                    isOnMic
                      ? "scale-[1.02] shadow-xl z-10"
                      : isHeckling
                      ? "opacity-95"
                      : "opacity-80 hover:opacity-95"
                  }`}
                >
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-sm font-display font-black text-[11px] sm:text-xs flex items-center justify-center text-parchment-50 shrink-0 border shadow-sm transition-transform ${
                      isOnMic ? "scale-110 border-parchment-100 ring-2 ring-censor-gold/50" : "border-parchment-200/30"
                    }`}
                    style={{ backgroundColor: p.accentColor }}
                  >
                    {p.monogram}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-[11px] sm:text-xs text-parchment-100 truncate flex items-center gap-1">
                      <span className="sm:hidden">{shortName}</span>
                      <span className="hidden sm:inline">{p.name}</span>
                    </p>
                    <div className="font-typewriter text-[8px] sm:text-[9px] uppercase tracking-wider flex items-center gap-1 text-parchment-300/80 truncate mt-0.5">
                      {isOnMic ? (
                        <span className="inline-flex items-center gap-1.5 text-censor-gold font-bold">
                          <span className="flex items-end gap-[2px] h-3">
                            <span className="w-0.5 bg-red-500 audio-bar-1" />
                            <span className="w-0.5 bg-amber-400 audio-bar-2" />
                            <span className="w-0.5 bg-red-500 audio-bar-3" />
                          </span>
                          <Mic className="w-2.5 h-2.5 text-censor-gold shrink-0" />
                          <span className="tracking-widest">ON MIC</span>
                        </span>
                      ) : isHeckling ? (
                        <span className="text-amber-300/90 font-bold flex items-center gap-0.5">
                          <span>🗣️</span>
                          <span>HECKLE</span>
                        </span>
                      ) : (
                        <span className="text-parchment-300/50">BENCH</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chat History Container */}
          <div className="flex-1 min-h-[240px] max-h-[48dvh] min-[390px]:max-h-[54dvh] sm:max-h-[58dvh] lg:max-h-[calc(100vh-425px)] overflow-y-auto custom-scrollbar bg-booth-900/80 border border-booth-700/80 rounded-sm p-2.5 sm:p-5 space-y-3 sm:space-y-4 shadow-inner">
            {messages.map((msg) => {
              if (msg.sender === "system") {
                const sysStyle = msg.isContradictionBanner
                  ? "bg-gradient-to-r from-red-950/95 via-amber-950 to-red-950/95 border-2 border-censor-gold text-parchment-50 shadow-[0_0_20px_rgba(212,155,53,0.35)] animate-pulse"
                  : msg.isObjectionResult === "caught"
                  ? "bg-emerald-950/85 border-emerald-500/70 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.25)]"
                  : msg.isObjectionResult === "wrong"
                  ? "bg-red-950/90 border-red-500/80 text-red-100 shadow-[0_0_16px_rgba(239,68,68,0.3)]"
                  : "bg-booth-800/90 border border-censor-gold/40 text-parchment-200";

                return (
                  <div
                    key={msg.id}
                    className={`mx-auto max-w-2xl text-center border px-4 py-2.5 rounded-sm font-typewriter text-[11px] sm:text-xs leading-relaxed animate-fade-up flex items-center justify-center gap-2.5 ${sysStyle}`}
                  >
                    {msg.isContradictionBanner && (
                      <Zap className="w-4 h-4 text-censor-gold shrink-0 animate-bounce" />
                    )}
                    <span className="font-medium">{msg.text}</span>
                  </div>
                );
              }

              if (msg.sender === "user") {
                return (
                  <div
                    key={msg.id}
                    className="flex justify-end items-end gap-2.5 animate-fade-up"
                  >
                    <div className="max-w-[85%] sm:max-w-[78%]">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <span className="font-typewriter text-[10px] uppercase font-bold tracking-wider text-censor-gold/90">
                          {msg.isInvalid
                            ? "Invalid Query • Reel Refunded"
                            : `Censor Officer Query • Reel #${msg.reelNumber}`}
                        </span>
                      </div>
                      <div className="bg-parchment-100 text-censor-ink border-2 border-censor-gold/80 px-4 py-2.5 rounded-sm rounded-br-none shadow-[2px_2px_0px_#261B12] font-sans text-sm font-semibold leading-relaxed">
                        {msg.text.startsWith("Cast/Crew: ") ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 text-[10px] font-typewriter font-black uppercase rounded bg-amber-200 text-amber-950 border border-amber-400">
                              <Users className="w-3 h-3" /> Cast & Crew Probe
                            </span>
                            <p className="text-base font-bold text-booth-950 tracking-wide">
                              {msg.text.replace(/^Cast\/Crew:\s*/, "")}
                            </p>
                          </div>
                        ) : msg.text.startsWith("Release Year: ") ? (
                          <div>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 text-[10px] font-typewriter font-black uppercase rounded bg-sky-200 text-sky-950 border border-sky-400">
                              <Calendar className="w-3 h-3" /> Release Year Probe
                            </span>
                            <p className="text-base font-bold text-booth-950 tracking-wide">
                              {msg.text.replace(/^Release Year:\s*/, "")}
                            </p>
                          </div>
                        ) : (
                          msg.text
                        )}
                      </div>
                    </div>
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-sm bg-censor-gold text-booth-950 font-typewriter font-black text-xs flex items-center justify-center shrink-0 border border-parchment-50/50 shadow-md">
                      YOU
                    </div>
                  </div>
                );
              }

              if (msg.sender === "heckle" && msg.personaId) {
                const p = PERSONAS[msg.personaId];
                return (
                  <div
                    key={msg.id}
                    className="flex items-center gap-2 pl-6 sm:pl-12 animate-fade-up"
                  >
                    <MessageSquareQuote className="w-3.5 h-3.5 text-censor-gold/70 shrink-0" />
                    <div className="bg-booth-950/85 border border-dashed border-censor-gold/40 px-3.5 py-1.5 rounded-sm text-xs font-sans italic text-parchment-200 shadow-sm">
                      <span
                        className="font-typewriter not-italic font-bold text-[10px] uppercase mr-1.5"
                        style={{ color: "#D49B35" }}
                      >
                        {p.name} (Sideline):
                      </span>
                      &ldquo;{msg.text}&rdquo;
                    </div>
                  </div>
                );
              }

              const speakerPersona = PERSONAS[msg.personaId ?? "gajala"];
              const personaBubbleStyle =
                msg.isObjectionResult === "caught"
                  ? "bg-emerald-950/80 border-emerald-500/70 text-emerald-50 border-l-[4px] border-l-emerald-400"
                  : msg.isObjectionResult === "wrong"
                  ? "bg-red-950/80 border-red-500/70 text-red-50 border-l-[4px] border-l-red-400"
                  : msg.personaId === "relangi"
                  ? "bg-gradient-to-r from-amber-950/35 via-booth-800 to-booth-800 border border-amber-500/35 border-l-[4px] border-l-amber-500 text-parchment-50"
                  : msg.personaId === "gajala"
                  ? "bg-gradient-to-r from-sky-950/35 via-booth-800 to-booth-800 border border-sky-400/35 border-l-[4px] border-l-sky-400 text-parchment-50"
                  : msg.personaId === "pandey"
                  ? "bg-gradient-to-r from-red-950/35 via-booth-800 to-booth-800 border border-red-500/35 border-l-[4px] border-l-red-500 text-parchment-50"
                  : "bg-booth-800 border-booth-600 text-parchment-50";

              return (
                <div
                  key={msg.id}
                  className="flex justify-start items-start gap-2.5 sm:gap-3 animate-fade-up"
                >
                  <div
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-sm font-display font-black text-sm flex items-center justify-center text-parchment-50 shrink-0 border-2 border-parchment-200/40 shadow-md mt-3.5"
                    style={{ backgroundColor: speakerPersona.accentColor }}
                    title={speakerPersona.name}
                  >
                    {speakerPersona.monogram}
                  </div>

                  <div className="max-w-[85%] sm:max-w-[80%]">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-display font-bold text-xs sm:text-sm text-parchment-100">
                        {speakerPersona.name}
                      </span>
                      <span
                        className={`font-typewriter text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-[2px] border ${speakerPersona.badgeBg}`}
                      >
                        {msg.isInvalid ? "PANEL ROAST" : "TESTIMONY"}
                      </span>
                      {msg.reelNumber && (
                        <span className="font-typewriter text-[10px] text-parchment-300/70 font-semibold">
                          • Reel #{msg.reelNumber}
                        </span>
                      )}
                    </div>

                    <div
                      className={`px-4 py-3 rounded-sm rounded-tl-none shadow-md font-sans text-sm leading-relaxed ${personaBubbleStyle}`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-3 animate-fade-up">
                <div className="w-9 h-9 rounded-sm bg-booth-800 border border-censor-gold/50 flex items-center justify-center shrink-0">
                  <Film className="w-4 h-4 text-censor-gold animate-spin" />
                </div>
                <div className="bg-booth-800 border border-booth-600 px-4 py-2.5 rounded-sm text-xs font-typewriter text-parchment-300">
                  The 3 witnesses are arguing over the microphone...
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* BOTTOM CONTROLS DOCK */}
          <section className="bg-booth-900/95 border border-booth-700 rounded-sm p-2.5 sm:p-4 pb-safe space-y-2.5 sm:space-y-3 shadow-2xl">
            {/* TARGETED OBJECTION! ACCUSE-THE-LIAR BAR */}
            {accusePickerOpen && lastPanelTurn && !objectionUsed && (
              <div className="bg-red-950/85 border-2 border-red-400 p-3 rounded-sm animate-fade-up">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-typewriter text-xs font-bold uppercase tracking-wider text-red-100 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-red-300" />
                    WHO LIED ON REEL #{lastPanelTurn.reelNumber}? POINT AT THE
                    LIAR:
                  </span>
                  <button
                    type="button"
                    onClick={() => setAccusePickerOpen(false)}
                    className="text-red-200 hover:text-white p-0.5"
                    aria-label="Cancel accusation"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {lastPanelTurn.statements.map((stmt) => {
                    const p = PERSONAS[stmt.personaId];
                    return (
                      <button
                        key={stmt.personaId}
                        type="button"
                        onClick={() => handleAccuseWitness(stmt.personaId)}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-booth-950 hover:bg-censor-crimson border-2 border-red-400/70 hover:border-parchment-100 rounded-sm text-left transition-all group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className="w-7 h-7 rounded-sm font-display font-black text-xs flex items-center justify-center text-parchment-50 shrink-0"
                            style={{ backgroundColor: p.accentColor }}
                          >
                            {p.monogram}
                          </span>
                          <div className="min-w-0">
                            <span className="font-typewriter font-bold text-xs text-parchment-50 uppercase block truncate">
                              Accuse {p.name}
                            </span>
                            <span className="font-sans text-[10px] text-parchment-300/75 block truncate">
                              &ldquo;{stmt.reply.slice(0, 38)}...&rdquo;
                            </span>
                          </div>
                        </div>
                        <span className="font-typewriter text-[10px] font-bold uppercase px-2 py-0.5 bg-red-600 text-white rounded-[2px] shrink-0">
                          LIAR!
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3 Quick-Tap Tactical Question Chips (Swipeable 1-row strip on mobile, wrapped on desktop) */}
            {tokensLeft > 0 && !gameOutcome && activeChips.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-censor-gold" />
                    <span className="font-typewriter text-[9px] sm:text-[10px] uppercase tracking-widest text-parchment-300/80">
                      Quick-Tap Questions
                    </span>
                  </div>
                  <span className="sm:hidden font-typewriter text-[9px] text-parchment-300/50">
                    Swipe →
                  </span>
                </div>
                <div className="flex flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar gap-1.5 sm:gap-2 pb-0.5">
                  {activeChips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      disabled={!canAskQuestion}
                      onClick={() => handleAskQuestion(chip)}
                      className="ticket-chip shrink-0 sm:shrink px-3 py-1.5 rounded-sm bg-gradient-to-r from-booth-800 to-booth-900 hover:from-booth-700 hover:to-booth-800 border border-censor-gold/45 hover:border-censor-gold text-parchment-100 font-sans text-[11px] sm:text-xs transition-all disabled:opacity-40 text-left whitespace-nowrap sm:whitespace-normal shadow-sm"
                    >
                      &ldquo;{chip}&rdquo;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Out-of-reels Final Verdict Prompt */}
            {tokensLeft === 0 && !gameOutcome ? (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-red-950/60 border border-red-500/60 p-3 rounded-sm">
                <div className="text-center sm:text-left">
                  <p className="font-typewriter text-xs font-bold uppercase text-red-200 tracking-wider">
                    0 FILM REELS REMAINING — SUBMIT YOUR FINAL VERDICT!
                  </p>
                  <p className="font-sans text-xs text-red-200/80">
                    Make your guess now, call a last-second OBJECTION!, or
                    surrender.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVerdictModalOpen(true)}
                    className="px-4 py-2 bg-censor-gold hover:bg-amber-400 text-booth-950 font-typewriter font-bold text-xs uppercase tracking-wider rounded-sm flex items-center gap-1.5 shadow-md"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>Guess Movie Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSurrender}
                    className="px-3 py-2 bg-red-900/80 hover:bg-red-800 text-red-100 border border-red-400/50 font-typewriter text-xs uppercase rounded-sm"
                  >
                    Surrender
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Probe Mode Selector */}
                <div className="flex items-center gap-1.5 p-1 bg-booth-950/80 rounded border border-booth-700/80">
                  <button
                    type="button"
                    onClick={() => setProbeMode("people")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-sm font-typewriter text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      probeMode === "people"
                        ? "bg-censor-gold text-booth-950 shadow-md font-black"
                        : "text-parchment-200/70 hover:text-parchment-100 hover:bg-booth-800/80"
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Cast / Crew</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProbeMode("year")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-sm font-typewriter text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      probeMode === "year"
                        ? "bg-censor-gold text-booth-950 shadow-md font-black"
                        : "text-parchment-200/70 hover:text-parchment-100 hover:bg-booth-800/80"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Release Year</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProbeMode("custom")}
                    className={`hidden sm:flex items-center justify-center gap-1 py-1.5 px-2 rounded-sm font-typewriter text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      probeMode === "custom"
                        ? "bg-censor-gold text-booth-950 shadow-md font-black"
                        : "text-parchment-200/50 hover:text-parchment-100 hover:bg-booth-800/80"
                    }`}
                    title="Free-text custom question"
                  >
                    <span>Free Text</span>
                  </button>
                </div>

                {/* Probe Mode 1: Cast / Crew with Live IMDb Autocomplete */}
                {probeMode === "people" && (
                  <div ref={personSearchRef} className="relative">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (
                          personHighlightedIdx >= 0 &&
                          personSuggestions[personHighlightedIdx]
                        ) {
                          handleProbePerson(
                            personSuggestions[personHighlightedIdx].name
                          );
                        } else if (personQuery.trim()) {
                          handleProbePerson(personQuery.trim());
                        }
                      }}
                      className="flex items-stretch gap-2"
                    >
                      <div className="relative flex-1 min-w-0">
                        <input
                          type="text"
                          value={personQuery}
                          onChange={(e) => {
                            setPersonQuery(e.target.value);
                            setPersonDropdownOpen(true);
                          }}
                          onFocus={() => {
                            if (personSuggestions.length > 0)
                              setPersonDropdownOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (
                              !personDropdownOpen ||
                              personSuggestions.length === 0
                            )
                              return;
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setPersonHighlightedIdx((prev) =>
                                prev < personSuggestions.length - 1
                                  ? prev + 1
                                  : 0
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setPersonHighlightedIdx((prev) =>
                                prev > 0
                                  ? prev - 1
                                  : personSuggestions.length - 1
                              );
                            } else if (
                              e.key === "Enter" &&
                              personHighlightedIdx >= 0
                            ) {
                              e.preventDefault();
                              const picked =
                                personSuggestions[personHighlightedIdx];
                              if (picked) {
                                handleProbePerson(picked.name);
                              }
                            } else if (e.key === "Escape") {
                              setPersonDropdownOpen(false);
                            }
                          }}
                          disabled={!canAskQuestion}
                          placeholder="Type Actor, Actress, Director, Music, Comedian (IMDb auto-suggest)..."
                          className="w-full bg-booth-950 border-2 border-booth-600 focus:border-censor-gold focus:outline-none focus:ring-2 focus:ring-censor-gold/40 rounded-sm pl-9 pr-8 py-2.5 text-base sm:text-sm text-parchment-50 placeholder:text-parchment-300/40 disabled:opacity-50 transition-colors shadow-inner"
                        />
                        <Search className="w-4 h-4 text-censor-gold/70 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        {loadingPersonSuggestions && (
                          <Disc3 className="w-4 h-4 text-censor-gold absolute right-3 top-1/2 -translate-y-1/2 animate-spin pointer-events-none" />
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={!canAskQuestion || !personQuery.trim()}
                        className="px-4 sm:px-6 bg-parchment-100 hover:bg-parchment-50 text-censor-ink font-typewriter font-black text-xs sm:text-sm uppercase tracking-wider rounded-sm border-2 border-censor-gold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-[2px_2px_0px_#261B12] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Probe Person</span>
                      </button>
                    </form>

                    {/* Live IMDb / Tollywood Autocomplete Dropdown */}
                    {personDropdownOpen && personSuggestions.length > 0 && (
                      <ul
                        role="listbox"
                        className="absolute bottom-full mb-1.5 left-0 right-0 max-h-56 overflow-y-auto custom-scrollbar bg-booth-900 border-2 border-censor-gold rounded-sm shadow-2xl divide-y divide-booth-700 z-50"
                      >
                        <li className="px-3 py-1.5 bg-booth-950/90 text-[10px] font-typewriter uppercase tracking-widest text-censor-gold flex items-center justify-between">
                          <span>Tollywood & IMDb Verified Names</span>
                          <span className="text-parchment-300/50">
                            Click or Press Enter
                          </span>
                        </li>
                        {personSuggestions.map((item, idx) => {
                          const isActive = idx === personHighlightedIdx;
                          return (
                            <li key={`${item.name}-${idx}`}>
                              <button
                                type="button"
                                onClick={() => handleProbePerson(item.name)}
                                onMouseEnter={() => setPersonHighlightedIdx(idx)}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                                  isActive
                                    ? "bg-censor-gold text-booth-950 font-bold"
                                    : "text-parchment-100 hover:bg-booth-800"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="truncate font-semibold">
                                    {item.name}
                                  </span>
                                  {item.role && (
                                    <span
                                      className={`text-[10px] font-typewriter uppercase px-1.5 py-0.5 rounded ${
                                        isActive
                                          ? "bg-booth-900 text-censor-gold"
                                          : "bg-booth-800 text-parchment-300 border border-booth-700"
                                      }`}
                                    >
                                      {item.role}
                                    </span>
                                  )}
                                </div>
                                <span
                                  className={`text-[9px] font-typewriter uppercase tracking-wider shrink-0 ${
                                    isActive
                                      ? "text-booth-900"
                                      : "text-censor-gold/80"
                                  }`}
                                >
                                  {item.source === "imdb"
                                    ? "IMDb"
                                    : item.source === "tmdb"
                                    ? "TMDB"
                                    : "Tollywood"}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Probe Mode 2: Release Year Operators */}
                {probeMode === "year" && (
                  <div className="space-y-2 bg-booth-950/60 p-2.5 rounded border border-booth-700/80">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Operator Pills */}
                      <div className="flex items-center gap-1 bg-booth-900 p-1 rounded border border-booth-700">
                        <button
                          type="button"
                          onClick={() => setYearOperator("exact")}
                          className={`flex-1 sm:flex-none px-2.5 py-1 text-[11px] font-typewriter font-bold uppercase rounded-sm transition-all cursor-pointer ${
                            yearOperator === "exact"
                              ? "bg-censor-gold text-booth-950"
                              : "text-parchment-200/70 hover:text-parchment-100"
                          }`}
                        >
                          Exact Year
                        </button>
                        <button
                          type="button"
                          onClick={() => setYearOperator("before")}
                          className={`flex-1 sm:flex-none px-2.5 py-1 text-[11px] font-typewriter font-bold uppercase rounded-sm transition-all cursor-pointer ${
                            yearOperator === "before"
                              ? "bg-censor-gold text-booth-950"
                              : "text-parchment-200/70 hover:text-parchment-100"
                          }`}
                        >
                          ≤ On or Before
                        </button>
                        <button
                          type="button"
                          onClick={() => setYearOperator("after")}
                          className={`flex-1 sm:flex-none px-2.5 py-1 text-[11px] font-typewriter font-bold uppercase rounded-sm transition-all cursor-pointer ${
                            yearOperator === "after"
                              ? "bg-censor-gold text-booth-950"
                              : "text-parchment-200/70 hover:text-parchment-100"
                          }`}
                        >
                          ≥ On or After
                        </button>
                      </div>

                      {/* Year input + Action */}
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="number"
                          min="1950"
                          max="2026"
                          value={yearValue}
                          onChange={(e) => setYearValue(e.target.value)}
                          disabled={!canAskQuestion}
                          className="w-24 sm:w-28 bg-booth-950 border-2 border-booth-600 focus:border-censor-gold focus:outline-none rounded-sm px-3 py-1.5 text-center font-typewriter font-bold text-sm text-parchment-50 shadow-inner"
                        />

                        <button
                          type="button"
                          disabled={!canAskQuestion || !yearValue.trim()}
                          onClick={() => handleProbeYear(yearOperator, yearValue)}
                          className="flex-1 py-2 px-4 bg-parchment-100 hover:bg-parchment-50 text-censor-ink font-typewriter font-black text-xs uppercase tracking-wider rounded-sm border-2 border-censor-gold inline-flex items-center justify-center gap-2 shadow-[2px_2px_0px_#261B12] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40 cursor-pointer"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>
                            Probe &ldquo;{yearValue}{" "}
                            {yearOperator === "before"
                              ? "or before"
                              : yearOperator === "after"
                              ? "or after"
                              : ""}
                            &rdquo;
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Quick Decade Selector */}
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                      <span className="font-typewriter text-[9px] uppercase tracking-wider text-parchment-300/60 shrink-0">
                        Quick Year:
                      </span>
                      {["2024", "2020", "2015", "2010", "2005", "2000", "1995"].map(
                        (yr) => (
                          <button
                            key={yr}
                            type="button"
                            onClick={() => {
                              setYearValue(yr);
                              handleProbeYear(yearOperator, yr);
                            }}
                            disabled={!canAskQuestion}
                            className="px-2 py-0.5 rounded bg-booth-800 hover:bg-booth-700 border border-censor-gold/30 hover:border-censor-gold text-parchment-200 font-typewriter text-[10px] shrink-0 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {yr}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Probe Mode 3: Custom Free Text */}
                {probeMode === "custom" && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAskQuestion(input);
                    }}
                    className="flex items-stretch gap-2"
                  >
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={!canAskQuestion}
                      placeholder="Type custom question (e.g. awards, producer, remake)..."
                      className="flex-1 min-w-0 bg-booth-950 border-2 border-booth-600 focus:border-censor-gold focus:outline-none focus:ring-2 focus:ring-censor-gold/40 rounded-sm px-3.5 py-2.5 text-base sm:text-sm text-parchment-50 placeholder:text-parchment-300/40 disabled:opacity-50 transition-colors shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!canAskQuestion || !input.trim()}
                      className="px-4 sm:px-6 bg-parchment-100 hover:bg-parchment-50 text-censor-ink font-typewriter font-black text-xs sm:text-sm uppercase tracking-wider rounded-sm border-2 border-censor-gold inline-flex items-center justify-center gap-1.5 sm:gap-2 shadow-[2px_2px_0px_#261B12] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Ask</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Action Row: OBJECTION! (ABADDAM!) & DECLARE FINAL VERDICT */}
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-between gap-2 sm:gap-2.5 pt-2 border-t border-booth-700/80">
              <button
                type="button"
                onClick={() => setAccusePickerOpen((prev) => !prev)}
                disabled={!canObject}
                className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-sm font-typewriter font-black text-[11px] min-[375px]:text-xs sm:text-sm uppercase tracking-wider border transition-all ${
                  canObject
                    ? "arcade-buzzer text-parchment-50 border-red-400 cursor-pointer"
                    : "bg-booth-800 text-parchment-300/40 border-booth-700 cursor-not-allowed"
                }`}
              >
                <AlertOctagon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span className="sm:hidden">OBJECTION!</span>
                <span className="hidden sm:inline">OBJECTION! (ABADDAM!)</span>
                <span className="px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] rounded-[2px] bg-black/40 text-parchment-200 shrink-0 font-bold">
                  {objectionUsed ? "0" : "1"}
                </span>
              </button>

              <div className="flex items-center justify-end gap-2.5">
                <span className="font-typewriter text-[10px] text-parchment-300/70 hidden xl:inline">
                  Accuse liar = +2 Reels &amp; Upgrade • Wrong = -2 Reels &amp;
                  Downgrade
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setGuessError("");
                    setVerdictModalOpen(true);
                  }}
                  disabled={Boolean(gameOutcome)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 rounded-sm verdict-button text-booth-950 border border-amber-300/80 font-typewriter font-black text-[11px] min-[375px]:text-xs sm:text-sm uppercase tracking-wider transition-all disabled:opacity-40 cursor-pointer"
                >
                  <Gavel className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="sm:hidden">Final Verdict</span>
                  <span className="hidden sm:inline">Declare Final Verdict</span>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4 cols on Desktop): Dedicated Non-Spoiler Press Clippings & Hype Hints Column */}
        <aside className="hidden lg:flex lg:col-span-4 flex-col bg-booth-900/80 border border-booth-700 rounded-sm p-4 max-h-[calc(100vh-195px)] shadow-xl">
          {renderHintsColumnContent()}
        </aside>
      </main>

      {/* MOBILE / TABLET PRESS HINTS DRAWER */}
      {mobileHintsOpen && (
        <div className="fixed inset-0 z-40 lg:hidden bg-black/75 backdrop-blur-sm flex justify-end">
          <div className="w-[92vw] max-w-sm h-[100dvh] bg-booth-900 border-l border-censor-gold/40 p-3.5 sm:p-4 pb-safe flex flex-col relative shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileHintsOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-sm bg-booth-800 hover:bg-booth-700 text-parchment-100 z-10"
              aria-label="Close Press Clippings drawer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="pt-1 h-full overflow-hidden">
              {renderHintsColumnContent()}
            </div>
          </div>
        </div>
      )}

      {/* OBJECTION! DRAMATIC FLASH OVERLAY */}
      {objectionBanner && (
        <div className="fixed inset-0 z-40 pointer-events-none flex items-center justify-center bg-black/45 backdrop-blur-[1px] p-4">
          <div
            className={`animate-stamp-slam rubber-stamp border-[5px] sm:border-[6px] px-4 sm:px-10 py-4 sm:py-5 text-center shadow-2xl max-w-[92vw] sm:max-w-lg ${
              objectionBanner.status === "caught"
                ? "border-emerald-400 bg-emerald-950/95 text-emerald-100"
                : "border-red-500 bg-red-950/95 text-red-100"
            }`}
          >
            <div className="font-display font-black text-xl min-[375px]:text-2xl sm:text-4xl tracking-wider">
              {objectionBanner.headline}
            </div>
            <div className="font-typewriter text-[11px] sm:text-sm font-bold tracking-wider sm:tracking-widest mt-2">
              {objectionBanner.subtext}
            </div>
          </div>
        </div>
      )}

      {/* GIANT RED "BANNED BY CENSOR BOARD" FULL-SCREEN SLAM */}
      {bannedSlamActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="animate-stamp-slam rubber-stamp border-[6px] sm:border-[8px] border-censor-red bg-parchment-50/95 text-censor-red px-5 sm:px-12 py-5 sm:py-8 text-center shadow-[0_0_80px_rgba(220,38,38,0.75)] max-w-[92vw]">
            <div className="font-typewriter text-[10px] sm:text-sm font-bold tracking-[0.2em] sm:tracking-[0.28em]">
              CENTRAL BOARD OF FILM CERTIFICATION
            </div>
            <div className="font-display font-black text-2xl min-[375px]:text-3xl sm:text-5xl md:text-6xl tracking-wider mt-1 leading-none">
              BANNED BY
              <br />
              CENSOR BOARD
            </div>
            <div className="font-telugu text-sm sm:text-xl font-extrabold mt-2">
              సెన్సార్ బోర్డ్ నిషేధం • UTTER FLOP!
            </div>
          </div>
        </div>
      )}

      {/* FINAL VERDICT MODAL / DRAWER (FUZZY MATCHING VIA FUSE.JS) */}
      {verdictModalOpen && !gameOutcome && (
        <div className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto cbfc-paper cbfc-frame text-censor-ink rounded-t-md sm:rounded-sm p-4 sm:p-7 pb-safe relative animate-fade-up">
            <button
              type="button"
              onClick={() => setVerdictModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-sm hover:bg-censor-ink/10 text-censor-ink transition-colors"
              aria-label="Close Final Verdict modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 border-b-2 border-censor-ink/70 pb-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-censor-ink text-parchment-50 flex items-center justify-center shrink-0">
                <Gavel className="w-5 h-5 text-censor-gold" />
              </div>
              <div>
                <p className="font-typewriter text-[10px] uppercase tracking-[0.18em] text-censor-ink/70">
                  CBFC OFFICIAL JUDGMENT FORM
                </p>
                <h2 className="font-display font-black text-xl sm:text-2xl text-censor-ink">
                  DECLARE FINAL VERDICT
                </h2>
              </div>
            </div>

            <p className="font-sans text-xs sm:text-sm text-censor-ink/85 leading-relaxed mb-4">
              Type the secret Telugu movie title below.{" "}
              <strong>Minor spelling differences are forgiven</strong> (e.g.{" "}
              <em>&ldquo;Magadira&rdquo;</em>, <em>&ldquo;Bahubali&rdquo;</em>,{" "}
              <em>&ldquo;AVPL&rdquo;</em>).
            </p>

            <div className="flex items-center gap-2 bg-censor-crimson/10 border border-censor-crimson/40 px-3 py-2 rounded-sm mb-4">
              <ShieldAlert className="w-4 h-4 text-censor-crimson shrink-0" />
              <span className="font-typewriter text-[11px] text-censor-crimson font-bold">
                ONE SHOT ONLY! A wrong guess slams the BANNED BY CENSOR BOARD
                stamp!
              </span>
            </div>

            <form onSubmit={handleSubmitVerdict} className="space-y-4">
              <div className="relative">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="verdict-guess"
                    className="block font-typewriter text-xs font-bold uppercase tracking-wider text-censor-ink"
                  >
                    Suspected Telugu Film Title:
                  </label>
                  <span className="font-typewriter text-[10px] text-censor-ink/65">
                    {loadingSuggestions ? "Searching IMDb..." : "IMDb Autocomplete"}
                  </span>
                </div>

                <input
                  id="verdict-guess"
                  type="text"
                  autoFocus
                  autoComplete="off"
                  value={guessInput}
                  onFocus={() => {
                    if (guessInput.trim().length >= 2) setDropdownOpen(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setDropdownOpen(false), 150);
                  }}
                  onChange={(e) => {
                    setGuessInput(e.target.value);
                    setDropdownOpen(e.target.value.trim().length >= 2);
                    if (guessError) setGuessError("");
                  }}
                  onKeyDown={(e) => {
                    if (!dropdownOpen || movieSuggestions.length === 0) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIdx((prev) =>
                        prev < movieSuggestions.length - 1 ? prev + 1 : 0
                      );
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIdx((prev) =>
                        prev > 0 ? prev - 1 : movieSuggestions.length - 1
                      );
                    } else if (e.key === "Enter" && highlightedIdx >= 0) {
                      e.preventDefault();
                      const picked = movieSuggestions[highlightedIdx];
                      if (picked) {
                        setGuessInput(picked.title);
                        setDropdownOpen(false);
                        setHighlightedIdx(-1);
                      }
                    } else if (e.key === "Escape") {
                      setDropdownOpen(false);
                    }
                  }}
                  placeholder="Start typing Telugu movie name..."
                  className="w-full bg-parchment-50 border-2 border-censor-ink px-3.5 py-3 rounded-sm font-display font-bold text-base sm:text-lg text-censor-ink placeholder:text-censor-ink/40 focus:outline-none focus:ring-2 focus:ring-censor-crimson"
                />

                {/* Live IMDb Movie Suggestions Dropdown */}
                {dropdownOpen && movieSuggestions.length > 0 && (
                  <ul
                    role="listbox"
                    className="mt-1.5 max-h-52 overflow-y-auto custom-scrollbar bg-parchment-50 border-2 border-censor-ink rounded-sm shadow-xl divide-y divide-censor-ink/15"
                  >
                    {movieSuggestions.map((item, idx) => {
                      const isActive = idx === highlightedIdx;
                      return (
                        <li key={`${item.title}-${item.year ?? idx}`}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setGuessInput(item.title);
                              setDropdownOpen(false);
                              setHighlightedIdx(-1);
                              if (guessError) setGuessError("");
                            }}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-2 transition-colors ${
                              isActive
                                ? "bg-censor-ink text-parchment-50"
                                : "hover:bg-parchment-200 text-censor-ink"
                            }`}
                          >
                            <span className="font-display font-bold text-sm sm:text-base truncate">
                              {item.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {item.year && (
                                <span
                                  className={`font-typewriter text-[11px] ${
                                    isActive
                                      ? "text-parchment-200"
                                      : "text-censor-ink/70"
                                  }`}
                                >
                                  ({item.year})
                                </span>
                              )}
                              <span
                                className={`font-typewriter text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] ${
                                  isActive
                                    ? "bg-censor-gold text-booth-950"
                                    : "bg-censor-ink/10 text-censor-ink/75"
                                }`}
                              >
                                IMDb
                              </span>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {guessError && (
                  <p className="mt-1.5 font-typewriter text-xs text-censor-crimson font-bold">
                    {guessError}
                  </p>
                )}
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setVerdictModalOpen(false)}
                  className="px-4 py-2.5 bg-parchment-200 hover:bg-parchment-300 border-2 border-censor-ink font-typewriter font-bold text-xs uppercase tracking-wider text-censor-ink rounded-sm"
                >
                  Keep Interrogating
                </button>
                <button
                  type="submit"
                  disabled={submittingVerdict}
                  className="px-6 py-2.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 border-2 border-censor-ink shadow-[3px_3px_0px_#261B12] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none font-typewriter font-bold text-xs sm:text-sm uppercase tracking-wider rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Gavel className="w-4 h-4" />
                  <span>
                    {submittingVerdict ? "CHECKING..." : "SLAM FINAL VERDICT"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAGE 3: END-OF-GAME CENSOR BOARD VERDICT SHARE CARD */}
      {gameOutcome?.showCard && (
        <VerdictCard
          outcome={gameOutcome.status}
          movie={gameOutcome.revealedMovie}
          activeDateKey={activeDateKey}
          stats={stats}
          gajalaLieReels={gajalaLieReels}
          questionsUsed={questionCount}
          maxQuestions={MAX_TOKENS}
          finalRating={gameOutcome.status === "lost" ? "BANNED" : currentRating}
          wrongGuess={gameOutcome.wrongGuess}
          lossReason={gameOutcome.lossReason}
          auditLog={auditLog}
          onPlayAgain={onPlayAgain}
          onReturnSplash={onReturnSplash}
          onOpenCalendar={onOpenCalendar}
          onOpenStats={onOpenStats}
        />
      )}
    </div>
  );
}
