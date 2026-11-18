"use client";

import React, { useCallback, useEffect, useState } from "react";
import { PressHint } from "@/lib/personas";
import {
  createEmptyStats,
  DailyRecord,
  getLocalDateKey,
  loadPlayerStats,
  PlayerStats,
  recordGameOutcome,
  resetPlayerStats,
} from "@/lib/gameStats";
import CensorSplash from "@/components/CensorSplash";
import InterrogationRoom, { CaseFile } from "@/components/InterrogationRoom";
import StatsCalendarModal from "@/components/StatsCalendarModal";

export default function HomePage() {
  const [stage, setStage] = useState<"splash" | "interrogation">("splash");
  const [activeDateKey, setActiveDateKey] = useState<string>(() =>
    getLocalDateKey()
  );
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [vaultCount, setVaultCount] = useState<number>(18);
  const [loadingCase, setLoadingCase] = useState<boolean>(true);
  const [gameKey, setGameKey] = useState<number>(0);

  const [stats, setStats] = useState<PlayerStats>(() => createEmptyStats());
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"stats" | "calendar">("stats");

  const fetchCaseForDate = useCallback(async (dateKey: string) => {
    setLoadingCase(true);
    try {
      const res = await fetch(
        `/api/daily-case?date=${encodeURIComponent(dateKey)}`,
        { cache: "no-store" }
      );
      if (res.status === 403) {
        const errData = (await res.json()) as { todayIst?: string };
        if (errData.todayIst && errData.todayIst !== dateKey) {
          setActiveDateKey(errData.todayIst);
          return;
        }
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        dateKey: string;
        vaultCount: number;
        caseFile: { movieId: string; pressHints: PressHint[] };
      };
      setCaseFile(data.caseFile);
      setVaultCount(data.vaultCount);
    } finally {
      setLoadingCase(false);
    }
  }, []);

  useEffect(() => {
    setStats(loadPlayerStats());
  }, []);

  useEffect(() => {
    fetchCaseForDate(activeDateKey);
  }, [activeDateKey, fetchCaseForDate]);

  const openStatsModal = () => {
    setModalTab("stats");
    setModalOpen(true);
  };

  const openCalendarModal = () => {
    setModalTab("calendar");
    setModalOpen(true);
  };

  const handleEnterRoom = () => {
    if (!caseFile) return;
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handleSelectArchiveDate = (dateKey: string) => {
    setActiveDateKey(dateKey);
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handlePlayAgain = () => {
    setGameKey((k) => k + 1);
  };

  const handleResetToToday = () => {
    const today = getLocalDateKey();
    setActiveDateKey(today);
  };

  const handleMidnightRollover = useCallback((newIstDateKey: string) => {
    setActiveDateKey(newIstDateKey);
    setGameKey((k) => k + 1);
  }, []);

  const handleGameComplete = (record: Omit<DailyRecord, "playedAt">) => {
    setStats((prev) => recordGameOutcome(prev, record));
  };

  const handleResetStats = () => {
    setStats(resetPlayerStats());
  };

  return (
    <>
      {stage === "splash" || !caseFile ? (
        <CensorSplash
          activeDateKey={activeDateKey}
          vaultCount={vaultCount}
          loadingCase={loadingCase || !caseFile}
          stats={stats}
          onEnterRoom={handleEnterRoom}
          onOpenStats={openStatsModal}
          onOpenCalendar={openCalendarModal}
          onResetToToday={handleResetToToday}
          onMidnightRollover={handleMidnightRollover}
        />
      ) : (
        <InterrogationRoom
          key={`${activeDateKey}-${caseFile.movieId}-${gameKey}`}
          caseFile={caseFile}
          activeDateKey={activeDateKey}
          stats={stats}
          onGameComplete={handleGameComplete}
          onPlayAgain={handlePlayAgain}
          onReturnSplash={() => setStage("splash")}
          onOpenStats={openStatsModal}
          onOpenCalendar={openCalendarModal}
        />
      )}

      <StatsCalendarModal
        isOpen={modalOpen}
        initialTab={modalTab}
        stats={stats}
        activeDateKey={activeDateKey}
        onClose={() => setModalOpen(false)}
        onSelectArchiveDate={handleSelectArchiveDate}
        onResetStats={handleResetStats}
      />
    </>
  );
}
