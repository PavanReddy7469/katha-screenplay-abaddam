import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/adminAuth";
import { getIstDateKey } from "@/lib/istDate";
import {
  deleteMovie,
  getAllMovies,
  getStorageInfo,
  saveMovie,
  setMovieFeaturedDate,
} from "@/lib/movieStore";
import { Movie } from "@/lib/personas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Protect the full movie vault (including future scheduled dates) behind Admin auth
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { error: "Unauthorized: Censor Board passkey required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const id = searchParams.get("id");

    const movies = await getAllMovies({ forceFresh: true });
    const storage = getStorageInfo();
    const todayIst = getIstDateKey();

    if (id) {
      const match = movies.find((m) => m.id === id);
      if (!match) {
        return NextResponse.json({ error: "Movie not found" }, { status: 404 });
      }
      return NextResponse.json(match);
    }

    if (date) {
      const match = movies.find((m) => m.featuredDate === date);
      return NextResponse.json({ movie: match || null, todayIst, storage });
    }

    return NextResponse.json({
      movies,
      count: movies.length,
      todayIst,
      storage,
    });
  } catch (err) {
    console.error("GET /api/movies error:", err);
    return NextResponse.json(
      { error: "Failed to fetch movies" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { error: "Unauthorized: Censor Board passkey required" },
      { status: 401 }
    );
  }

  try {
    const body = (await req.json()) as Movie;

    if (!body.title || !body.hero || !body.director || !body.year) {
      return NextResponse.json(
        { error: "Title, Hero, Director, and Release Year are required" },
        { status: 400 }
      );
    }

    const movieId =
      body.id?.trim() ||
      body.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    const movieData: Movie = {
      ...body,
      id: movieId,
      alternateSpellings: Array.from(
        new Set([body.title, ...(body.alternateSpellings || [])])
      ),
      tropes: body.tropes || [],
      eraTrivia: body.eraTrivia || [],
      iconicMoments: body.iconicMoments || [],
      pressHints: body.pressHints || [],
      fullCast: body.fullCast || [],
      fullCrew: body.fullCrew || [],
    };

    const result = await saveMovie(movieData);
    return NextResponse.json({
      success: true,
      persistent: result.persistent,
      storage: result.storage,
      message: result.persistent
        ? `Movie "${movieData.title}" permanently saved${
            movieData.featuredDate
              ? ` and scheduled to unlock at 12:00 AM IST on ${movieData.featuredDate}`
              : ""
          }.`
        : `Movie "${movieData.title}" saved to temporary storage only — configure GITHUB_TOKEN or Upstash Redis in Vercel so it persists until 12:00 AM IST!`,
      movie: movieData,
      count: result.movies.length,
    });
  } catch (err) {
    console.error("POST /api/movies error:", err);
    return NextResponse.json(
      { error: "Failed to save movie" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { error: "Unauthorized: Censor Board passkey required" },
      { status: 401 }
    );
  }

  try {
    const { movieId, featuredDate } = await req.json();
    if (!movieId || !featuredDate) {
      return NextResponse.json(
        { error: "movieId and featuredDate (YYYY-MM-DD) are required" },
        { status: 400 }
      );
    }

    const result = await setMovieFeaturedDate(movieId, featuredDate);
    return NextResponse.json({
      success: true,
      persistent: result.persistent,
      storage: result.storage,
      message: `Scheduled movie ${movieId} for ${featuredDate} (12:00 AM IST)`,
      movies: result.movies,
    });
  } catch (err) {
    console.error("PATCH /api/movies error:", err);
    return NextResponse.json(
      { error: "Failed to update date" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json(
      { error: "Unauthorized: Censor Board passkey required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Movie ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteMovie(id);
    return NextResponse.json({
      success: true,
      persistent: result.persistent,
      storage: result.storage,
      message: `Movie ${id} deleted from vault`,
      count: result.movies.length,
    });
  } catch (err) {
    console.error("DELETE /api/movies error:", err);
    return NextResponse.json(
      { error: "Failed to delete movie" },
      { status: 500 }
    );
  }
}
