import fs from "fs";
import path from "path";
import defaultMoviesData from "@/data/movies.json";
import { Movie } from "./personas";

// In-memory cache to guarantee instant updates in server runtime
let cachedMovies: Movie[] | null = null;

function getMoviesFilePath(): string {
  return path.join(process.cwd(), "src", "data", "movies.json");
}

function getFallbackTempFilePath(): string {
  return path.join("/tmp", "cbfc_movies_vault.json");
}

export function getAllMovies(): Movie[] {
  if (cachedMovies && cachedMovies.length > 0) {
    return cachedMovies;
  }

  // 1. Try reading from main movies.json
  try {
    const filePath = getMoviesFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedMovies = parsed as Movie[];
        return cachedMovies;
      }
    }
  } catch (err) {
    console.warn("Could not read main movies.json, checking temp/default:", err);
  }

  // 2. Try reading from /tmp fallback (e.g. on serverless Vercel)
  try {
    const tmpPath = getFallbackTempFilePath();
    if (fs.existsSync(tmpPath)) {
      const raw = fs.readFileSync(tmpPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        cachedMovies = parsed as Movie[];
        return cachedMovies;
      }
    }
  } catch {
    // Ignore fallback read error
  }

  // 3. Fallback to imported default data
  cachedMovies = (defaultMoviesData as Movie[]) || [];
  return cachedMovies;
}

export function getMovieById(id: string): Movie | undefined {
  const movies = getAllMovies();
  return movies.find((m) => m.id === id);
}

export async function saveMovie(movie: Movie): Promise<{ success: boolean; movies: Movie[] }> {
  const currentMovies = getAllMovies();
  const index = currentMovies.findIndex((m) => m.id === movie.id);

  let updatedList: Movie[];
  if (index >= 0) {
    // Update existing
    updatedList = [...currentMovies];
    updatedList[index] = { ...updatedList[index], ...movie };
  } else {
    // Add new (prepend to list so newest appears at top)
    updatedList = [movie, ...currentMovies];
  }

  // Update in-memory cache immediately
  cachedMovies = updatedList;

  // Persist to disk
  let savedToDisk = false;
  try {
    const filePath = getMoviesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(updatedList, null, 2), "utf-8");
    savedToDisk = true;
  } catch (fsErr) {
    console.warn("Failed to write to src/data/movies.json (read-only file system?):", fsErr);
    try {
      const tmpPath = getFallbackTempFilePath();
      fs.writeFileSync(tmpPath, JSON.stringify(updatedList, null, 2), "utf-8");
      savedToDisk = true;
    } catch (tmpErr) {
      console.warn("Failed to write to /tmp fallback:", tmpErr);
    }
  }

  return { success: savedToDisk || true, movies: updatedList };
}

export async function deleteMovie(id: string): Promise<{ success: boolean; movies: Movie[] }> {
  const currentMovies = getAllMovies();
  const updatedList = currentMovies.filter((m) => m.id !== id);

  cachedMovies = updatedList;

  try {
    const filePath = getMoviesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(updatedList, null, 2), "utf-8");
  } catch {
    try {
      const tmpPath = getFallbackTempFilePath();
      fs.writeFileSync(tmpPath, JSON.stringify(updatedList, null, 2), "utf-8");
    } catch {
      // Ignore
    }
  }

  return { success: true, movies: updatedList };
}

export async function setMovieFeaturedDate(
  movieId: string,
  featuredDate: string
): Promise<{ success: boolean; movies: Movie[] }> {
  const currentMovies = getAllMovies();
  const updatedList = currentMovies.map((m) => {
    if (m.id === movieId) {
      return { ...m, featuredDate };
    }
    // If another movie had this featuredDate, unset it so there are no collisions
    if (m.featuredDate === featuredDate) {
      const { featuredDate: _, ...rest } = m;
      return rest as Movie;
    }
    return m;
  });

  cachedMovies = updatedList;

  try {
    const filePath = getMoviesFilePath();
    fs.writeFileSync(filePath, JSON.stringify(updatedList, null, 2), "utf-8");
  } catch {
    try {
      const tmpPath = getFallbackTempFilePath();
      fs.writeFileSync(tmpPath, JSON.stringify(updatedList, null, 2), "utf-8");
    } catch {
      // Ignore
    }
  }

  return { success: true, movies: updatedList };
}
