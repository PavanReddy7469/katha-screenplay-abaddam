// Strict IST (Asia/Kolkata, UTC+05:30) date utilities so daily films unlock
// automatically at 12:00:00 AM IST sharp every night without fail!

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function getIstDateKey(now: Date = new Date()): string {
  // Shift UTC timestamp by +5h30m and read UTC calendar components -> exact IST YYYY-MM-DD
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const day = String(ist.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMsUntilNextIstMidnight(now: Date = new Date()): number {
  const istNowMs = now.getTime() + IST_OFFSET_MS;
  const msInDay = 24 * 60 * 60 * 1000;
  const elapsedToday = ((istNowMs % msInDay) + msInDay) % msInDay;
  return msInDay - elapsedToday;
}

export function formatCountdown(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms / 1000));
  const hrs = String(Math.floor(clamped / 3600)).padStart(2, "0");
  const mins = String(Math.floor((clamped % 3600) / 60)).padStart(2, "0");
  const secs = String(clamped % 60).padStart(2, "0");
  return `${hrs}h ${mins}m ${secs}s`;
}
