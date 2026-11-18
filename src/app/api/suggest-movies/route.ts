import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import moviesData from "@/data/movies.json";
import { TELUGU_IMDB_CATALOG } from "@/data/teluguCatalog";
import { Movie } from "@/lib/personas";

export interface MovieSuggestion {
  title: string;
  year?: number;
  source: "catalog" | "imdb";
}

// Build combined deduplicated Telugu IMDb catalog once per serverless instance
const COMBINED_CATALOG = (() => {
  const byTitle = new Map<
    string,
    { title: string; year?: number; aliases: string[] }
  >();

  for (const item of TELUGU_IMDB_CATALOG) {
    byTitle.set(item.title.toLowerCase(), {
      title: item.title,
      year: item.year,
      aliases: item.aliases ?? [],
    });
  }

  for (const m of moviesData as Movie[]) {
    const key = m.title.toLowerCase();
    const existing = byTitle.get(key);
    byTitle.set(key, {
      title: m.title,
      year: m.year,
      aliases: Array.from(
        new Set([...(existing?.aliases ?? []), ...m.alternateSpellings])
      ),
    });
  }

  return Array.from(byTitle.values());
})();

const catalogFuse = new Fuse(COMBINED_CATALOG, {
  keys: [
    { name: "title", weight: 0.7 },
    { name: "aliases", weight: 0.3 },
  ],
  threshold: 0.38,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

interface ImdbSuggestionItem {
  id?: string;
  l?: string; // title
  y?: number; // year
  qid?: string; // "movie" | "tvSeries" | ...
}

async function fetchImdbLiveSuggestions(
  query: string
): Promise<MovieSuggestion[]> {
  const clean = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  if (clean.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1600);

  try {
    const firstChar = clean[0];
    const encoded = encodeURIComponent(clean.replace(/\s+/g, "_"));
    const url = `https://v3.sg.media-imdb.com/suggestion/${firstChar}/${encoded}.json`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { d?: ImdbSuggestionItem[] };

    return (data.d ?? [])
      .filter(
        (item) =>
          Boolean(item.l) &&
          item.id?.startsWith("tt") &&
          (!item.qid ||
            item.qid === "movie" ||
            item.qid === "tvMovie" ||
            item.qid === "video")
      )
      .slice(0, 8)
      .map((item) => ({
        title: item.l!.trim(),
        year: item.y,
        source: "imdb" as const,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  // 1. Fast fuzzy search against our 180+ Telugu IMDb catalog
  const localMatches: MovieSuggestion[] = catalogFuse
    .search(q, { limit: 6 })
    .map((r) => ({
      title: r.item.title,
      year: r.item.year,
      source: "catalog" as const,
    }));

  // 2. Live enrichment from IMDb's suggestion CDN for any obscure or newly released film
  const imdbMatches = await fetchImdbLiveSuggestions(q);

  // Merge & deduplicate (Telugu catalog matches prioritized first!)
  const seen = new Set<string>();
  const merged: MovieSuggestion[] = [];

  for (const item of [...localMatches, ...imdbMatches]) {
    const norm = `${item.title.toLowerCase()}-${item.year ?? ""}`;
    const titleOnly = item.title.toLowerCase();
    if (!seen.has(norm) && !seen.has(titleOnly)) {
      seen.add(norm);
      seen.add(titleOnly);
      merged.push(item);
    }
    if (merged.length >= 7) break;
  }

  return NextResponse.json({ suggestions: merged });
}
