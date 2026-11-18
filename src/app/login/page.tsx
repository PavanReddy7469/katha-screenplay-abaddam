"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Film, KeyRound, Lock, ShieldCheck, UserCheck, Stamp } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";

export default function LoginPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check existing session on load
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          setIsAuthenticated(Boolean(data.authenticated));
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the Censor Board Officer Password.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      setIsAuthenticated(true);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setIsAuthenticated(false);
  };

  // Loading state while checking session
  if (isAuthenticated === null) {
    return (
      <main className="min-h-screen screening-room-bg flex items-center justify-center p-4">
        <div className="font-typewriter text-xs text-censor-gold animate-pulse flex items-center gap-2">
          <Film className="w-5 h-5 animate-spin" />
          <span>Verifying Censor Board Credentials...</span>
        </div>
      </main>
    );
  }

  // If already authenticated, show the Admin Panel right on /login!
  if (isAuthenticated) {
    return <AdminPanel onLogout={handleLogout} />;
  }

  // Otherwise, show the CBFC Authentication Screen
  return (
    <main className="min-h-screen screening-room-bg flex flex-col items-center justify-center p-3.5 sm:p-6 relative">
      <div className="fixed top-0 inset-x-0 h-2.5 sprocket-strip opacity-70 pointer-events-none" />
      <div className="fixed bottom-0 inset-x-0 h-2.5 sprocket-strip opacity-70 pointer-events-none" />

      <div className="w-full max-w-md cbfc-paper cbfc-frame text-censor-ink rounded-sm p-6 sm:p-8 relative shadow-2xl animate-fade-up">
        {/* Emblem Header */}
        <div className="text-center border-b-2 border-censor-ink pb-4 mb-5">
          <div className="w-16 h-16 rounded-full border-2 border-censor-ink bg-parchment-200/80 mx-auto flex items-center justify-center mb-2 shadow-inner">
            <Lock className="w-7 h-7 text-censor-crimson" />
          </div>

          <p className="font-typewriter text-[10px] uppercase font-bold tracking-[0.2em] text-censor-ink/75">
            GOVERNMENT OF INDIA • CBFC HYDERABAD
          </p>
          <h1 className="font-display font-black text-2xl text-censor-ink tracking-tight uppercase mt-1">
            Officer Passkey Portal
          </h1>
          <p className="font-telugu text-xs font-bold text-censor-crimson mt-0.5">
            అధికారిక సెన్సార్ బోర్డ్ లాగిన్
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-typewriter text-xs uppercase font-bold text-censor-ink mb-1.5 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-censor-crimson" />
              <span>Censor Officer Username</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              className="w-full px-3.5 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-sm font-typewriter text-censor-ink placeholder:text-censor-ink/40 focus:outline-none focus:ring-2 focus:ring-censor-crimson/50"
            />
          </div>

          <div>
            <label className="block font-typewriter text-xs uppercase font-bold text-censor-ink mb-1.5 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-censor-crimson" />
              <span>Censor Officer Password</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password123"
                className="w-full pl-3.5 pr-10 py-2 bg-parchment-50 border-2 border-censor-ink rounded-sm text-sm font-typewriter text-censor-ink placeholder:text-censor-ink/40 focus:outline-none focus:ring-2 focus:ring-censor-crimson/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-censor-ink/60 hover:text-censor-ink transition-colors focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 bg-censor-red/10 border border-censor-red rounded-sm text-xs font-typewriter text-censor-crimson font-bold">
              {error}
            </div>
          )}

          <div className="p-3 bg-parchment-200/60 border border-dashed border-censor-ink/40 rounded-sm text-[11px] font-typewriter text-censor-ink/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-censor-ink">
              <ShieldCheck className="w-3.5 h-3.5 text-censor-teal" />
              <span>Admin Login Credentials:</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span>
                Username: <code className="font-bold text-censor-crimson">admin</code>
              </span>
              <span>
                Password: <code className="font-bold text-censor-crimson">password123</code>
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-censor-crimson hover:bg-censor-red text-parchment-50 font-typewriter font-bold text-xs sm:text-sm tracking-[0.14em] uppercase border-[3px] border-censor-ink shadow-[3px_3px_0px_#261B12] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all disabled:opacity-60"
          >
            <Stamp className="w-4 h-4" />
            <span>{isSubmitting ? "AUTHENTICATING..." : "AUTHENTICATE & ENTER VAULT"}</span>
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-5 pt-3 border-t border-censor-ink/20 text-center">
          <a
            href="/"
            className="font-typewriter text-xs text-censor-ink/70 hover:text-censor-crimson underline font-bold"
          >
            ← Return to Public Screening Room
          </a>
        </div>
      </div>
    </main>
  );
}
