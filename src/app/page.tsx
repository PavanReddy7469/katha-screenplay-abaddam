"use client";

import React, { useEffect, useState } from "react";
import moviesData from "@/data/movies.json";
import { Movie } from "@/lib/personas";
import {
  createEmptyStats,
  DailyRecord,
  getLocalDateKey,
  getMovieForDate,
  loadPlayerStats,
  PlayerStats,
  recordGameOutcome,
  resetPlayerStats,
} from "@/lib/gameStats";
import CensorSplash from "@/components/CensorSplash";
import InterrogationRoom from "@/components/InterrogationRoom";
import StatsCalendarModal from "@/components/StatsCalendarModal";

const MOVIES = moviesData as Movie[];

export default function HomePage() {
  const [stage, setStage] = useState<"splash" | "interrogation">("splash");
  const [activeDateKey, setActiveDateKey] = useState<string>(() =>
    getLocalDateKey()
  );
  const [currentMovie, setCurrentMovie] = useState<Movie>(() =>
    getMovieForDate(getLocalDateKey(), MOVIES)
  );
  const [gameKey, setGameKey] = useState<number>(0);

  const [stats, setStats] = useState<PlayerStats>(() => createEmptyStats());
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"stats" | "calendar">("stats");

  useEffect(() => {
    setStats(loadPlayerStats());
  }, []);

  const openStatsModal = () => {
    setModalTab("stats");
    setModalOpen(true);
  };

  const openCalendarModal = () => {
    setModalTab("calendar");
    setModalOpen(true);
  };

  const handleEnterRoom = () => {
    setCurrentMovie(getMovieForDate(activeDateKey, MOVIES));
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handleSelectArchiveDate = (dateKey: string) => {
    setActiveDateKey(dateKey);
    setCurrentMovie(getMovieForDate(dateKey, MOVIES));
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handlePlayAgain = () => {
    setCurrentMovie(getMovieForDate(activeDateKey, MOVIES));
    setGameKey((k) => k + 1);
  };

  const handleResetToToday = () => {
    const today = getLocalDateKey();
    setActiveDateKey(today);
    setCurrentMovie(getMovieForDate(today, MOVIES));
  };

  const handleGameComplete = (record: Omit<DailyRecord, "playedAt">) => {
    setStats((prev) => recordGameOutcome(prev, record));
  };

  const handleResetStats = () => {
    setStats(resetPlayerStats());
  };

  return (
    <>
      {stage === "splash" ? (
        <CensorSplash
          activeDateKey={activeDateKey}
          stats={stats}
          onEnterRoom={handleEnterRoom}
          onOpenStats={openStatsModal}
          onOpenCalendar={openCalendarModal}
          onResetToToday={handleResetToToday}
        />
      ) : (
        <InterrogationRoom
          key={`${activeDateKey}-${gameKey}`}
          movie={currentMovie}
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
