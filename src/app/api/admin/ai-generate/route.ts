import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/adminAuth";
import { Movie } from "@/lib/personas";

export const maxDuration = 30;

const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
];

export async function POST(req: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { movieTitle, notes } = await req.json();

    if (!movieTitle || typeof movieTitle !== "string") {
      return NextResponse.json(
        { error: "Valid Telugu movie title is required." },
        { status: 400 }
      );
    }

    const groqKey = process.env.GROQ_API_KEY?.trim()
      .replace(/^GROQ_API_KEY\s*=\s*/i, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    if (!groqKey) {
      return NextResponse.json(
        {
          error:
            "GROQ_API_KEY is not configured. Please add GROQ_API_KEY in your environment variables.",
        },
        { status: 500 }
      );
    }

    const prompt = `You are an elite Tollywood / Telugu cinema historian and database curator for the Indian Censor Board (CBFC).
Generate a rich, accurate, verified Telugu movie dossier JSON for the film: "${movieTitle}".
${notes ? `Additional curator notes: ${notes}` : ""}

STRICT REQUIREMENTS:
1. "id": A clean kebab-case slug of the title (e.g. "hanu-man" or "kushi-2001").
2. "title": Official English title (e.g. "Hanu-Man").
3. "alternateSpellings": Array of 3-5 alternate spellings, typos, or Telugu romanized names.
4. "year": Number (exact theatrical release year).
5. "releaseMonth": String (e.g. "January 2024").
6. "hero": Lead actor/hero name.
7. "heroine": Lead actress/heroine name.
8. "director": Director name.
9. "music": Music director/composer name.
10. "genre": Cinematic genre string (e.g. "Action Comedy / Family Entertainer").
11. "tropes": Array of 5 to 6 distinct plot tropes, narrative hooks, and memorable elements.
12. "iconicProp": One specific iconic physical object, weapon, vehicle, or token from the movie.
13. "hint": A witty 1-sentence teaser summarizing the film without giving away the title.
14. "fullCast": Array of cast objects: [{ "name": string, "role": string, "aliases": string[] }] with at least 6-8 principal, villain, and comedy actors.
15. "fullCrew": Array of crew objects: [{ "name": string, "department": string, "aliases": string[] }] covering Director, Music, Producer, DOP, Stunt Master, Lyricist, Editor.
16. "eraTrivia": Array of 4-5 fascinating real-world facts (awards, box-office milestones, shoot locations, remakes, fan frenzy).
17. "iconicMoments": Array of 3 memorable scenes or elevations.
18. "pressHints": Array of 5 strictly NON-SPOILER tiered clues ordered HARD -> EASY (NEVER name the movie title, NEVER name the hero/heroine/director directly, and NEVER state the exact release year in any pressHint!):
    - Index 0: id "h-1", category (e.g. "PRODUCTION FILE"), difficulty "HARD", headline, body (very subtle behind-the-scenes/shoot clue), unlockAfterReel: 1
    - Index 1: id "h-2", category (e.g. "BOX OFFICE & BUZZ"), difficulty "HARD", headline, body (subtle release/record clue without year), unlockAfterReel: 2
    - Index 2: id "h-3", category (e.g. "CREW SIGNATURE"), difficulty "MEDIUM", headline, body (music/cinematography/technical clue without naming director), unlockAfterReel: 3
    - Index 3: id "h-4", category (e.g. "SCREENPLAY HOOK"), difficulty "WARM", headline, body (memorable premise or comedy setup clue), unlockAfterReel: 4
    - Index 4: id "h-5", category (e.g. "CULT MEMORY"), difficulty "EASY", headline, body (clear iconic prop/climax vibe clue without naming title or lead actor), unlockAfterReel: 5

RETURN STRICT JSON ONLY MATCHING THIS SCHEMA:
{
  "id": "...",
  "title": "...",
  "alternateSpellings": ["..."],
  "year": 2024,
  "releaseMonth": "January 2024",
  "hero": "...",
  "heroine": "...",
  "director": "...",
  "music": "...",
  "genre": "...",
  "tropes": ["..."],
  "iconicProp": "...",
  "hint": "...",
  "fullCast": [
    { "name": "...", "role": "...", "aliases": ["..."] }
  ],
  "fullCrew": [
    { "name": "...", "department": "...", "aliases": ["..."] }
  ],
  "eraTrivia": ["..."],
  "iconicMoments": ["..."],
  "pressHints": [
    {
      "id": "h-1",
      "category": "...",
      "difficulty": "HARD",
      "headline": "...",
      "body": "...",
      "unlockAfterReel": 1
    }
  ]
}`;

    let lastError = "Groq generation failed";

    for (const modelName of GROQ_MODELS) {
      try {
        const res = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: "system",
                  content:
                    "You are a verified Telugu cinema archivist that outputs strictly valid JSON matching the requested schema.",
                },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_object" },
              temperature: 0.5,
            }),
          }
        );

        if (!res.ok) {
          lastError = `[${res.status}] ${await res.text()}`;
          continue;
        }

        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
        const stripped = raw
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const jsonMatch = stripped.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : stripped) as Movie;

        return NextResponse.json({
          success: true,
          movie: parsed,
          provider: `groq (${modelName})`,
        });
      } catch (groqErr) {
        lastError =
          groqErr instanceof Error ? groqErr.message : String(groqErr);
        console.warn(`Groq model ${modelName} failed:`, lastError);
      }
    }

    return NextResponse.json(
      { error: `Groq AI generation failed: ${lastError}` },
      { status: 500 }
    );
  } catch (err) {
    console.error("ai-generate error:", err);
    return NextResponse.json(
      { error: "Internal error during movie generation" },
      { status: 500 }
    );
  }
}
