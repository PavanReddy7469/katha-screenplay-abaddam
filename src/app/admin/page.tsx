"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Film } from "lucide-react";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/admin/session");
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            return;
          }
        }
        setIsAuthenticated(false);
        router.push("/login");
      } catch {
        setIsAuthenticated(false);
        router.push("/login");
      }
    }
    check();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    router.push("/login");
  };

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

  if (!isAuthenticated) {
    return null;
  }

  return <AdminPanel onLogout={handleLogout} />;
}
