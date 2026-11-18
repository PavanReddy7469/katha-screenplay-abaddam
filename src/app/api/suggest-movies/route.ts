import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { TELUGU_IMDB_CATALOG } from "@/data/teluguCatalog";
import { getIstDateKey } from "@/lib/istDate";
import { getAllMovies } from "@/lib/movieStore";

export const dynamic = "force-dynamic";

export interface MovieSuggestion {
  title: string;
  year?: number;
  source: "catalog" | "imdb";
}

interface CatalogEntry {
  title: string;
  year?: number;
  aliases: string[];
}

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

  // Merge static Telugu IMDb catalog + live released vault movies (excluding future embargoed movies)
  const todayIst = getIstDateKey();
  const vaultMovies = await getAllMovies();
  const byTitle = new Map<string, CatalogEntry>();

  for (const item of TELUGU_IMDB_CATALOG) {
    byTitle.set(item.title.toLowerCase(), {
      title: item.title,
      year: item.year,
      aliases: item.aliases ?? [],
    });
  }

  for (const m of vaultMovies) {
    if (m.featuredDate && m.featuredDate > todayIst) continue;
    const key = m.title.toLowerCase();
    const existing = byTitle.get(key);
    byTitle.set(key, {
      title: m.title,
      year: m.year,
      aliases: Array.from(
        new Set([...(existing?.aliases ?? []), ...(m.alternateSpellings ?? [])])
      ),
    });
  }

  const catalogFuse = new Fuse(Array.from(byTitle.values()), {
    keys: [
      { name: "title", weight: 0.7 },
      { name: "aliases", weight: 0.3 },
    ],
    threshold: 0.38,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  // 1. Fast fuzzy search against Telugu catalog + released vault movies
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
