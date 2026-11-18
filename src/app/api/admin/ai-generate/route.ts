import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { isAuthenticated } from "@/lib/adminAuth";
import { Movie } from "@/lib/personas";

export const maxDuration = 30;

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

    const groqKey = process.env.GROQ_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (!groqKey && !geminiKey) {
      return NextResponse.json(
        {
          error:
            "No AI API key configured (neither GROQ_API_KEY nor GEMINI_API_KEY). Please configure an API key in your environment.",
        },
        { status: 500 }
      );
    }

    const prompt = `You are an elite Tollywood / Telugu cinema historian and database curator for the Indian Censor Board (CBFC).
Generate a rich, accurate, authentic Telugu movie dossier JSON for the film: "${movieTitle}".
${notes ? `Additional curator notes: ${notes}` : ""}

STRICT REQUIREMENTS:
1. "id": A clean kebab-case slug of the title (e.g. "hanu-man" or "kushi-2001").
2. "title": Official English title (e.g. "Hanu-Man").
3. "alternateSpellings": Array of 3-5 alternate spellings, typos, or Telugu romanized names (e.g. ["Hanuman", "Hanu Man", "HanuMan"]).
4. "year": Number (e.g. 2024).
5. "releaseMonth": String (e.g. "January 2024").
6. "hero": Lead actor/hero name.
7. "heroine": Lead actress/heroine name.
8. "director": Director name.
9. "music": Music director/composer name.
10. "genre": Cinematic genre string (e.g. "Mythological Superhero Fantasy / Action").
11. "tropes": Array of 5 to 6 distinct plot tropes, narrative hooks, and memorable elements.
12. "iconicProp": One specific iconic physical object, weapon, vehicle, or token from the movie.
13. "hint": A witty 1-sentence teaser summarizing the film without giving away the title.
14. "fullCast": Array of cast objects: [{ "name": string, "role": string, "aliases": string[] }] with at least 5-8 principal and comedy actors.
15. "fullCrew": Array of crew objects: [{ "name": string, "department": string, "aliases": string[] }] covering Director, Music, Producer, DOP, Stunt Master, Lyricist, Editor.
16. "eraTrivia": Array of 4-5 fascinating real-world facts (awards, box-office milestones, shoot locations, remakes, fan frenzy).
17. "iconicMoments": Array of 3 memorable scenes or elevations.
18. "pressHints": Array of 5 tiered clues unlocked progressively:
    - Index 0: id "h-1", category (e.g. "BOX OFFICE / PRODUCTION"), difficulty "HARD", headline, body (intriguing, does not name the hero directly), unlockAfterReel: 0
    - Index 1: id "h-2", category (e.g. "AWARDS / CRITICAL RECEPTION"), difficulty "MEDIUM", headline, body, unlockAfterReel: 1
    - Index 2: id "h-3", category (e.g. "TECHNICAL MASTERY"), difficulty "MEDIUM", headline, body, unlockAfterReel: 2
    - Index 3: id "h-4", category (e.g. "CAST & CREW TEAMS"), difficulty "WARM", headline, body, unlockAfterReel: 3
    - Index 4: id "h-5", category (e.g. "ICONIC SCENE & CLIMAX"), difficulty "EASY", headline, body (very clear reveal), unlockAfterReel: 4

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
      "id": "...",
      "category": "...",
      "difficulty": "HARD",
      "headline": "...",
      "body": "...",
      "unlockAfterReel": 0
    }
  ]
}`;

    // Try Groq first
    if (groqKey) {
      try {
        const groqModel = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });

        if (res.ok) {
          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = data.choices?.[0]?.message?.content ?? "";
          const parsed = JSON.parse(content) as Movie;
          return NextResponse.json({ success: true, movie: parsed, provider: "groq" });
        }
      } catch (groqErr) {
        console.warn("Groq AI generation failed, falling back to Gemini:", groqErr);
      }
    }

    // Try Gemini fallback
    if (geminiKey) {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const modelCandidates = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.7-flash"];
      for (const mName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({
            model: mName,
            generationConfig: { responseMimeType: "application/json" },
          });
          const result = await model.generateContent(prompt);
          const rawText = result.response.text();
          const parsed = JSON.parse(rawText) as Movie;
          return NextResponse.json({ success: true, movie: parsed, provider: "gemini" });
        } catch (gemErr) {
          console.warn(`Gemini model ${mName} failed:`, gemErr);
        }
      }
    }

    return NextResponse.json(
      { error: "AI generation failed across all available models." },
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
