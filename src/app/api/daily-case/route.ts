import { NextRequest, NextResponse } from "next/server";
import { getAllMovies } from "@/lib/movieStore";
import { getIstDateKey } from "@/lib/istDate";
import { getMovieForDate } from "@/lib/gameStats";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const todayIst = getIstDateKey();
  const requestedDate = req.nextUrl.searchParams.get("date")?.trim() || todayIst;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)) {
    return NextResponse.json(
      { error: "Invalid date format. Expected YYYY-MM-DD." },
      { status: 400 }
    );
  }

  // Strictly block future dates on the server until 12:00:00 AM IST!
  if (requestedDate > todayIst) {
    return NextResponse.json(
      {
        error: "This case is embargoed by CBFC until 12:00 AM IST!",
        todayIst,
        embargoed: true,
      },
      { status: 403 }
    );
  }

  const allMovies = getAllMovies();
  const movie = getMovieForDate(requestedDate, allMovies);
  const releasedCount = allMovies.filter(
    (m) => !m.featuredDate || m.featuredDate <= todayIst
  ).length;

  // Return ONLY spoiler-free case data (NEVER expose movie.title, hero, director, or tropes!)
  return NextResponse.json({
    dateKey: requestedDate,
    todayIst,
    vaultCount: releasedCount,
    caseFile: {
      movieId: movie.id,
      pressHints: movie.pressHints ?? [
        {
          id: "fallback-era",
          category: "CBFC ARCHIVE",
          difficulty: "HARD" as const,
          headline: "Classified Screening Print Logged",
          body: `Filed under the ${movie.genre} category at CBFC Hyderabad.`,
          unlockAfterReel: 0,
        },
      ],
    },
  });
}
