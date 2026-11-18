"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Database,
  Edit3,
  ExternalLink,
  Film,
  Flame,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Movie, PERSONAS, PersonaId } from "@/lib/personas";
import { formatReadableDate, getLocalDateKey } from "@/lib/gameStats";

interface AdminPanelProps {
  onLogout: () => void;
}

interface TestResponse {
  invalidQuestion?: boolean;
  reply?: string;
  statements?: Array<{
    personaId: PersonaId;
    reply: string;
    wasLie: boolean;
    claimedAnswer: "YES" | "NO";
  }>;
  heckle?: {
    personaId: PersonaId;
    text: string;
  };
  hasContradiction?: boolean;
  mode?: "groq" | "gemini" | "simulator";
}

const EMPTY_MOVIE_FORM: Partial<Movie> = {
  id: "",
  title: "",
  alternateSpellings: [],
  year: new Date().getFullYear(),
  releaseMonth: "",
  hero: "",
  heroine: "",
  director: "",
  music: "",
  genre: "",
  tropes: [],
  iconicProp: "",
  hint: "",
  featuredDate: getLocalDateKey(),
  fullCast: [],
  fullCrew: [],
  eraTrivia: [],
  iconicMoments: [],
  pressHints: [],
};

export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const todayKey = getLocalDateKey();

  const [movies, setMovies] = useState<Movie[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State for Add / Edit Movie Popup Box
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMovie, setFormMovie] = useState<Partial<Movie>>(EMPTY_MOVIE_FORM);
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // String helper fields for multi-item arrays in form
  const [altSpellingsStr, setAltSpellingsStr] = useState("");
  const [tropesStr, setTropesStr] = useState("");
  const [triviaStr, setTriviaStr] = useState("");
  const [momentsStr, setMomentsStr] = useState("");

  // AI Generator state (inside modal)
  const [aiTitleInput, setAiTitleInput] = useState("");
  const [aiNotesInput, setAiNotesInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generateSuccess, setGenerateSuccess] = useState("");

  // AI Test Interrogation Simulator State
  const [testMovieId, setTestMovieId] = useState<string>("");
  const [testQuestion, setTestQuestion] = useState("");
  const [testQuestionNumber, setTestQuestionNumber] = useState(1);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResponse | null>(null);
  const [testError, setTestError] = useState("");

  // Active Main Tab: "vault" | "test"
  const [activeTab, setActiveTab] = useState<"vault" | "test">("vault");

  // Fetch movies from server
  const loadMovies = async () => {
    setLoadingMovies(true);
    try {
      const res = await fetch("/api/movies");
      if (res.ok) {
        const data = await res.json();
        setMovies(data.movies || []);
        if (data.movies?.length > 0 && !testMovieId) {
          setTestMovieId(data.movies[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load movies:", err);
    } finally {
      setLoadingMovies(false);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  const todayMovie = useMemo(() => {
    return movies.find((m) => m.featuredDate === todayKey);
  }, [movies, todayKey]);

  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase();
    return movies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.hero.toLowerCase().includes(q) ||
        m.director.toLowerCase().includes(q) ||
        m.genre.toLowerCase().includes(q) ||
        (m.featuredDate && m.featuredDate.includes(q))
    );
  }, [movies, searchQuery]);

  // Open Add Movie Modal in the middle of the screen
  const openNewMovieModal = () => {
    setFormMovie({ ...EMPTY_MOVIE_FORM, featuredDate: todayKey });
    setAltSpellingsStr("");
    setTropesStr("");
    setTriviaStr("");
    setMomentsStr("");
    setAiTitleInput("");
    setAiNotesInput("");
    setGenerateError("");
    setGenerateSuccess("");
    setSaveMessage(null);
    setIsEditingExisting(false);
    setIsModalOpen(true);
  };

  // Open Edit Movie Modal in the middle of the screen
  const openEditMovieModal = (m: Movie) => {
    setFormMovie(m);
    setAltSpellingsStr((m.alternateSpellings || []).join(", "));
    setTropesStr((m.tropes || []).join("\n"));
    setTriviaStr((m.eraTrivia || []).join("\n"));
    setMomentsStr((m.iconicMoments || []).join("\n"));
    setAiTitleInput("");
    setAiNotesInput("");
    setGenerateError("");
    setGenerateSuccess("");
    setSaveMessage(null);
    setIsEditingExisting(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSaveMessage(null);
  };

  // Handle AI Auto-Fill in Modal
  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = aiTitleInput.trim();
    if (!title) {
      setGenerateError("Please enter a Telugu movie title to generate.");
      return;
    }

    setGenerateError("");
    setGenerateSuccess("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/admin/ai-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieTitle: title, notes: aiNotesInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "AI generation failed");
      }

      const generated: Movie = data.movie;
      setFormMovie({
        ...generated,
        featuredDate: formMovie.featuredDate || todayKey,
      });

      setAltSpellingsStr((generated.alternateSpellings || []).join(", "));
      setTropesStr((generated.tropes || []).join("\n"));
      setTriviaStr((generated.eraTrivia || []).join("\n"));
      setMomentsStr((generated.iconicMoments || []).join("\n"));

      setIsEditingExisting(false);
      setGenerateSuccess(
        `Generated dossier for "${generated.title}" (${generated.year}) using ${data.provider?.toUpperCase() || "AI"}!`
      );
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  // Save movie to server from modal
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMovie.title?.trim() || !formMovie.hero?.trim() || !formMovie.director?.trim()) {
      setSaveMessage({ type: "error", text: "Title, Hero, and Director are required!" });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const moviePayload: Movie = {
        id:
          formMovie.id?.trim() ||
          formMovie.title!
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, ""),
        title: formMovie.title.trim(),
        alternateSpellings: altSpellingsStr
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        year: Number(formMovie.year) || 2024,
        releaseMonth: formMovie.releaseMonth || "",
        hero: formMovie.hero.trim(),
        heroine: formMovie.heroine || "",
        director: formMovie.director.trim(),
        music: formMovie.music || "",
        genre: formMovie.genre || "Telugu Drama",
        tropes: tropesStr
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        iconicProp: formMovie.iconicProp || "",
        hint: formMovie.hint || "",
        featuredDate: formMovie.featuredDate || undefined,
        fullCast: formMovie.fullCast || [],
        fullCrew: formMovie.fullCrew || [],
        eraTrivia: triviaStr
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        iconicMoments: momentsStr
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        pressHints: formMovie.pressHints || [],
      };

      const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(moviePayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save movie");
      }

      setSaveMessage({
        type: "success",
        text: `Movie "${moviePayload.title}" archived successfully in Film Vault!`,
      });

      await loadMovies();
      setTestMovieId(moviePayload.id);

      setTimeout(() => {
        setIsModalOpen(false);
      }, 1200);
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete movie
  const handleDeleteMovie = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}" from the Censor Film Vault?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/movies?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await loadMovies();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Set movie as featured date
  const handleSetFeaturedDate = async (movieId: string, dateKey: string) => {
    try {
      const res = await fetch("/api/movies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId, featuredDate: dateKey }),
      });
      if (res.ok) {
        await loadMovies();
      }
    } catch (err) {
      console.error("Failed to assign date:", err);
    }
  };

  // Live Test Interrogation Simulator
  const handleRunAiTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = testQuestion.trim();
    if (!q) {
      setTestError("Please enter a Yes/No question to test.");
      return;
    }

    setIsTesting(true);
    setTestError("");
    setTestResult(null);

    try {
      const targetMovie = movies.find((m) => m.id === testMovieId);

      const res = await fetch("/api/interrogate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: targetMovie?.id || "custom",
          movieData: targetMovie,
          personaId: "panel",
          question: q,
          questionNumber: testQuestionNumber,
          gajalaLieReels: [3, 6],
          history: [],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Interrogation test failed");
      }

      setTestResult(data);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Test request failed");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen screening-room-bg text-parchment-100 flex flex-col p-3 sm:p-6 md:p-8">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* MASTHEAD / HEADER BAR */}
        <header className="cbfc-paper cbfc-frame text-censor-ink rounded-sm p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full border-2 border-censor-ink bg-parchment-200/80 flex items-center justify-center shrink-0 shadow-inner">
              <Film className="w-7 h-7 text-censor-crimson" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-typewriter text-[10px] uppercase font-bold tracking-[0.2em] bg-censor-ink text-parchment-50 px-2 py-0.5 rounded-[2px]">
                  OFFICIAL ADMIN PORTAL
                </span>
                <span className="font-typewriter text-[10px] text-censor-crimson font-bold">
                  CBFC • HYDERABAD
                </span>
              </div>
              <h1 className="font-display font-black text-xl sm:text-2xl md:text-3xl tracking-tight text-censor-ink uppercase mt-0.5">
                Censor Board Administrative Vault
              </h1>
              <p className="font-telugu text-xs text-censor-ink/80 font-bold">
                సెన్సార్ బోర్డ్ ఫిల్మ్ వాల్ట్ &amp; విచారణ నిర్వహణ
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-parchment-100 hover:bg-parchment-200 border-2 border-censor-ink text-censor-ink font-typewriter text-xs font-bold uppercase rounded-sm shadow-sm transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Screening Room</span>
            </a>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-censor-crimson hover:bg-censor-red border-2 border-censor-ink text-parchment-50 font-typewriter text-xs font-bold uppercase rounded-sm shadow-sm transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* TODAY'S CASE STATUS STRIP */}
        <section className="bg-booth-900 border border-censor-gold/40 p-4 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-censor-gold/20 border border-censor-gold/60 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-censor-gold" />
            </div>
            <div>
              <span className="font-typewriter text-[10px] uppercase font-bold text-censor-gold tracking-widest block">
                ACTIVE DAILY CASE • {formatReadableDate(todayKey)}
              </span>
              <h2 className="font-display font-bold text-lg text-parchment-50">
                {todayMovie ? (
                  <>
                    {todayMovie.title} ({todayMovie.year}){" "}
                    <span className="font-sans text-xs font-normal text-parchment-300">
                      • Directed by {todayMovie.director} • Starring {todayMovie.hero}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-300/80">
                    No custom movie pinned for today (using deterministic fallback)
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-typewriter text-xs text-parchment-300">
              Vault Total: <strong className="text-censor-gold">{movies.length} Films</strong>
            </span>
            <button
              type="button"
              onClick={loadMovies}
              className="p-1.5 rounded-sm hover:bg-booth-800 text-parchment-300 hover:text-parchment-50"
              title="Refresh Vault Data"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMovies ? "animate-spin" : ""}`} />
            </button>
          </div>
        </section>

        {/* MAIN NAVIGATION BAR WITH + ADD NEW DAILY MOVIE MODAL TRIGGER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-booth-700 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("vault")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-typewriter text-xs font-bold uppercase rounded-sm border-2 transition-all ${
                activeTab === "vault"
                  ? "bg-censor-gold text-booth-950 border-censor-gold shadow-md"
                  : "bg-booth-900 text-parchment-300 border-booth-700 hover:border-censor-gold/50"
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Film Vault Register ({movies.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("test")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 font-typewriter text-xs font-bold uppercase rounded-sm border-2 transition-all ${
                activeTab === "test"
                  ? "bg-censor-gold text-booth-950 border-censor-gold shadow-md"
                  : "bg-booth-900 text-parchment-300 border-booth-700 hover:border-censor-gold/50"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>AI Witness Simulator &amp; Tester</span>
            </button>
          </div>

          {/* + ADD NEW DAILY MOVIE BUTTON (OPENS POPUP BOX WINDOW) */}
          <button
            type="button"
            onClick={openNewMovieModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 font-typewriter text-xs sm:text-sm font-bold uppercase rounded-sm border-[2.5px] border-censor-ink bg-censor-crimson hover:bg-censor-red text-parchment-50 shadow-[3px_3px_0px_#261B12] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Daily Movie</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* VIEW 1: FILM VAULT REGISTER & SCHEDULE                   */}
        {/* ======================================================== */}
        {activeTab === "vault" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-booth-900 p-3 rounded-sm border border-booth-700">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-parchment-300/60" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, hero, director, genre, or date..."
                  className="w-full pl-9 pr-4 py-2 bg-booth-950 border border-booth-700 rounded-sm text-xs font-sans text-parchment-100 placeholder:text-parchment-300/40 focus:outline-none focus:border-censor-gold"
                />
              </div>

              <button
                type="button"
                onClick={openNewMovieModal}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter text-xs font-bold uppercase rounded-sm transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Movie</span>
              </button>
            </div>

            <div className="bg-booth-900 border border-booth-700 rounded-sm overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-booth-950/80 border-b border-booth-700 font-typewriter text-[11px] text-censor-gold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Film Title / Year</th>
                    <th className="p-3">Lead Hero &amp; Heroine</th>
                    <th className="p-3">Director &amp; Music</th>
                    <th className="p-3">Genre</th>
                    <th className="p-3">Daily Case Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-booth-800">
                  {filteredMovies.map((m) => {
                    const isPinnedToday = m.featuredDate === todayKey;
                    return (
                      <tr key={m.id} className="hover:bg-booth-800/50 transition-colors">
                        <td className="p-3 font-medium text-parchment-50">
                          <div className="font-bold text-sm text-parchment-100">{m.title}</div>
                          <span className="font-typewriter text-[10px] text-parchment-300/70">
                            {m.releaseMonth || m.year} • ID: {m.id}
                          </span>
                        </td>
                        <td className="p-3 text-parchment-200">
                          <div>
                            <strong>{m.hero}</strong>
                          </div>
                          <span className="text-[11px] text-parchment-300/70">{m.heroine}</span>
                        </td>
                        <td className="p-3 text-parchment-200">
                          <div>{m.director}</div>
                          <span className="text-[11px] text-parchment-300/70">{m.music}</span>
                        </td>
                        <td className="p-3">
                          <span className="inline-block px-2 py-0.5 rounded-[2px] bg-booth-950 border border-booth-700 text-[10px] text-parchment-300 font-typewriter">
                            {m.genre}
                          </span>
                        </td>
                        <td className="p-3 font-typewriter text-xs">
                          {m.featuredDate ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] ${
                                isPinnedToday
                                  ? "bg-censor-gold text-booth-950 font-bold"
                                  : "bg-booth-950 text-parchment-300 border border-booth-700"
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              {m.featuredDate} {isPinnedToday ? "(TODAY)" : ""}
                            </span>
                          ) : (
                            <span className="text-parchment-300/40">Not Scheduled</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                          {!isPinnedToday && (
                            <button
                              type="button"
                              onClick={() => handleSetFeaturedDate(m.id, todayKey)}
                              className="px-2 py-1 bg-booth-950 hover:bg-censor-gold hover:text-booth-950 border border-censor-gold/50 text-[10px] font-typewriter font-bold uppercase rounded-[2px] text-censor-gold transition-colors"
                              title="Set as Today's Daily Case"
                            >
                              Set Today
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setTestMovieId(m.id);
                              setActiveTab("test");
                            }}
                            className="px-2 py-1 bg-booth-950 hover:bg-booth-800 border border-booth-700 text-[10px] font-typewriter font-bold uppercase rounded-[2px] text-parchment-200 transition-colors"
                            title="Test witness answers for this movie"
                          >
                            Test AI
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditMovieModal(m)}
                            className="p-1 rounded-[2px] bg-booth-950 hover:bg-booth-800 border border-booth-700 text-parchment-200 cursor-pointer"
                            title="Edit movie dossier & date"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteMovie(m.id, m.title)}
                            className="p-1 rounded-[2px] bg-booth-950 hover:bg-red-950/60 border border-red-900/50 text-red-400 cursor-pointer"
                            title="Delete movie"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredMovies.length === 0 && (
                <div className="p-8 text-center text-parchment-300/60 font-typewriter text-xs">
                  No movies found matching your search.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: LIVE WITNESS RESPONSE SIMULATOR & TESTER         */}
        {/* ======================================================== */}
        {activeTab === "test" && (
          <div className="space-y-6">
            <div className="bg-booth-900 border border-booth-700 p-5 rounded-sm shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-booth-700 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-parchment-50 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-censor-gold" />
                    <span>Live Witness Response Simulator</span>
                  </h3>
                  <p className="font-sans text-xs text-parchment-300">
                    Test how <strong>Relangi Mavayya</strong>, <strong>Gajala</strong>, and <strong>Inspector Kill Bill Pandey</strong> will respond to this movie before releasing it to players!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="font-typewriter text-xs text-parchment-300">Target Movie:</label>
                  <select
                    value={testMovieId}
                    onChange={(e) => setTestMovieId(e.target.value)}
                    className="px-3 py-1.5 bg-booth-950 border border-booth-700 rounded-sm text-xs font-sans text-parchment-100 focus:outline-none focus:border-censor-gold"
                  >
                    {movies.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({m.year})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TEST QUESTION FORM */}
              <form onSubmit={handleRunAiTest} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={testQuestion}
                      onChange={(e) => setTestQuestion(e.target.value)}
                      placeholder="Ask any Yes/No question (e.g. 'Is Brahmanandam in it?', 'Did Rajamouli direct?', 'Is it released after 2015?')"
                      className="w-full px-3 py-2.5 bg-booth-950 border border-booth-700 rounded-sm text-sm font-sans text-parchment-100 placeholder:text-parchment-300/40 focus:outline-none focus:border-censor-gold"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={testQuestionNumber}
                      onChange={(e) => setTestQuestionNumber(Number(e.target.value))}
                      className="px-3 py-2.5 bg-booth-950 border border-booth-700 rounded-sm text-xs font-typewriter text-parchment-100 focus:outline-none"
                      title="Reel Number (Gajala lies on #3 and #6)"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((r) => (
                        <option key={r} value={r}>
                          Reel #{r} {r === 3 || r === 6 ? "(Gajala Lie Turn)" : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      disabled={isTesting}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter text-xs font-bold uppercase rounded-sm shadow-md transition-all disabled:opacity-50 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isTesting ? "Testing..." : "Test Responses"}</span>
                    </button>
                  </div>
                </div>

                {/* QUICK TACTICAL TEST CHIPS */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="font-typewriter text-[10px] text-parchment-300/70 mr-1">
                    Quick Prompts:
                  </span>
                  {[
                    "Is Brahmanandam in this movie?",
                    "Did it release after 2015?",
                    "Is it an action movie with fights?",
                    "Does the hero have a love story?",
                    "Did S.S. Rajamouli direct it?",
                    "Did it win a National Film Award?",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setTestQuestion(chip)}
                      className="px-2 py-1 rounded-[2px] bg-booth-950 hover:bg-booth-800 border border-booth-700 text-[11px] font-sans text-parchment-300 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </form>

              {testError && (
                <div className="p-3 bg-red-950/40 border border-red-800 rounded-sm font-typewriter text-xs text-red-300">
                  {testError}
                </div>
              )}
            </div>

            {/* TEST RESULT DISPLAY */}
            {testResult && (
              <div className="cbfc-paper cbfc-frame text-censor-ink p-5 sm:p-7 rounded-sm shadow-xl space-y-4 animate-fade-up">
                <div className="border-b-2 border-censor-ink pb-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-typewriter text-[10px] uppercase font-bold tracking-widest text-censor-crimson">
                      CBFC SCREENING ROOM WITNESS AUDIT LOG
                    </span>
                    <h4 className="font-display font-black text-xl text-censor-ink uppercase mt-0.5">
                      Interrogation Response on Reel #{testQuestionNumber}
                    </h4>
                  </div>
                  <span className="font-typewriter text-[10px] font-bold px-2.5 py-1 bg-censor-ink text-parchment-50 rounded-[2px]">
                    PROVIDER: {testResult.mode?.toUpperCase() || "SIMULATOR"}
                  </span>
                </div>

                <div className="font-sans text-xs bg-parchment-50/75 p-3 rounded-sm border border-censor-ink/30">
                  <span className="font-typewriter text-[10px] uppercase text-censor-ink/70 block">
                    Question Asked:
                  </span>
                  <strong className="text-sm text-censor-ink">&ldquo;{testQuestion}&rdquo;</strong>
                </div>

                {testResult.hasContradiction && (
                  <div className="bg-censor-red/15 border-2 border-censor-crimson p-3 rounded-sm text-censor-crimson font-typewriter text-xs font-bold flex items-center gap-2">
                    <Flame className="w-4 h-4 shrink-0 text-censor-crimson" />
                    <span>
                      PANEL CONTRADICTION DETECTED! The witnesses gave opposite answers (one of them lied).
                    </span>
                  </div>
                )}

                {/* WITNESS STATEMENTS */}
                <div className="space-y-3">
                  {testResult.statements?.map((stmt) => {
                    const persona = PERSONAS[stmt.personaId];
                    return (
                      <div
                        key={stmt.personaId}
                        className="bg-parchment-50/90 border-2 border-censor-ink/60 p-3.5 rounded-sm relative shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-sm font-display font-black text-xs flex items-center justify-center text-parchment-50"
                              style={{ backgroundColor: persona.accentColor }}
                            >
                              {persona.monogram}
                            </div>
                            <div>
                              <strong className="font-display text-sm text-censor-ink">
                                {persona.name}
                              </strong>
                              <span className="text-[10px] font-typewriter text-censor-ink/70 ml-2">
                                ({persona.title})
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`font-typewriter text-[10px] font-bold px-2 py-0.5 rounded-[2px] border ${
                                stmt.claimedAnswer === "YES"
                                  ? "bg-emerald-950/10 border-emerald-700 text-emerald-900"
                                  : "bg-censor-crimson/10 border-censor-crimson text-censor-crimson"
                              }`}
                            >
                              Claimed: {stmt.claimedAnswer}
                            </span>

                            <span
                              className={`font-typewriter text-[10px] font-bold px-2 py-0.5 rounded-[2px] ${
                                stmt.wasLie
                                  ? "bg-censor-crimson text-parchment-50"
                                  : "bg-censor-ink text-parchment-50"
                              }`}
                            >
                              {stmt.wasLie ? "LIED (INVERTED)" : "TRUTHFUL"}
                            </span>
                          </div>
                        </div>

                        <p className="font-sans text-xs sm:text-sm text-censor-ink/95 leading-relaxed italic">
                          &ldquo;{stmt.reply}&rdquo;
                        </p>
                      </div>
                    );
                  })}

                  {/* HECKLER STATEMENT */}
                  {testResult.heckle && (
                    <div className="bg-booth-950 text-parchment-200 border border-censor-gold/40 p-3 rounded-sm text-xs font-sans">
                      <span className="font-typewriter text-[10px] text-censor-gold font-bold uppercase block mb-1">
                        Sideline Heckle ({PERSONAS[testResult.heckle.personaId].name}):
                      </span>
                      <p className="italic text-parchment-100">&ldquo;{testResult.heckle.text}&rdquo;</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* POPUP BOX WINDOW IN THE MIDDLE OF THE PAGE (MODAL)       */}
      {/* ======================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-4xl my-auto max-h-[92dvh] overflow-y-auto cbfc-paper cbfc-frame text-censor-ink rounded-sm p-5 sm:p-8 relative shadow-2xl animate-fade-up">
            {/* Close Button */}
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 rounded-sm hover:bg-censor-ink/10 text-censor-ink transition-colors cursor-pointer"
              title="Close window"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Modal Header */}
            <div className="border-b-2 border-censor-ink pb-3 mb-5 pr-8">
              <div className="flex items-center gap-2">
                <span className="font-typewriter text-[10px] uppercase font-bold tracking-[0.2em] bg-censor-ink text-parchment-50 px-2 py-0.5 rounded-[2px]">
                  CBFC OFFICIAL FILING
                </span>
                <span className="font-typewriter text-[10px] text-censor-crimson font-bold">
                  HYD • CASE REGISTER
                </span>
              </div>
              <h2 className="font-display font-black text-2xl sm:text-3xl text-censor-ink uppercase mt-1">
                {isEditingExisting ? "Edit Movie Dossier & Date" : "Add New Daily Telugu Movie"}
              </h2>
              <p className="font-telugu text-xs font-bold text-censor-ink/80 mt-0.5">
                కొత్త సినిమా వివరాలు మరియు తేదీని నమోదు చేయండి
              </p>
            </div>

            {/* AI AUTO-FILL QUICK ASSISTANT (OPTIONAL) */}
            <div className="bg-parchment-200/70 border border-censor-ink/40 p-4 rounded-sm mb-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Wand2 className="w-4 h-4 text-censor-crimson" />
                <h3 className="font-typewriter text-xs font-bold uppercase tracking-wider text-censor-ink">
                  Instant AI Auto-Fill (Optional)
                </h3>
              </div>
              <p className="font-sans text-[11px] text-censor-ink/80 mb-2.5">
                Type a Telugu movie title and click <strong>&quot;Auto-Fill with AI&quot;</strong> to automatically look up verified Tollywood details (Hero, Director, Music, Tropes, Props, Cast &amp; Hints):
              </p>

              <form onSubmit={handleAiGenerate} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiTitleInput}
                  onChange={(e) => setAiTitleInput(e.target.value)}
                  placeholder="e.g. Hanu-Man, Kushi, Jersey, Salaar, Eega, Devara..."
                  className="flex-1 px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink placeholder:text-censor-ink/40 focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                />

                <input
                  type="text"
                  value={aiNotesInput}
                  onChange={(e) => setAiNotesInput(e.target.value)}
                  placeholder="Notes (optional, e.g. 2001 film)"
                  className="w-full sm:w-48 px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink placeholder:text-censor-ink/40 focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                />

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-censor-gold hover:bg-amber-500 text-booth-950 font-typewriter text-xs font-bold uppercase rounded-sm border border-censor-ink shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isGenerating ? "Synthesizing..." : "Auto-Fill with AI"}</span>
                </button>
              </form>

              {generateError && (
                <p className="mt-2 text-xs font-typewriter text-red-700 bg-red-100 p-1.5 rounded-sm border border-red-300">
                  {generateError}
                </p>
              )}

              {generateSuccess && (
                <p className="mt-2 text-xs font-typewriter text-emerald-800 bg-emerald-100 p-1.5 rounded-sm border border-emerald-300">
                  {generateSuccess}
                </p>
              )}
            </div>

            {/* MAIN MOVIE ENTRY FORM */}
            <form onSubmit={handleSaveMovie} className="space-y-4">
              {saveMessage && (
                <div
                  className={`p-3 rounded-sm font-typewriter text-xs border ${
                    saveMessage.type === "success"
                      ? "bg-emerald-100 border-emerald-600 text-emerald-900"
                      : "bg-red-100 border-red-600 text-red-900"
                  }`}
                >
                  {saveMessage.text}
                </div>
              )}

              {/* HIGHLIGHTED DATE SCHEDULER BAR */}
              <div className="bg-amber-900/10 border-2 border-censor-gold p-3.5 rounded-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <label className="block font-typewriter text-xs uppercase font-bold text-censor-ink flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-censor-crimson" />
                    <span>Scheduled Daily Case Date (YYYY-MM-DD) *</span>
                  </label>
                  <p className="font-sans text-[11px] text-censor-ink/75 mt-0.5">
                    Choose the date when this movie will appear in the Censor Screening Room for players.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="date"
                    required
                    value={formMovie.featuredDate || todayKey}
                    onChange={(e) => setFormMovie({ ...formMovie, featuredDate: e.target.value })}
                    className="px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-typewriter font-bold text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-gold"
                  />
                  <button
                    type="button"
                    onClick={() => setFormMovie({ ...formMovie, featuredDate: todayKey })}
                    className="px-2.5 py-2 bg-censor-ink hover:bg-booth-800 text-parchment-50 font-typewriter text-[10px] font-bold uppercase rounded-sm border border-censor-ink transition-colors cursor-pointer shrink-0"
                    title="Set to today's date"
                  >
                    Today
                  </button>
                </div>
              </div>

              {/* ROW 1: Title, Hero, Director, Year */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Film Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMovie.title || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, title: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Hanu-Man"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Lead Hero *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMovie.hero || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, hero: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Teja Sajja"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Director *
                  </label>
                  <input
                    type="text"
                    required
                    value={formMovie.director || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, director: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Prasanth Varma"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Release Year *
                  </label>
                  <input
                    type="number"
                    required
                    value={formMovie.year || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, year: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>

              {/* ROW 2: Heroine, Music, Release Month, Genre */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Lead Heroine
                  </label>
                  <input
                    type="text"
                    value={formMovie.heroine || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, heroine: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Amritha Aiyer"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Music Composer
                  </label>
                  <input
                    type="text"
                    value={formMovie.music || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, music: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Anudeep Dev"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Release Month
                  </label>
                  <input
                    type="text"
                    value={formMovie.releaseMonth || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, releaseMonth: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. January 2024"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Genre
                  </label>
                  <input
                    type="text"
                    value={formMovie.genre || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, genre: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Superhero Fantasy Action"
                  />
                </div>
              </div>

              {/* ROW 3: Iconic Prop, Alternate Spellings, Slug ID */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Iconic Prop
                  </label>
                  <input
                    type="text"
                    value={formMovie.iconicProp || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, iconicProp: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Solar blood drop totem gem & slingshot"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Alternate Spellings (comma separated)
                  </label>
                  <input
                    type="text"
                    value={altSpellingsStr}
                    onChange={(e) => setAltSpellingsStr(e.target.value)}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. Hanuman, Hanu Man, HanuMan"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Slug ID (Auto or custom)
                  </label>
                  <input
                    type="text"
                    value={formMovie.id || ""}
                    onChange={(e) => setFormMovie({ ...formMovie, id: e.target.value })}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                    placeholder="e.g. hanu-man"
                  />
                </div>
              </div>

              {/* Short Hint */}
              <div>
                <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                  1-Sentence Teaser Hint (Non-spoiler)
                </label>
                <input
                  type="text"
                  value={formMovie.hint || ""}
                  onChange={(e) => setFormMovie({ ...formMovie, hint: e.target.value })}
                  className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40"
                  placeholder="e.g. A petty thief in an imaginary village accidentally discovers the blood-drop gem of Lord Hanuman."
                />
              </div>

              {/* Textareas: Tropes, Era Trivia, Iconic Moments */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Plot Tropes (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    value={tropesStr}
                    onChange={(e) => setTropesStr(e.target.value)}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40 custom-scrollbar"
                    placeholder="e.g. Imaginary fictional village of Anjanadri&#10;Solar eclipse climax transformation&#10;Features Getup Srinu comic relief"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Era Trivia &amp; Hype (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    value={triviaStr}
                    onChange={(e) => setTriviaStr(e.target.value)}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40 custom-scrollbar"
                    placeholder="e.g. Sankranti 2024 blockbuster grossing ₹300+ crore&#10;Kickstarted Prasanth Varma Cinematic Universe"
                  />
                </div>

                <div>
                  <label className="block font-typewriter text-[11px] uppercase font-bold text-censor-ink mb-1">
                    Iconic Moments (1 per line)
                  </label>
                  <textarea
                    rows={3}
                    value={momentsStr}
                    onChange={(e) => setMomentsStr(e.target.value)}
                    className="w-full px-3 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-xs font-sans text-censor-ink focus:outline-none focus:ring-2 focus:ring-censor-crimson/40 custom-scrollbar"
                    placeholder="e.g. Underwater breath sequence with solar stone&#10;Hanuman Chalisa goosebumps interval elevation"
                  />
                </div>
              </div>

              {/* MODAL FOOTER ACTIONS */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-censor-ink">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 bg-parchment-200 hover:bg-parchment-300 text-censor-ink font-typewriter text-xs font-bold uppercase rounded-sm border-2 border-censor-ink cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter text-xs sm:text-sm font-bold uppercase rounded-sm border-2 border-censor-ink shadow-[2px_2px_0px_#261B12] active:translate-x-[1px] active:translate-y-[1px] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSaving ? "Saving to Vault..." : "Save Movie to Vault"}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
