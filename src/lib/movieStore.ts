import fs from "fs";
import path from "path";
import defaultMoviesData from "@/data/movies.json";
import { Movie } from "./personas";

export type StorageBackend = "redis" | "github" | "local-fs" | "ephemeral-tmp";

export interface StorageInfo {
  backend: StorageBackend;
  persistent: boolean;
  label: string;
  detail: string;
}

const REDIS_KEY = "cbfc:movies:vault:v1";
const GITHUB_DEFAULT_REPO = "PavanReddy7469/katha-screenplay-abaddam";
const GITHUB_DEFAULT_BRANCH = "main";
const GITHUB_MOVIES_PATH = "src/data/movies.json";
const CACHE_TTL_MS = 30_000;

let cachedMovies: Movie[] | null = null;
let cacheTimestamp = 0;

function getMoviesFilePath(): string {
  return path.join(process.cwd(), "src", "data", "movies.json");
}

function getFallbackTempFilePath(): string {
  return path.join("/tmp", "cbfc_movies_vault.json");
}

function getRedisConfig(): { url: string; token: string } | null {
  const url = (
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    ""
  )
    .trim()
    .replace(/\/+$/, "");
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    ""
  ).trim();

  if (url && token) {
    return { url, token };
  }
  return null;
}

function getGitHubConfig(): {
  token: string;
  repo: string;
  branch: string;
} | null {
  const token = (process.env.GITHUB_TOKEN || "").trim();
  if (!token) return null;

  const repo = (process.env.GITHUB_REPO || GITHUB_DEFAULT_REPO).trim();
  const branch = (process.env.GITHUB_BRANCH || GITHUB_DEFAULT_BRANCH).trim();
  return { token, repo, branch };
}

export function getStorageInfo(): StorageInfo {
  if (getRedisConfig()) {
    return {
      backend: "redis",
      persistent: true,
      label: "UPSTASH REDIS CLOUD VAULT",
      detail:
        "All scheduled films persist permanently in Redis and unlock automatically at 12:00 AM IST.",
    };
  }

  const gh = getGitHubConfig();
  if (gh) {
    return {
      backend: "github",
      persistent: true,
      label: "GITHUB REPO PERMANENT SYNC",
      detail: `Changes commit directly to ${gh.repo} (${gh.branch}) and unlock automatically at 12:00 AM IST.`,
    };
  }

  if (process.env.VERCEL === "1" || process.env.VERCEL_ENV) {
    return {
      backend: "ephemeral-tmp",
      persistent: false,
      label: "TEMPORARY /TMP STORAGE (NEEDS SETUP)",
      detail:
        "Vercel's filesystem resets on cold starts. Add GITHUB_TOKEN (or connect Upstash Redis) in Vercel Environment Variables so films added here survive permanently until 12:00 AM IST.",
    };
  }

  return {
    backend: "local-fs",
    persistent: true,
    label: "LOCAL DISK (movies.json)",
    detail: "Changes write directly to src/data/movies.json on this machine.",
  };
}

function readLocalMovies(): Movie[] {
  try {
    const filePath = getMoviesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Movie[];
      }
    }
  } catch {
    // Ignore local read failure
  }

  try {
    const tmpPath = getFallbackTempFilePath();
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as Movie[];
      }
    }
  } catch {
    // Ignore /tmp read failure
  }

  return (defaultMoviesData as Movie[]) || [];
}

async function readFromRedis(): Promise<Movie[] | null> {
  const cfg = getRedisConfig();
  if (!cfg) return null;

  try {
    const res = await fetch(`${cfg.url}/get/${encodeURIComponent(REDIS_KEY)}`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { result?: string | Movie[] | null };
    if (!data.result) return null;

    const parsed =
      typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as Movie[];
    }
  } catch (err) {
    console.warn("Redis read failed:", err);
  }
  return null;
}

async function writeToRedis(movies: Movie[]): Promise<boolean> {
  const cfg = getRedisConfig();
  if (!cfg) return false;

  try {
    const res = await fetch(`${cfg.url}/set/${encodeURIComponent(REDIS_KEY)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(movies),
      cache: "no-store",
    });
    return res.ok;
  } catch (err) {
    console.warn("Redis write failed:", err);
    return false;
  }
}

async function fetchGitHubFile(): Promise<{
  movies: Movie[];
  sha: string;
} | null> {
  const gh = getGitHubConfig();
  if (!gh) return null;

  try {
    const url = `https://api.github.com/repos/${gh.repo}/contents/${GITHUB_MOVIES_PATH}?ref=${encodeURIComponent(
      gh.branch
    )}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${gh.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`GitHub read failed [${res.status}]:`, await res.text());
      return null;
    }

    const data = (await res.json()) as { content?: string; sha?: string };
    if (!data.content || !data.sha) return null;

    const decoded = Buffer.from(
      data.content.replace(/\n/g, ""),
      "base64"
    ).toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return { movies: parsed as Movie[], sha: data.sha };
    }
  } catch (err) {
    console.warn("GitHub read error:", err);
  }
  return null;
}

async function writeToGitHub(
  movies: Movie[],
  commitMessage: string
): Promise<boolean> {
  const gh = getGitHubConfig();
  if (!gh) return false;

  try {
    const existing = await fetchGitHubFile();
    const url = `https://api.github.com/repos/${gh.repo}/contents/${GITHUB_MOVIES_PATH}`;
    const contentBase64 = Buffer.from(
      JSON.stringify(movies, null, 2) + "\n",
      "utf-8"
    ).toString("base64");

    const res = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${gh.token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch: gh.branch,
        ...(existing?.sha ? { sha: existing.sha } : {}),
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`GitHub write failed [${res.status}]:`, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.warn("GitHub write error:", err);
    return false;
  }
}

async function persistMovies(
  updatedList: Movie[],
  commitMessage: string
): Promise<{ persistent: boolean; storage: StorageInfo }> {
  cachedMovies = updatedList;
  cacheTimestamp = Date.now();

  const storage = getStorageInfo();

  // 1. Upstash Redis / Vercel KV
  if (getRedisConfig()) {
    const ok = await writeToRedis(updatedList);
    if (ok) {
      return { persistent: true, storage };
    }
  }

  // 2. GitHub Repository Contents API
  if (getGitHubConfig()) {
    const ok = await writeToGitHub(updatedList, commitMessage);
    if (ok) {
      return { persistent: true, storage };
    }
  }

  // 3. Local filesystem (works in local dev; read-only on Vercel)
  try {
    const filePath = getMoviesFilePath();
    fs.writeFileSync(
      filePath,
      JSON.stringify(updatedList, null, 2) + "\n",
      "utf-8"
    );
    return { persistent: true, storage };
  } catch {
    // 4. Ephemeral /tmp fallback on Vercel when no cloud backend is configured
    try {
      const tmpPath = getFallbackTempFilePath();
      fs.writeFileSync(
        tmpPath,
        JSON.stringify(updatedList, null, 2),
        "utf-8"
      );
    } catch {
      // Ignore /tmp write error
    }
    return {
      persistent: false,
      storage: {
        backend: "ephemeral-tmp",
        persistent: false,
        label: "TEMPORARY /TMP STORAGE (NEEDS SETUP)",
        detail:
          "Saved temporarily in memory/tmp only. Add GITHUB_TOKEN or Upstash Redis in Vercel Environment Variables so scheduled movies persist permanently until 12:00 AM IST.",
      },
    };
  }
}

export async function getAllMovies(options?: {
  forceFresh?: boolean;
}): Promise<Movie[]> {
  const now = Date.now();
  if (
    !options?.forceFresh &&
    cachedMovies &&
    cachedMovies.length > 0 &&
    now - cacheTimestamp < CACHE_TTL_MS
  ) {
    return cachedMovies;
  }

  // 1. Upstash Redis / Vercel KV
  if (getRedisConfig()) {
    const redisMovies = await readFromRedis();
    if (redisMovies && redisMovies.length > 0) {
      cachedMovies = redisMovies;
      cacheTimestamp = now;
      return redisMovies;
    }
    // Seed Redis on very first run from bundled movies.json
    const seed = readLocalMovies();
    await writeToRedis(seed);
    cachedMovies = seed;
    cacheTimestamp = now;
    return seed;
  }

  // 2. GitHub Live Repository File
  if (getGitHubConfig()) {
    const ghFile = await fetchGitHubFile();
    if (ghFile && ghFile.movies.length > 0) {
      cachedMovies = ghFile.movies;
      cacheTimestamp = now;
      return ghFile.movies;
    }
  }

  // 3. Local disk / /tmp / bundled movies.json fallback
  const local = readLocalMovies();
  cachedMovies = local;
  cacheTimestamp = now;
  return local;
}

export async function getMovieById(id: string): Promise<Movie | undefined> {
  const movies = await getAllMovies();
  return movies.find((m) => m.id === id);
}

export async function saveMovie(movie: Movie): Promise<{
  success: boolean;
  persistent: boolean;
  storage: StorageInfo;
  movies: Movie[];
}> {
  const currentMovies = await getAllMovies({ forceFresh: true });
  const index = currentMovies.findIndex((m) => m.id === movie.id);

  // Prevent duplicate date collisions: if another movie had this featuredDate, clear it
  const cleanedMovies = movie.featuredDate
    ? currentMovies.map((m) => {
        if (m.id !== movie.id && m.featuredDate === movie.featuredDate) {
          const rest = { ...m };
          delete rest.featuredDate;
          return rest;
        }
        return m;
      })
    : [...currentMovies];

  let updatedList: Movie[];
  if (index >= 0) {
    updatedList = [...cleanedMovies];
    updatedList[index] = { ...updatedList[index], ...movie };
  } else {
    updatedList = [...cleanedMovies, movie];
  }

  const action = index >= 0 ? "update" : "schedule";
  const dateTag = movie.featuredDate ? ` for ${movie.featuredDate}` : "";
  const commitMsg = `chore(vault): ${action} "${movie.title}"${dateTag} via CBFC Admin`;

  const { persistent, storage } = await persistMovies(updatedList, commitMsg);
  return { success: true, persistent, storage, movies: updatedList };
}

export async function deleteMovie(id: string): Promise<{
  success: boolean;
  persistent: boolean;
  storage: StorageInfo;
  movies: Movie[];
}> {
  const currentMovies = await getAllMovies({ forceFresh: true });
  const target = currentMovies.find((m) => m.id === id);
  const updatedList = currentMovies.filter((m) => m.id !== id);

  const commitMsg = `chore(vault): remove "${target?.title || id}" via CBFC Admin`;
  const { persistent, storage } = await persistMovies(updatedList, commitMsg);
  return { success: true, persistent, storage, movies: updatedList };
}

export async function setMovieFeaturedDate(
  movieId: string,
  featuredDate: string
): Promise<{
  success: boolean;
  persistent: boolean;
  storage: StorageInfo;
  movies: Movie[];
}> {
  const currentMovies = await getAllMovies({ forceFresh: true });
  const target = currentMovies.find((m) => m.id === movieId);

  const updatedList = currentMovies.map((m) => {
    if (m.id === movieId) {
      return { ...m, featuredDate };
    }
    if (m.featuredDate === featuredDate) {
      const rest = { ...m };
      delete rest.featuredDate;
      return rest;
    }
    return m;
  });

  const commitMsg = `chore(vault): schedule "${target?.title || movieId}" for ${featuredDate} via CBFC Admin`;
  const { persistent, storage } = await persistMovies(updatedList, commitMsg);
  return { success: true, persistent, storage, movies: updatedList };
}
