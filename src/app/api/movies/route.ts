import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/adminAuth";
import {
  deleteMovie,
  getAllMovies,
  saveMovie,
  setMovieFeaturedDate,
} from "@/lib/movieStore";
import { Movie } from "@/lib/personas";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const id = searchParams.get("id");

    const movies = getAllMovies();

    if (id) {
      const match = movies.find((m) => m.id === id);
      if (!match) {
        return NextResponse.json({ error: "Movie not found" }, { status: 404 });
      }
      return NextResponse.json(match);
    }

    if (date) {
      const match = movies.find((m) => m.featuredDate === date);
      return NextResponse.json({ movie: match || null });
    }

    return NextResponse.json({ movies, count: movies.length });
  } catch (err) {
    console.error("GET /api/movies error:", err);
    return NextResponse.json({ error: "Failed to fetch movies" }, { status: 500 });
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

    // Ensure id is clean slug
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
      message: `Movie "${movieData.title}" archived successfully in Film Vault.`,
      movie: movieData,
      count: result.movies.length,
    });
  } catch (err) {
    console.error("POST /api/movies error:", err);
    return NextResponse.json({ error: "Failed to save movie" }, { status: 500 });
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
      message: `Assigned date ${featuredDate} to movie ${movieId}`,
      movies: result.movies,
    });
  } catch (err) {
    console.error("PATCH /api/movies error:", err);
    return NextResponse.json({ error: "Failed to update date" }, { status: 500 });
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
      return NextResponse.json({ error: "Movie ID is required" }, { status: 400 });
    }

    const result = await deleteMovie(id);
    return NextResponse.json({
      success: true,
      message: `Movie ${id} deleted from vault`,
      count: result.movies.length,
    });
  } catch (err) {
    console.error("DELETE /api/movies error:", err);
    return NextResponse.json({ error: "Failed to delete movie" }, { status: 500 });
  }
}
