import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import moviesData from "@/data/movies.json";
import { isAuthenticated } from "@/lib/adminAuth";
import { getIstDateKey } from "@/lib/istDate";
import { getMovieById } from "@/lib/movieStore";
import {
  BENCH_HECKLES,
  evaluateLieRule,
  GameModeId,
  Movie,
  PERSONAS,
  PersonaId,
  rollTurnLieMap,
  selectPanelForTurn,
} from "@/lib/personas";

export const maxDuration = 30;

const MOVIES = moviesData as Movie[];

interface HistoryItem {
  role: "user" | "witness";
  speaker?: PersonaId;
  text: string;
}

interface InterrogateRequest {
  movieId: string;
  movieData?: Movie;
  personaId?: GameModeId;
  question: string;
  questionNumber: number;
  gajalaLieReels?: number[];
  history?: HistoryItem[];
}

interface PanelStatement {
  personaId: PersonaId;
  reply: string;
  wasLie: boolean;
  claimedAnswer: "YES" | "NO";
}

type GroundTruth = "YES" | "NO" | "UNCERTAIN";
type QuestionTopic =
  | "cast"
  | "crew"
  | "year"
  | "hype"
  | "comedy"
  | "action"
  | "general";

const SHORT_CINEMA_ACRONYMS = new Set([
  "rrr",
  "ntr",
  "dsp",
  "dop",
  "vfx",
  "cgi",
  "cbi",
  "ips",
  "bgm",
  "ssr",
  "mmk",
  "avpl",
  "tv",
  "maa",
]);

const NON_QUESTION_FILLERS = new Set([
  "hi",
  "hello",
  "hey",
  "hii",
  "yo",
  "sup",
  "test",
  "testing",
  "asdf",
  "asdfg",
  "qwerty",
  "lol",
  "lmao",
  "haha",
  "bruh",
  "bro",
  "wtf",
  "ok",
  "okay",
  "yes",
  "no",
  "idk",
  "nothing",
  "random",
  "shit",
  "blah",
  "blabla",
  "abc",
  "xyz",
]);

const KNOWN_TOL_PEOPLE = [
  "mahesh babu",
  "mahesh",
  "ram charan",
  "ramcharan",
  "jr ntr",
  "ntr",
  "tarak",
  "prabhas",
  "allu arjun",
  "alluarjun",
  "pawan kalyan",
  "pavan kalyan",
  "pawan",
  "pavan",
  "chiranjeevi",
  "chiru",
  "balakrishna",
  "balayya",
  "nagarjuna",
  "venkatesh",
  "nani",
  "vijay deverakonda",
  "ravi teja",
  "raviteja",
  "siddharth",
  "rana daggubati",
  "rana",
  "sharwanand",
  "varun tej",
  "naga chaitanya",
  "nithiin",
  "nitin",
  "ram pothineni",
  "gopichand",
  "samantha",
  "kajal",
  "anushka",
  "tamannaah",
  "tamanna",
  "rashmika",
  "pooja hegde",
  "ileana",
  "genelia",
  "alia bhatt",
  "trisha",
  "sai pallavi",
  "keerthy suresh",
  "sreeleela",
  "shruti haasan",
  "rakul preet",
  "raashi khanna",
  "mrunal thakur",
  "rajamouli",
  "trivikram",
  "sukumar",
  "puri jagannadh",
  "puri",
  "boyapati",
  "koratala siva",
  "sandeep reddy vanga",
  "vamshi paidipally",
  "sekhar kammula",
  "nag ashwin",
  "prashanth neel",
  "harish shankar",
  "anil ravipudi",
  "bhaskar",
  "mani sharma",
  "keeravani",
  "devi sri prasad",
  "dsp",
  "thaman",
  "anirudh",
  "mickey j meyer",
  "ilayaraja",
  "rahman",
  "brahmanandam",
  "prakash raj",
  "sunil",
  "ali",
  "vennela kishore",
  "sonu sood",
  "jagapathi babu",
  "rao ramesh",
  "fahadh faasil",
  "kota srinivasa rao",
  "sayaji shinde",
  "nassar",
  "tanikella bharani",
  "brahmaji",
  "rajiv kanakala",
  "rahul dev",
  "murali mohan",
  "k v guhan",
  "kv guhan",
  "guhan",
  "sreekar prasad",
  "peter hein",
  "sirivennela",
  "thota tharani",
  "k viswanath",
  "viswanath",
  "allu aravind",
  "geetha arts",
  "senthil kumar",
  "kk senthil kumar",
  "kotagiri",
  "vijayendra prasad",
  "dev gill",
  "srihari",
  "sarath babu",
  "chandrabose",
  "mumaith khan",
  "kim sharma",
  "kamalakannan",
  "ravinder",
  "rathnavelu",
  "naveen nooli",
  "mythri",
  "mythri movie makers",
  "ram lakshman",
  "aadhi pinisetty",
  "aadhi",
  "anasuya",
  "naresh",
  "rohini",
  "ajay ghosh",
  "sudeep",
  "kiccha sudeep",
  "sai korrapati",
  "vaaraahi",
  "makuta",
  "srinivasa reddy",
  "thagubothu ramesh",
  "dhanraj",
  "ramajogayya sastry",
];

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesAlias(questionLower: string, alias: string): boolean {
  const clean = alias.toLowerCase().replace(/\./g, "").trim();
  if (!clean) return false;
  const qNorm = questionLower.replace(/\./g, " ");
  const regex = new RegExp(`\\b${escapeRegex(clean)}\\b`, "i");
  return regex.test(qNorm);
}

function isObviousGibberish(rawQuestion: string): boolean {
  const trimmed = rawQuestion.trim();
  const clean = trimmed
    .toLowerCase()
    .replace(/^(cast|crew|cast\/crew|person|actor|actress|director|music|hero|heroine|year|release\s*year|release)\s*:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();

  if (!clean) return true;
  if (/^(19\d{2}|20\d{2})$/.test(clean)) return false;
  if (/\b(19\d{2}|20\d{2})\b/.test(clean)) return false;
  if (SHORT_CINEMA_ACRONYMS.has(clean)) return false;
  if (KNOWN_TOL_PEOPLE.some((person) => matchesAlias(clean, person))) return false;
  if (clean.length < 3) return true;
  if (NON_QUESTION_FILLERS.has(clean)) return true;
  if (/^(.)\1+$/.test(clean.replace(/\s+/g, ""))) return true;

  const words = clean.split(/\s+/).filter(Boolean);
  if (
    words.every(
      (w) =>
        NON_QUESTION_FILLERS.has(w) ||
        (/^\d+$/.test(w) && !/^(19\d{2}|20\d{2})$/.test(w))
    )
  ) {
    return true;
  }

  if (words.length === 1) {
    const w = words[0];
    if (!/[aeiouy]/.test(w) && !SHORT_CINEMA_ACRONYMS.has(w)) {
      return true;
    }
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(w)) {
      return true;
    }
  }

  const validWords = words.filter(
    (w) =>
      /[aeiouy]/.test(w) ||
      SHORT_CINEMA_ACRONYMS.has(w) ||
      /^(19\d{2}|20\d{2})$/.test(w)
  );
  return validWords.length === 0;
}

function getInvalidQuestionRoast(
  personaId: PersonaId,
  rawQuestion: string,
  history: HistoryItem[]
): string {
  const snippet = rawQuestion.trim().slice(0, 24);
  const roasts: Record<PersonaId, string[]> = {
    relangi: [
      `Haha babu, "${snippet}" ante secret cinema code aa? Manushulu ante ne manchollu, kaani proper Yes/No movie question adugu raa—reel cut avvaledu!`,
      `Ayyo babu, "${snippet}" artham kaaledu! Ask about a hero, director, year, song, or award—your film reel is completely safe!`,
      `Choodu babu, smile tho oka real Tollywood Yes/No question adugu! "${snippet}" ki answer ela cheppanu? No reel deducted!`,
    ],
    gajala: [
      `Ayyo, "${snippet}" ante enti sir?! Washing machine keyboard meeda padinda? Ask a proper Yes/No cinema question—CEO Gajala refunded your reel!`,
      `Brain use cheyyandi! "${snippet}" is syntax error in Washington D.C. standards! Ask about cast, crew, release year, or hype—no reel cut!`,
      `Hello, Sonic Solutions customer care kaadu idi! "${snippet}" is total corporate junk data. Ask a real Yes/No movie question—reel saved!`,
    ],
    pandey: [
      `FRUSTRATION! What is "${snippet}"?! Are you typing with your elbows in my screening room?! Ask a real Yes/No movie question—no reel cut!`,
      `Point ki raa! "${snippet}" makes zero sense! Ask about an actor, director, year, or scene before I lose my temper—reel refunded!`,
      `Inspector Kill Bill Pandey doesn't answer gibberish like "${snippet}"! Ask a proper Yes/No question—your reel is still intact!`,
    ],
  };

  const used = new Set(
    history.filter((h) => h.role === "witness").map((h) => h.text.trim())
  );
  const options = roasts[personaId];
  const fresh = options.filter((line) => !used.has(line));
  const pool = fresh.length > 0 ? fresh : options;
  return pool[rawQuestion.length % pool.length];
}

function detectTopic(rawQuestion: string): QuestionTopic {
  const q = rawQuestion.toLowerCase();

  if (
    /\b(19\d{2}|20\d{2}|year|release|released|decade|80s|90s|2000s|2010s|2020s|january|february|march|april|may|june|july|august|september|october|november|december|old|recent|classic)\b/.test(
      q
    )
  ) {
    return "year";
  }
  if (
    /\b(direct|director|directed|music|compos\w*|cinematograph\w*|dop|cameraman|editor|editing|produc\w*|banner|lyric\w*|stunt\w*|choreograph\w*|writer|written|art director)\b/.test(
      q
    )
  ) {
    return "crew";
  }
  if (
    /\b(tv|maa tv|telecast|award|nandi|filmfare|national|oscar|box office|overseas|remake|hindi|bengali|poland|kurnool|1000 days|hype|record|delay|shoot|budget|hit|blockbuster|cult|meme|cameo|remix)\b/.test(
      q
    )
  ) {
    return "hype";
  }
  if (
    /\b(brahmanandam|brahmi|sunil|comedy|funny|laugh|joke|pappu|humor)\b/.test(q)
  ) {
    return "comedy";
  }
  if (
    /\b(action|fight|fights|fighting|stunt|sniper|gun|rain|train|faction|mass|revenge|police|cbi|sword|horse|war|battle|helicopter)\b/.test(
      q
    )
  ) {
    return "action";
  }
  if (
    /\b(hero|heroine|actor|actress|acted|act|cast|starring|played|villain|cameo|role)\b/.test(
      q
    ) ||
    KNOWN_TOL_PEOPLE.some((person) => matchesAlias(q, person))
  ) {
    return "cast";
  }
  return "general";
}

function looksLikeRealMovieQuestion(rawQuestion: string): boolean {
  const q = rawQuestion.toLowerCase().trim();
  const words = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    // Starts with or contains standard English question/movie verbs or ends with "?"
    if (
      q.endsWith("?") ||
      /\b(is|are|was|were|did|does|do|has|have|had|can|will|acted|act|star|starring|hero|heroine|director|directed|music|composer|movie|film|release|released|year|song|fight|love|comedy|action|award|shot|remake|villain|cameo|producer|banner|character|story|scene|role|cast|crew|telugu)\b/.test(
        q
      )
    ) {
      return true;
    }
  }
  return false;
}

function evaluateMovieFact(movie: Movie, rawQuestion: string): GroundTruth {
  const q = rawQuestion.toLowerCase().trim();
  const qNorm = q
    .replace(/^(cast|crew|cast\/crew|person|actor|actress|director|music|hero|heroine|year|release\s*year|release)\s*:\s*/i, "")
    .replace(/\./g, " ")
    .trim();

  // 1. Check "between YYYY and YYYY"
  const betweenMatch = q.match(
    /between\s+(19\d{2}|20\d{2})\s+(?:and|to|-)\s+(19\d{2}|20\d{2})/
  );
  if (betweenMatch) {
    const start = parseInt(betweenMatch[1], 10);
    const end = parseInt(betweenMatch[2], 10);
    return movie.year >= Math.min(start, end) &&
      movie.year <= Math.max(start, end)
      ? "YES"
      : "NO";
  }

  // 2. Check "2015 or before", "before 2015", "<= 2015", "prior to 2015"
  const orBeforeMatch = q.match(
    /(?:(?:on\s+or\s+)?(?:before|earlier\s+than|prior\s+to|<=)\s*(19\d{2}|20\d{2})|(19\d{2}|20\d{2})\s*(?:or\s+before|or\s+earlier|<=))/
  );
  if (orBeforeMatch) {
    const yr = parseInt(orBeforeMatch[1] || orBeforeMatch[2], 10);
    return movie.year <= yr ? "YES" : "NO";
  }

  // 3. Check "2015 or after", "after 2015", ">= 2015", "later than 2015", "2015+"
  const orAfterMatch = q.match(
    /(?:(?:on\s+or\s+)?(?:after|later\s+than|since|newer\s+than|post|>=)\s*(19\d{2}|20\d{2})|(19\d{2}|20\d{2})\s*(?:or\s+after|or\s+later|>=|\+))/
  );
  if (orAfterMatch) {
    const yr = parseInt(orAfterMatch[1] || orAfterMatch[2], 10);
    return movie.year >= yr ? "YES" : "NO";
  }

  // 4. Exact release year check (e.g. "2015")
  const exactYearMatch = q.match(/\b(19\d{2}|20\d{2})\b/);
  if (exactYearMatch) {
    return movie.year === parseInt(exactYearMatch[1], 10) ? "YES" : "NO";
  }

  if (/\b(1980s|80s|eighties)\b/.test(q)) {
    return movie.year >= 1980 && movie.year <= 1989 ? "YES" : "NO";
  }
  if (/\b(1990s|90s|nineties)\b/.test(q)) {
    return movie.year >= 1990 && movie.year <= 1999 ? "YES" : "NO";
  }
  if (/\b(2000s|two thousands)\b/.test(q)) {
    return movie.year >= 2000 && movie.year <= 2009 ? "YES" : "NO";
  }
  if (/\b(2010s)\b/.test(q)) {
    return movie.year >= 2010 && movie.year <= 2019 ? "YES" : "NO";
  }
  if (/\b(2020s|recent|covid|pandemic)\b/.test(q)) {
    return movie.year >= 2020 ? "YES" : "NO";
  }
  if (
    movie.releaseMonth &&
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/.test(
      q
    )
  ) {
    const monthAsked = q.match(
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/
    )?.[1];
    if (monthAsked) {
      return movie.releaseMonth.toLowerCase().includes(monthAsked)
        ? "YES"
        : "NO";
    }
  }

  const askingAboutDirection = /\b(direct|director|directed)\b/.test(q);
  const askingAboutMusic = /\b(music|composer|composed|score|bgm)\b/.test(q);
  const askingAboutHero = /\b(hero|lead actor)\b/.test(q);
  const askingAboutHeroine = /\b(heroine|lead actress)\b/.test(q);

  if (movie.fullCrew && movie.fullCrew.length > 0) {
    for (const crew of movie.fullCrew) {
      const names = [crew.name, ...(crew.aliases ?? [])];
      if (names.some((alias) => matchesAlias(qNorm, alias))) {
        const dept = crew.department.toLowerCase();
        if (askingAboutMusic && !dept.includes("music")) return "NO";
        if (askingAboutDirection && !dept.includes("director")) return "NO";
        return "YES";
      }
    }
  }

  if (movie.fullCast && movie.fullCast.length > 0) {
    for (const member of movie.fullCast) {
      const names = [member.name, ...(member.aliases ?? [])];
      if (names.some((alias) => matchesAlias(qNorm, alias))) {
        const roleLower = member.role.toLowerCase();
        if (askingAboutDirection) return "NO";
        if (askingAboutMusic) return "NO";
        if (askingAboutHero && !roleLower.includes("hero")) return "NO";
        if (askingAboutHeroine && !roleLower.includes("heroine")) return "NO";
        return "YES";
      }
    }
  }

  // Fuzzy cast/crew check via Fuse.js (handles typos like "rajmouli", "samanta", "sudeepa")
  const queryTokens = qNorm
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !/^(does|this|movie|film|have|there|with|from|that|what|about|made|release|released|directed|director|hero|heroine|acted|acting|actor|actress|music|composer|worked|starring|played|character|telugu|cinema|song|songs|fight|fights|love|story|award|awards)$/.test(
          w
        )
    );

  const queryPhrases: string[] = [...queryTokens];
  for (let i = 0; i < queryTokens.length - 1; i++) {
    queryPhrases.push(`${queryTokens[i]} ${queryTokens[i + 1]}`);
  }

  if (queryPhrases.length > 0) {
    const moviePeopleEntries = [
      ...(movie.fullCast?.flatMap((c) => [c.name, ...(c.aliases ?? [])]) ?? []),
      ...(movie.fullCrew?.flatMap((c) => [c.name, ...(c.aliases ?? [])]) ?? []),
    ].map((n) => n.toLowerCase().replace(/\./g, " ").trim());

    if (moviePeopleEntries.length > 0) {
      const moviePeopleFuse = new Fuse(moviePeopleEntries, {
        threshold: 0.24,
        includeScore: true,
        minMatchCharLength: 4,
      });

      for (const phrase of queryPhrases) {
        const res = moviePeopleFuse.search(phrase);
        if (res.length > 0 && (res[0].score ?? 1) <= 0.24) {
          if (
            askingAboutDirection &&
            !movie.director.toLowerCase().includes(res[0].item)
          ) {
            return "NO";
          }
          if (
            askingAboutMusic &&
            !movie.music.toLowerCase().includes(res[0].item)
          ) {
            return "NO";
          }
          return "YES";
        }
      }
    }
  }

  const movieCastCrewText = [
    movie.hero,
    movie.heroine,
    movie.director,
    movie.music,
    ...(movie.fullCast?.flatMap((c) => [c.name, ...(c.aliases ?? [])]) ?? []),
    ...(movie.fullCrew?.flatMap((c) => [c.name, ...(c.aliases ?? [])]) ?? []),
  ]
    .join(" ")
    .toLowerCase()
    .replace(/\./g, " ");

  for (const person of KNOWN_TOL_PEOPLE) {
    if (matchesAlias(qNorm, person)) {
      return movieCastCrewText.includes(person) ? "YES" : "NO";
    }
  }

  const fullDossierText = [
    movie.title,
    movie.genre,
    movie.iconicProp,
    movie.hint,
    ...(movie.tropes ?? []),
    ...(movie.eraTrivia ?? []),
    ...(movie.iconicMoments ?? []),
    ...(movie.pressHints?.map((h) => `${h.headline} ${h.body}`) ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const domainChecks: Array<[RegExp, string[]]> = [
    [
      /\b(maa tv|star maa|television|tv telecast|satellite|sunday)\b/,
      ["maa tv", "telecast"],
    ],
    [
      /\b(national award|national film award)\b/,
      ["national film award", "national award"],
    ],
    [/\b(nandi award|nandi)\b/, ["nandi"]],
    [/\b(filmfare)\b/, ["filmfare"]],
    [/\b(oscar|academy award|naatu)\b/, ["oscar", "naatu"]],
    [
      /\b(1000 days|thousand days|kurnool|industry hit|box office record|non-baahubali|200 crore)\b/,
      ["1,000", "kurnool", "industry hit", "non-baahubali", "200+ crore"],
    ],
    [/\b(audiography|sound mixing|sound design)\b/, ["audiography", "sound mixing"]],
    [/\b(fly|housefly|insect|makkhi|micro-art|miniature|goggles|billionaire|mansion|kannada)\b/, ["fly", "housefly", "makkhi", "micro-art", "miniature", "goggles", "billionaire", "kannada"]],
    [/\b(toronto|cannes|festival|shanghai|tamil|naan ee)\b/, ["toronto", "cannes", "festival", "shanghai", "naan ee", "tamil"]],
    [/\b(godavari|konaseema|rajahmundry|lungi|pump|motor|deaf|hearing|election)\b/, ["godavari", "konaseema", "rajahmundry", "lungi", "pump", "motor", "deaf", "election"]],
    [/\b(item song|special song|jigelu|cameo|guest appearance|remix)\b/, ["cameo", "remix", "guest", "special song", "jigelu"]],
    [
      /\b(kutch|badami|rajasthan|desert|fort|horse|chariot|sword)\b/,
      ["kutch", "badami", "rajasthan", "horse", "chariot", "sword"],
    ],
    [
      /\b(vfx|special effects|cgi|choreograph\w*)\b/,
      ["special effects", "vfx", "choreograph"],
    ],
    [/\b(poland|europe|foreign)\b/, ["poland", "europe"]],
    [
      /\b(remake|remade|hindi|bengali)\b/,
      ["remade", "remake", "hindi", "bengali"],
    ],
    [/\b(overseas|usa|us box office)\b/, ["overseas", "united states"]],
    [
      /\b(delay|3 years|three years|long production)\b/,
      ["three years", "delay"],
    ],
    [
      /\b(first collaboration|first time|first film together)\b/,
      ["first collaboration", "first feature film"],
    ],
    [
      /\b(rain fight|rain action|slow motion|slow-motion)\b/,
      ["rain", "slow-motion"],
    ],
    [/\b(pappu|dinner|wedding)\b/, ["pappu", "wedding", "dinner"]],
    [/\b(faction|rayalaseema)\b/, ["faction", "rayalaseema"]],
    [/\b(village|rural|joint family|family)\b/, ["village", "rural", "family"]],
    [
      /\b(sniper|hitman|assassin|gun|train|railway)\b/,
      ["sniper", "hitman", "train", "railway"],
    ],
    [/\b(cbi|police|cop|investigation|officer)\b/, ["cbi", "police", "officer"]],
    [
      /\b(reincarnat\w*|rebirth|past life|previous birth|400 years)\b/,
      ["reincarnat", "rebirth", "400-year"],
    ],
    [
      /\b(period|historical|ancient|kingdom|british|princess|warrior)\b/,
      ["period", "historical", "kingdom", "british", "princess", "warrior"],
    ],
    [/\b(pan[- ]?india|sequel|part 2|franchise)\b/, ["pan-india", "sequel"]],
    [
      /\b(action|fight|fights|fighting|stunt|helicopter|battle)\b/,
      ["action", "stunt", "fight", "battle", "helicopter"],
    ],
    [
      /\b(comedy|funny|humor|laugh)\b/,
      ["comedy", "comic", "hilarious", "witty"],
    ],
    [/\b(love|romance|romantic)\b/, ["romance", "romantic", "love"]],
    [
      /\b(song|songs|soundtrack|album|music)\b/,
      ["song", "soundtrack", "music", "chartbuster"],
    ],
  ];

  for (const [regex, needles] of domainChecks) {
    if (regex.test(q)) {
      return needles.some((needle) => fullDossierText.includes(needle))
        ? "YES"
        : "NO";
    }
  }

  const stopWords = new Set([
    "does",
    "this",
    "movie",
    "film",
    "have",
    "there",
    "with",
    "from",
    "that",
    "what",
    "about",
    "made",
    "release",
    "released",
    "directed",
    "hero",
    "heroine",
    "main",
    "character",
    "story",
    "plot",
    "telugu",
    "tollywood",
    "cinema",
    "very",
    "much",
    "more",
    "than",
    "been",
    "into",
    "they",
    "them",
    "some",
    "work",
    "worked",
    "acted",
    "part",
  ]);

  const keywords = q
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !stopWords.has(w));

  if (
    keywords.length > 0 &&
    keywords.some((kw) => fullDossierText.includes(kw))
  ) {
    return "YES";
  }

  // If it's a genuinely formed movie question (e.g. "did pavan kalyan act in it?" or "was it shot in London?")
  // and none of its entities/facts exist in this movie's dossier -> cleanly answer NO!
  if (looksLikeRealMovieQuestion(rawQuestion)) {
    return "NO";
  }

  return "UNCERTAIN";
}

const SIMULATOR_BANKS: Record<
  PersonaId,
  Record<"YES" | "NO", Record<QuestionTopic, string[]>>
> = {
  relangi: {
    YES: {
      cast: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Avunu babu, aa artist ee cinema lo chala adbhuthamga chesaru!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu raa babu! 100% correct, aa casting ee cinema lo pakka unnaru!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Yes babu, chala sharp ga kanukkunnav raa!",
      ],
      crew: [
        "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa... yes babu, aa technician team 100% work chesaru!",
        "Haha babu, yeduru vache manishiki oka chirunavvu isthe chalu! Behind the camera magic motham aa talent valle vachindi raa!",
        "Manushulu manchollu ra, manashi antene manchodu! Yes babu, aa crew member ee movie ki pranam posaru!",
      ],
      year: [
        "Haha babu! Yeduru vache manishiki oka chirunavvu isthe chalu! Aa era lo release ayyi andari manasulu geluchukundi raa, 100% correct!",
        "Manushulu manchollu ra, manashi antene manchodu! Yes babu, aa release period timeline exact ga match ayyindi!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Yes raa, aa year calculation spot-on!",
      ],
      hype: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Aa buzz and news record 100% nijame raa!",
        "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa... aa movie hype ippatiki chekku chedaraledu babu!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu! Yes babu, confirmed record adi!",
      ],
      comedy: [
        "Haha babu! Navvulu puvvulu laaga poosthayi ee cinema lo! Manushulu manchollu ra, manashi antene manchodu... aa comedy timing super!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu raa! Family motham kurchoni navvukune aa iconic humor 100% undi!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! 100% yes babu, laughter guaranteed!",
      ],
      action: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Action elements kuda chala stylish ga teesarandi, 100% avunu!",
        "Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani! Yes babu, aa mass energy ee film lo blast avuthundi!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu! Yes raa, screenplay lo aa punch pakka undi!",
      ],
      general: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Yes raa, nee guess 100% correct!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu raa babu! Absolutely yes, chirunavvutho munduki saagandi!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! 100% match babu!",
      ],
    },
    NO: {
      cast: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu... kaani ee cinema lo vere artists unnaru raa! Antha manchike anuko!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu kada babu! Nuvvu adigina person ee movie lo leru raa, vere superhit lo unnaru!",
        "Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani! Ee guess thappina chirunavvutho inko artist ni adugu babu!",
      ],
      crew: [
        "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa... kaani ee credits lo vere brilliant technician peru undi babu!",
        "Haha babu, yeduru vache manishiki oka chirunavvu isthe chalu! Aa department vere talented artist handle chesaru raa!",
        "Manushulu manchollu ra, manashi antene manchodu! Kaani ee cinema crew list lo aa name ledu babu!",
      ],
      year: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Kaani timeline konchem shift ayyindi raa, vere lovely year lo vachindi!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Ee cinema release window konchem vere era babu!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu kada raa! Aa timeline date kakunda inkoka golden year lo release ayyindi!",
      ],
      hype: [
        "Haha babu, manushulu manchollu ra, manashi antene manchodu! Kaani aa news buzz vere cinema gurinchi jarigindi raa!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu! Ee movie fame inkoka unique reason valla vachindi babu!",
        "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa... aa rumor ee film ki ledu raa!",
      ],
      comedy: [
        "Haha babu! Yeduru vache manishiki oka chirunavvu isthe chalu! Kaani nuvvu adigina comedy flavor kakunda vere style entertain chesthundi raa!",
        "Manushulu manchollu ra, manashi antene manchodu! Aa specific comic angle skip chesi inko funny route teesukunnaru!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Ledu babu, smile though!",
      ],
      action: [
        "Haha babu, kopalu vaddu raa babu! Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani! Ee movie vere classy route lo velthundi!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu! Aa specific action trope badulu vere sleek style untundi raa!",
        "Manushulu manchollu ra, manashi antene manchodu! Ee screenplay lo aa mass stunt ledhu babu!",
      ],
      general: [
        "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Ee guess kakapoyina antha manchike anukoni inkoti adugu raa!",
        "Yeduru vache manishiki oka chirunavvu isthe chalu raa babu! Ee detail ee cinema lo ledhu, chirunavvutho continue cheyyi!",
        "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Ledu babu, keep smiling!",
      ],
    },
  },
  gajala: {
    YES: {
      cast: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect! Avunu sir, 100% unnaru!",
        "Give respect and take respect! Nenu CEO of Sonic Solutions... maa server lo check chesa, aa artist exact ga unnaru!",
        "What’s your seat number first of all?! Avunu sir, casting audit lo clear-cut positive sign-off vachindi!",
      ],
      crew: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. 100% KPI-approved technician, give respect and take respect!",
        "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Kaani ee crew credit rock-solid YES sir!",
        "Give respect and take respect! Behind the scenes lo aayane work chesaru, Sonic Solutions Washington certified!",
      ],
      year: [
        "What’s your seat number sir?! I am Gajala from Washington D.C., CEO, Sonic Solutions... aa release year 100% accurate!",
        "Excuse me! Roju rojuku software industry padipotundandi... kaani mee year calculation matram exact ga match ayyindi!",
        "Give respect and take respect! Sonic Solutions timestamp verify chesanu, 100% YES sir!",
      ],
      hype: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Aa industry buzz 100% confirmed history!",
        "Give respect and take respect! Sonic Solutions IPO kante pedda sensational hit record adi, 100% YES!",
        "What’s your seat number?! Genuine cinema trivia sir, boardroom approved!",
      ],
      comedy: [
        "Excuse me! Give respect and take respect! Theatres lo high-voltage comedy track deliver chesaru, 100% YES sir!",
        "Roju rojuku software industry padipotundandi... kaani ee cinema humor ROI peaks lo untundi!",
        "What’s your seat number?! Full entertainment deliverable confirmed by CEO Gajala!",
      ],
      action: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. High adrenaline mass action blast avuthundi ee film lo!",
        "Give respect and take respect! Action deliverable signed off by Sonic Solutions, 100% YES sir!",
        "What’s your seat number?! Powerful mass elements 100% confirmed!",
      ],
      general: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect, 100% YES sir!",
        "What’s your seat number first of all?! Brain use cheyyandi, aa detail 100% verified!",
        "Give respect and take respect! Absolute corporate YES sir!",
      ],
    },
    NO: {
      cast: [
        "Excuse me! What’s your seat number?! Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Ee person ee cinema lo ledu sir!",
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect! Totally wrong casting, big NO!",
        "What’s your seat number asalu?! Sonic Solutions payroll lo ee artist name ledu, next question ki randi!",
      ],
      crew: [
        "Excuse me! Give respect and take respect! As CEO of Sonic Solutions, wrong technician credit ni reject chesthunna sir!",
        "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Ee crew credit completely FALSE!",
        "What’s your seat number?! Sonic Solutions audit report lo zero match sir, big NO!",
      ],
      year: [
        "Excuse me! What’s your seat number?! Mee calendar Windows 95 lo run avthunda enti?! Wrong timeline!",
        "Roju rojuku software industry padipotundandi... mee timeline logic kuda alaage padipothondi! NO sir!",
        "Give respect and take respect! I am Gajala from Washington D.C., CEO, Sonic Solutions... wrong year bracket!",
      ],
      hype: [
        "Excuse me! Fake news sir! As CEO from Washington D.C., Sonic Solutions... aa news rumor fake ani declare chesthunna!",
        "What’s your seat number?! Zero synergy rumor sir, reject cheyyandi!",
        "Give respect and take respect! PR department aa claim ni FALSE ani stamp vesindi!",
      ],
      comedy: [
        "Excuse me! What’s your seat number?! Ee movie comedy track lo aa angle ledhu sir!",
        "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! That comedic deliverable is MISSING!",
        "Give respect and take respect! Next reel meeda smarter KPI question adagandi!",
      ],
      action: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Ee print lo aa action trope zero percent undi!",
        "What’s your seat number?! Not a single frame of that mass element in this cinema sir!",
        "Give respect and take respect! Completely wrong masala guess!",
      ],
      general: [
        "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect... BIG NO SIR!",
        "What’s your seat number asalu?! Sonic Solutions standards lo adi zero percent match!",
        "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Definitely NO sir!",
      ],
    },
  },
  pandey: {
    YES: {
      cast: [
        "Special Rapid Force! I am a time bomb... with no fixed time to explode! Avunu raa, 100% unnaru ee film lo!",
        "Cut-out to namel... Inspector Kill Bill Pandey cheppadante anthe! Point-blank YES, aa actor pakka unnaru!",
        "Happy Diwali! Frustration sir, frustration! Eesari correct cheppav raa, 100% confirmed YES!",
      ],
      crew: [
        "Special Rapid Force! Credits match ayyayi! Behind the scenes lo aayane pranam posaru—YES!",
        "Cut-out to namel... Inspector Kill Bill Pandey investigation dossier lo technician match ayyindi!",
        "Happy Diwali! Technical team 100% confirmed by Special Rapid Force! Over and out!",
      ],
      year: [
        "Special Rapid Force! Release year timeline locked! Naaku konchem frustration thaggindi raa, YES!",
        "Cut-out to namel... exact release window match ayyindi! Case file timestamp 100% clear!",
        "I am a time bomb... with no fixed time to explode! Correct year bracket raa, YES!",
      ],
      hype: [
        "Special Rapid Force! Front-page news lo vachindi, 100% nijame! Police station lo kuda adhe charcha!",
        "Cut-out to namel... Inspector Kill Bill Pandey approves! Solid box-office trivia, YES!",
        "Happy Diwali! Dead-accurate cinema trivia raa, lock chesesa!",
      ],
      comedy: [
        "Special Rapid Force! Nenu kuda police duty marchipoyi navvukunna—100% aa comedy track ee film lo undi!",
        "Cut-out to namel... full laughing riot! Police station lo relax ayyela chesaru, YES!",
        "Happy Diwali! Frustration sir, frustration! Comedy sequences ee film lo blast avuthayi!",
      ],
      action: [
        "Special Rapid Force! I am a time bomb... with no fixed time to explode! Full firepower mass action blast aipothundi!",
        "Cut-out to namel... high-voltage adrenaline action sequence pakka undi raa, 100% YES!",
        "Happy Diwali! Point-blank YES! Aa action stunt ni nee case file lo shoot chey!",
      ],
      general: [
        "Special Rapid Force! I am a time bomb with no fixed time to explode! Point-blank YES raa!",
        "Cut-out to namel... 100% confirmed by Inspector Kill Bill Pandey! Next reel, fast ga!",
        "Happy Diwali! Frustration sir, frustration! Affirmative YES, case diary lo raasko!",
      ],
    },
    NO: {
      cast: [
        "FRUSTRATION SIR, FRUSTRATION! Ee cinemalo aayana asalu ledu! Cut-out to namel... thappudu info tho nannu irritate cheyyoddu!",
        "Special Rapid Force! I am a time bomb with no fixed time to explode! Thappu person name chepthe Happy Diwali aipothadi ikkada! NO anthe!",
        "Cut-out to namel... rey rey, ee person ee cinema lo ledu! Naa mundu over-action chesthe lock-up lo vesi third degree istha!",
      ],
      crew: [
        "FRUSTRATION SIR, FRUSTRATION! Wrong technician credit! Special Rapid Force investigation lo zero match!",
        "Cut-out to namel... credit roll lo aa name ledu raa! Naa bullets waste cheyyaku!",
        "Special Rapid Force! I am a time bomb... wrong technician name cheppaku, straight NO!",
      ],
      year: [
        "FRUSTRATION SIR, FRUSTRATION! Completely wrong timeline! Radar ni adjust chesuko fast ga!",
        "Cut-out to namel... release year window thappu! Special Rapid Force lo thappudu timeline ki place ledu!",
        "Happy Diwali! I am a time bomb with no fixed time to explode... NO! Wrong year bracket!",
      ],
      hype: [
        "FRUSTRATION SIR, FRUSTRATION! Wrong news clipping! Aa buzz ee cinema ki asalu sambandham ledu!",
        "Cut-out to namel... CBFC archive lo zero match! Inspector Pandey mundu fake trivia cheppaku!",
        "Special Rapid Force! I am a time bomb... that rumor is completely FALSE raa!",
      ],
      comedy: [
        "FRUSTRATION SIR, FRUSTRATION! Aa comedy guess lo zero marks—completely wrong track!",
        "Cut-out to namel... aa specific humor angle ikkada ledu! Jokelu aapesi straight cinema probe adugu!",
        "Special Rapid Force! Negative NO! Point ki raa fast ga!",
      ],
      action: [
        "FRUSTRATION SIR, FRUSTRATION! Wrong action trope! Naa mundu fake action buildup ivvaku!",
        "Cut-out to namel... I am a time bomb with no fixed time to explode! Aa action scene ee print lo ledu raa!",
        "Special Rapid Force! Negative NO! Malli verify chesukoni adugu!",
      ],
      general: [
        "FRUSTRATION SIR, FRUSTRATION! Wrong probe! Naa mundu false statements aadoddu, NO anthe!",
        "Special Rapid Force! I am a time bomb with no fixed time to explode! Point-blank NO raa!",
        "Cut-out to namel... Happy Diwali cheppalsi vasthundi! Straight NO, next probe ki raa!",
      ],
    },
  },
};

function pickFreshSimulatorLine(
  personaId: PersonaId,
  claimed: "YES" | "NO",
  topic: QuestionTopic,
  question: string,
  questionNumber: number,
  history: HistoryItem[]
): string {
  const usedReplies = new Set(
    history.filter((h) => h.role === "witness").map((h) => h.text.trim())
  );

  const personaBank = SIMULATOR_BANKS[personaId][claimed];
  const primaryPool = personaBank[topic] ?? personaBank.general;
  const freshPrimary = primaryPool.filter((line) => !usedReplies.has(line));

  let poolToPick: string[];
  if (freshPrimary.length > 0) {
    poolToPick = freshPrimary;
  } else {
    const freshGeneral = personaBank.general.filter(
      (line) => !usedReplies.has(line)
    );
    if (freshGeneral.length > 0) {
      poolToPick = freshGeneral;
    } else {
      const allLines = Array.from(new Set(Object.values(personaBank).flat()));
      const anyFresh = allLines.filter((line) => !usedReplies.has(line));
      poolToPick = anyFresh.length > 0 ? anyFresh : primaryPool;
    }
  }

  const index = (questionNumber * 7 + question.length) % poolToPick.length;
  return poolToPick[index];
}

function pickFreshHeckle(
  heckler: PersonaId,
  questionNumber: number,
  history: HistoryItem[]
): string {
  const used = new Set(history.map((h) => h.text.trim()));
  const pool = BENCH_HECKLES[heckler];
  const fresh = pool.filter((line) => !used.has(line));
  const choices = fresh.length > 0 ? fresh : pool;
  return choices[(questionNumber - 1) % choices.length];
}

interface GroqPanelJson {
  invalid?: boolean;
  invalidReply?: string;
  statements?: Array<{
    personaId: PersonaId;
    claimedAnswer: "YES" | "NO";
    reply: string;
  }>;
  heckle?: {
    personaId: PersonaId;
    text: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InterrogateRequest;
    const {
      movieId,
      movieData,
      question,
      questionNumber,
      gajalaLieReels,
      history = [],
    } = body;

    if ((!movieId && !movieData) || !question || !questionNumber) {
      return NextResponse.json(
        { error: "Missing required interrogation parameters." },
        { status: 400 }
      );
    }

    const movie =
      movieData ||
      (movieId ? await getMovieById(movieId) : undefined) ||
      (movieId ? MOVIES.find((m) => m.id === movieId) : undefined);
    if (!movie) {
      return NextResponse.json(
        { error: "Invalid movie ID." },
        { status: 404 }
      );
    }

    // Prevent unauthenticated players from probing embargoed future daily cases
    const todayIst = getIstDateKey();
    if (movie.featuredDate && movie.featuredDate > todayIst) {
      const authed = await isAuthenticated();
      if (!authed) {
        return NextResponse.json(
          { error: "This case is embargoed by CBFC until 12:00 AM IST!" },
          { status: 403 }
        );
      }
    }

    // Select the 2 active panel speakers + 1 sideline heckler for this reel
    const { speakers, heckler } = selectPanelForTurn(
      questionNumber,
      question,
      gajalaLieReels
    );
    // Everyone can lie randomly (including Relangi Mavayya!) creating dynamic confusion each turn
    const speakerLieMap = rollTurnLieMap(speakers, questionNumber);

    const groqApiKey = process.env.GROQ_API_KEY?.trim()
      .replace(/^GROQ_API_KEY\s*=\s*/i, "")
      .replace(/^["']|["']$/g, "")
      .trim();

    // 1. Block obvious gibberish BEFORE burning a reel or unlocking any clue
    if (isObviousGibberish(question)) {
      const roaster = speakers[0];
      const roastText = getInvalidQuestionRoast(roaster, question, history);
      return NextResponse.json({
        invalidQuestion: true,
        roast: { personaId: roaster, reply: roastText },
        statements: [],
        hasContradiction: false,
        unlocksClue: false,
        reply: roastText,
        wasLie: false,
        mode: groqApiKey ? "groq" : "simulator",
      });
    }

    let fallbackReason: string = groqApiKey ? "groq_error" : "missing_env_key";

    const hasGroq = Boolean(
      groqApiKey && groqApiKey !== "your_groq_api_key_here"
    );

    if (hasGroq && groqApiKey) {
      const historyContext = history
        .slice(-12)
        .map((h) => {
          const who =
            h.role === "user"
              ? "INTERROGATOR"
              : h.speaker
              ? PERSONAS[h.speaker].name.toUpperCase()
              : "WITNESS";
          return `${who}: ${h.text}`;
        })
        .join("\n");

      const castSection = movie.fullCast?.length
        ? movie.fullCast.map((c) => `- ${c.name} (${c.role})`).join("\n")
        : `- Hero: ${movie.hero}\n- Heroine: ${movie.heroine}`;

      const crewSection = movie.fullCrew?.length
        ? movie.fullCrew.map((c) => `- ${c.name} — ${c.department}`).join("\n")
        : `- Director: ${movie.director}\n- Music: ${movie.music}`;

      const triviaSection = movie.eraTrivia?.length
        ? movie.eraTrivia.map((t) => `- ${t}`).join("\n")
        : "";

      const momentsSection = movie.iconicMoments?.length
        ? movie.iconicMoments.map((m) => `- ${m}`).join("\n")
        : "";

      const speakerDirectives = speakers
        .map((pid, idx) => {
          const p = PERSONAS[pid];
          const mustLie = speakerLieMap[pid];
          return `SPEAKER ${idx + 1}: "${pid}" (${p.name})
- Persona: ${p.shortDossier} Catchphrase vibe: "${p.signatureCatchphrase}".
- SPEECH RULE: Speak 90% Tenglish (Romanized colloquial Telugu) with flawless, natural native grammar. Be punchy (1-2 sentences), natural and generic (no spoilers), clearly conveying claimedAnswer YES or NO with their famous dialogues.
- MANDATORY TRUTH/LIE DIRECTIVE: ${
            mustLie
              ? `MUST LIE! Determine the true factual answer about "${movie.title}" (using dossier + real-world IMDb/Telugu cinema facts), then COMPLETELY INVERT IT (true YES -> claimedAnswer "NO"; true NO -> claimedAnswer "YES") with total conviction and confusion. If Relangi Mavayya, lie sweetly with boundless optimism ("Haha babu! Manushulu ante ne manchollu raa!"). If Gajala, lie with corporate swagger. If Kill Bill Pandey, lie with explosive frustration. NEVER hint that you are lying!`
              : `MUST TELL THE TRUTH accurately based on the dossier + verified IMDb/Telugu cinema facts in 90% Tenglish with famous catchphrases and flawless native grammar!`
          }`;
        })
        .join("\n\n");

      const prompt = `You are writing live dialogue for an Indian Censor Board (CBFC) Telugu cinema interrogation panel where 3 iconic Tollywood comedy witnesses sit together on the same bench: Relangi Mavayya (from SVSC), Gajala (CEO Sonic Solutions, Washington D.C. from Athadu), and Inspector Kill Bill Pandey (from Race Gurram).

CRITICAL LANGUAGE & GRAMMAR QUALITY REQUIREMENTS (NON-NEGOTIABLE):
1. FLAWLESS TELUGU GRAMMAR & NATURAL FLOW:
   - Dialogue MUST be 100% natural, colloquial, and grammatically flawless—exactly like native Telugu speakers talking in Andhra/Telangana films.
   - Write 90% Tenglish (colloquial Telugu written phonetically in English/Roman alphabet) and only 10% English words very rarely.
   - Use authentic Telugu sentence structure (SOV order, natural suffixes: -raa, -babu, -sir, -andi, -lo, -tho, -valla, -nunchi, -ki, -ga).
   - NEVER generate broken, robotic, or word-for-word translated English phrases.

2. GENERIC YET ENGAGING (ZERO SPOILERS):
   - Responses should be natural, confident, and generic enough that they directly answer the probe (YES or NO) without leaking unasked actors, plot twists, or exact years.

3. ICONIC MOVIE DIALOGUES & SIGNATURE CATCHPHRASES (YOU MUST WEAVE THESE EXACT QUOTES INTO REPLIES):
   * Relangi Mavayya (Seethamma Vakitlo Sirimalle Chettu - Prakash Raj):
     - "Manushulu manchollu ra, manashi antene manchodu."
     - "Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani."
     - "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa."
     - "Yeduru vache manishiki oka chirunavvu isthe chalu."
     - "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri."
     - Tone: Warm empathy, smiling kindness, calm family affection. Even when lying, he smiles warmly and gently redirects!
   * Gajala from Washington D.C. (Venky - Brahmanandam):
     - "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions."
     - "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi!"
     - "Give respect and take respect."
     - "What’s your seat number?"
     - Tone: Pompous corporate boasting, fake tech talk, arrogant train-compartment lecturing!
   * Inspector Kill Bill Pandey (Race Gurram - Brahmanandam):
     - "I am a time bomb... with no fixed time to explode!" ("Main woh time bomb hoon jiske phatne ka koi time nahi hai")
     - "Frustration sir, frustration!"
     - "Happy Diwali!"
     - "Special Rapid Force!"
     - "Cut-out to namel..."
     - Tone: Over-the-top special officer swagger, explosive frustration, and deadpan comedic threats!

=== SECRET MOVIE DOSSIER (NEVER REVEAL THE MOVIE TITLE DIRECTLY) ===
Title: ${movie.title}
Release: ${movie.releaseMonth ?? movie.year}
Genre: ${movie.genre}
Iconic Prop: ${movie.iconicProp}

FULL CAST:
${castSection}

FULL CREW:
${crewSection}

PLOT TROPES:
${movie.tropes.map((t) => `- ${t}`).join("\n")}
${triviaSection ? `\nRELEASE-ERA TRIVIA, HYPE & NEWS:\n${triviaSection}` : ""}
${momentsSection ? `\nNON-SPOILER ICONIC MOMENTS:\n${momentsSection}` : ""}

=== RECENT INTERROGATION LOG ===
${historyContext || "(Opening probe of the screening)"}

=== CURRENT INTERROGATOR PROBE (Reel #${questionNumber} of 8) ===
"${question}"
(Note: The interrogator can probe a Cast/Crew member or a Release Year like "2015", "2015 or before", "2015 or after").

STEP 1 — VALIDITY CHECK:
If the input is blatant non-cinema keyboard smash or nonsense ("asdfg", "qwerty"), return JSON:
{"invalid": true, "invalidReply": "<funny 1-2 sentence 90% Tenglish roast from ${PERSONAS[speakers[0]].name} saying no reel was deducted>"}

STEP 2 — IF VALID MOVIE PROBE:
Generate answers in 90% Tenglish from BOTH active speakers AND a 1-sentence sideline heckle in 90% Tenglish from "${heckler}" (${PERSONAS[heckler].name}).
If Speaker 1 and Speaker 2 have opposite claimedAnswers, they should hilariously contradict and bicker with each other in character!
NEVER repeat phrasing or jokes used earlier in the log.

CRITICAL ANTI-SPOILER RULE (NON-NEGOTIABLE — ZERO LEAKS):
- NEVER mention or hint at the secret movie title, the exact release year/month (unless the interrogator asked that exact year!), or unasked hero/director/crew names!
- If the interrogator probes a Cast/Crew name (e.g. "Mahesh Babu"), ONLY speak about whether that person is in this film—NEVER leak who the real hero/director is!
- If the interrogator probes a Year (e.g. "2015 or after"), ONLY confirm/deny relative to that probe—NEVER leak the exact release year!
- Keep all comedy strictly in 90% Tenglish using the characters' famous dialogues!

${speakerDirectives}

SIDELINE HECKLER: "${heckler}" (${PERSONAS[heckler].name})
- Give 1 funny short reaction/interruption in 90% Tenglish (under 18 words) reacting to the bench drama!

RETURN STRICT JSON ONLY:
{
  "invalid": false,
  "statements": [
    { "personaId": "${speakers[0]}", "claimedAnswer": "YES" | "NO", "reply": "..." },
    { "personaId": "${speakers[1]}", "claimedAnswer": "YES" | "NO", "reply": "..." }
  ],
  "heckle": { "personaId": "${heckler}", "text": "..." }
}`;

      const formatParsedPanel = (parsed: GroqPanelJson) => {
        if (parsed.invalid) {
          const roastReply =
            parsed.invalidReply?.trim() ||
            getInvalidQuestionRoast(speakers[0], question, history);
          return NextResponse.json({
            invalidQuestion: true,
            roast: { personaId: speakers[0], reply: roastReply },
            statements: [],
            hasContradiction: false,
            unlocksClue: false,
            reply: roastReply,
            wasLie: false,
            mode: "groq",
          });
        }

        if (parsed.statements && parsed.statements.length >= 2) {
          const normalizedStatements: PanelStatement[] = speakers.map(
            (pid, i) => {
              const found =
                parsed.statements?.find((s) => s.personaId === pid) ??
                parsed.statements?.[i];
              const claimed: "YES" | "NO" =
                found?.claimedAnswer === "YES" ? "YES" : "NO";
              return {
                personaId: pid,
                claimedAnswer: claimed,
                wasLie: speakerLieMap[pid],
                reply:
                  found?.reply?.trim() ||
                  pickFreshSimulatorLine(
                    pid,
                    claimed,
                    detectTopic(question),
                    question,
                    questionNumber,
                    history
                  ),
              };
            }
          );

          const hasContradiction =
            normalizedStatements[0].claimedAnswer !==
            normalizedStatements[1].claimedAnswer;
          const unlocksClue = normalizedStatements.every(
            (s) => s.claimedAnswer === "NO"
          );

          return NextResponse.json({
            invalidQuestion: false,
            statements: normalizedStatements,
            heckle: {
              personaId: heckler,
              text:
                parsed.heckle?.text?.trim() ||
                pickFreshHeckle(heckler, questionNumber, history),
            },
            hasContradiction,
            unlocksClue,
            reply: normalizedStatements.map((s) => s.reply).join(" "),
            wasLie: normalizedStatements.some((s) => s.wasLie),
            mode: "groq",
          });
        }

        return null;
      };

      // 2. Groq API (ultra-fast gpt-oss-120b -> qwen3.8-27b -> gpt-oss-20b)
      const groqModels = [
        "openai/gpt-oss-120b",
        "qwen/qwen3.8-27b",
        "openai/gpt-oss-20b",
      ];

      for (const modelName of groqModels) {
        try {
          const groqRes = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${groqApiKey}`,
              },
              body: JSON.stringify({
                model: modelName,
                temperature: 0.75,
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content:
                      "You are a witty Tollywood comedy screenplay generator that strictly outputs valid JSON matching the requested schema. Never leak spoilers.",
                  },
                  {
                    role: "user",
                    content: prompt,
                  },
                ],
              }),
            }
          );

          if (!groqRes.ok) {
            const errText = await groqRes.text();
            throw new Error(`[${groqRes.status}] ${errText}`);
          }

          const groqData = (await groqRes.json()) as {
            choices?: Array<{ message?: { content?: string } }>;
          };
          const rawText = groqData.choices?.[0]?.message?.content?.trim() ?? "";
          const stripped = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          const jsonMatch = stripped.match(/\{[\s\S]*\}/);
          const parsed = JSON.parse(
            jsonMatch ? jsonMatch[0] : stripped
          ) as GroqPanelJson;

          const formatted = formatParsedPanel(parsed);
          if (formatted) return formatted;
        } catch (groqError) {
          const msg =
            groqError instanceof Error ? groqError.message : String(groqError);
          if (/429|rate_limit|quota/i.test(msg)) {
            fallbackReason = "rate_limited";
          } else if (/401|403|invalid_api_key|unauthorized/i.test(msg)) {
            fallbackReason = "invalid_api_key";
          } else if (/404|model_not_found/i.test(msg)) {
            fallbackReason = "model_not_found";
          } else {
            fallbackReason = "groq_error";
          }
          console.warn(`Groq model ${modelName} failed:`, msg);
        }
      }
    }

    // 3. Built-In Smart Panel Simulator Fallback (topic-aware, zero repetition, zero random coin flips)
    const truth = evaluateMovieFact(movie, question);

    if (truth === "UNCERTAIN") {
      const roaster = speakers[0];
      const roastText = getInvalidQuestionRoast(roaster, question, history);
      return NextResponse.json({
        invalidQuestion: true,
        roast: { personaId: roaster, reply: roastText },
        statements: [],
        hasContradiction: false,
        unlocksClue: false,
        reply: roastText,
        wasLie: false,
        mode: "simulator",
      });
    }

    const topic = detectTopic(question);
    const runningHistory = [...history];

    const statements: PanelStatement[] = speakers.map((pid) => {
      const mustLie = speakerLieMap[pid];
      const claimedAnswer: "YES" | "NO" = mustLie
        ? truth === "YES"
          ? "NO"
          : "YES"
        : truth;
      const reply = pickFreshSimulatorLine(
        pid,
        claimedAnswer,
        topic,
        question,
        questionNumber,
        runningHistory
      );
      runningHistory.push({ role: "witness", speaker: pid, text: reply });
      return {
        personaId: pid,
        reply,
        wasLie: mustLie,
        claimedAnswer,
      };
    });

    const hasContradiction =
      statements[0].claimedAnswer !== statements[1].claimedAnswer;
    const unlocksClue = statements.every((s) => s.claimedAnswer === "NO");

    return NextResponse.json({
      invalidQuestion: false,
      statements,
      heckle: {
        personaId: heckler,
        text: pickFreshHeckle(heckler, questionNumber, runningHistory),
      },
      hasContradiction,
      unlocksClue,
      reply: statements.map((s) => s.reply).join(" "),
      wasLie: statements.some((s) => s.wasLie),
      mode: "simulator",
      fallbackReason,
    });
  } catch (error) {
    console.error("Interrogation API error:", error);
    return NextResponse.json(
      { error: "Screening room projector jammed! Please try again." },
      { status: 500 }
    );
  }
}
