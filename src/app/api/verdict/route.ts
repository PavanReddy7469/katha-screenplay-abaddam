import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { getAllMovies } from "@/lib/movieStore";
import { getIstDateKey } from "@/lib/istDate";
import { Movie } from "@/lib/personas";

function normalizeTitle(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function checkFuzzyMatch(
  guess: string,
  targetMovie: Movie,
  allMovies: Movie[]
): boolean {
  const cleanedGuess = normalizeTitle(guess);
  if (cleanedGuess.length < 2) return false;

  const targetVariants = Array.from(
    new Set(
      [targetMovie.title, ...targetMovie.alternateSpellings].map(normalizeTitle)
    )
  );

  if (targetVariants.includes(cleanedGuess)) {
    return true;
  }

  const allEntries = allMovies.flatMap((m) =>
    Array.from(new Set([m.title, ...m.alternateSpellings])).map((variant) => ({
      movieId: m.id,
      variant: normalizeTitle(variant),
    }))
  );

  const globalFuse = new Fuse(allEntries, {
    keys: ["variant"],
    includeScore: true,
    threshold: 0.36,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const globalResults = globalFuse.search(cleanedGuess);
  if (globalResults.length === 0) return false;

  const topMatch = globalResults[0];
  if (
    topMatch.item.movieId === targetMovie.id &&
    (topMatch.score ?? 1) <= 0.34
  ) {
    return true;
  }

  const targetFuse = new Fuse(targetVariants, {
    includeScore: true,
    threshold: 0.32,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const targetResults = targetFuse.search(cleanedGuess);
  if (
    targetResults.length > 0 &&
    (targetResults[0].score ?? 1) <= 0.3 &&
    topMatch.item.movieId === targetMovie.id
  ) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      movieId: string;
      guess?: string;
      surrender?: boolean;
    };

    const allMovies = getAllMovies();
    const movie = allMovies.find((m) => m.id === body.movieId);
    if (!movie) {
      return NextResponse.json({ error: "Invalid case file." }, { status: 404 });
    }

    const todayIst = getIstDateKey();
    if (movie.featuredDate && movie.featuredDate > todayIst) {
      return NextResponse.json(
        { error: "This case is embargoed by CBFC until 12:00 AM IST!" },
        { status: 403 }
      );
    }

    const isCorrect =
      !body.surrender && Boolean(body.guess)
        ? checkFuzzyMatch(body.guess!, movie, allMovies)
        : false;

    return NextResponse.json({
      isCorrect,
      movie: {
        id: movie.id,
        title: movie.title,
        year: movie.year,
        hero: movie.hero,
        heroine: movie.heroine,
        director: movie.director,
        music: movie.music,
        genre: movie.genre,
        iconicProp: movie.iconicProp,
        hint: movie.hint,
        alternateSpellings: movie.alternateSpellings,
        tropes: movie.tropes,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process final verdict." },
      { status: 500 }
    );
  }
}
