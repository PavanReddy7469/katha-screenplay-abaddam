"use client";

import React, { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatCountdown,
  getIstDateKey,
  getMsUntilNextIstMidnight,
} from "@/lib/istDate";

interface MidnightCountdownProps {
  compact?: boolean;
  onMidnightRollover?: (newDateKey: string) => void;
}

export default function MidnightCountdown({
  compact = false,
  onMidnightRollover,
}: MidnightCountdownProps) {
  const [msLeft, setMsLeft] = useState<number | null>(null);
  const lastDateRef = useRef<string>(getIstDateKey());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const currentIst = getIstDateKey(now);
      if (currentIst !== lastDateRef.current) {
        lastDateRef.current = currentIst;
        onMidnightRollover?.(currentIst);
      }
      setMsLeft(getMsUntilNextIstMidnight(now));
    };

    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [onMidnightRollover]);

  if (msLeft === null) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-typewriter ${
        compact ? "text-[10px]" : "text-[11px] sm:text-xs"
      }`}
      title="Next Daily Telugu Film unlocks automatically at 12:00 AM IST"
    >
      <Clock className="w-3.5 h-3.5 text-censor-crimson shrink-0" />
      <span>
        Next film (12 AM IST):{" "}
        <strong className="tabular-nums">{formatCountdown(msLeft)}</strong>
      </span>
    </span>
  );
}
