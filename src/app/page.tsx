"use client";

import React, { useEffect, useState } from "react";
import defaultMoviesData from "@/data/movies.json";
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

const INITIAL_MOVIES = defaultMoviesData as Movie[];

export default function HomePage() {
  const [stage, setStage] = useState<"splash" | "interrogation">("splash");
  const [moviesList, setMoviesList] = useState<Movie[]>(INITIAL_MOVIES);
  const [activeDateKey, setActiveDateKey] = useState<string>(() =>
    getLocalDateKey()
  );
  const [currentMovie, setCurrentMovie] = useState<Movie>(() =>
    getMovieForDate(getLocalDateKey(), INITIAL_MOVIES)
  );
  const [gameKey, setGameKey] = useState<number>(0);

  const [stats, setStats] = useState<PlayerStats>(() => createEmptyStats());
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<"stats" | "calendar">("stats");

  // Load stats from localStorage
  useEffect(() => {
    setStats(loadPlayerStats());
  }, []);

  // Fetch dynamic movies from server (includes newly added admin movies)
  useEffect(() => {
    async function fetchMovies() {
      try {
        const res = await fetch("/api/movies");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.movies) && data.movies.length > 0) {
            setMoviesList(data.movies);
            setCurrentMovie(getMovieForDate(activeDateKey, data.movies));
          }
        }
      } catch (err) {
        console.warn("Could not fetch dynamic movies, using bundled set:", err);
      }
    }
    fetchMovies();
  }, [activeDateKey]);

  const openStatsModal = () => {
    setModalTab("stats");
    setModalOpen(true);
  };

  const openCalendarModal = () => {
    setModalTab("calendar");
    setModalOpen(true);
  };

  const handleEnterRoom = () => {
    setCurrentMovie(getMovieForDate(activeDateKey, moviesList));
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handleSelectArchiveDate = (dateKey: string) => {
    setActiveDateKey(dateKey);
    setCurrentMovie(getMovieForDate(dateKey, moviesList));
    setGameKey((k) => k + 1);
    setStage("interrogation");
  };

  const handlePlayAgain = () => {
    setCurrentMovie(getMovieForDate(activeDateKey, moviesList));
    setGameKey((k) => k + 1);
  };

  const handleResetToToday = () => {
    const today = getLocalDateKey();
    setActiveDateKey(today);
    setCurrentMovie(getMovieForDate(today, moviesList));
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
          vaultCount={moviesList.length}
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
          allMovies={moviesList}
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
