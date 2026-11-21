import { NextRequest, NextResponse } from "next/server";
import Fuse from "fuse.js";
import { getAllMovies } from "@/lib/movieStore";

export const dynamic = "force-dynamic";

export interface PersonSuggestion {
  name: string;
  role?: string;
  knownFor?: string;
  source: "catalog" | "imdb" | "tmdb";
}

interface CuratedPerson {
  name: string;
  role: string;
  aliases: string[];
}

const TOP_TELUGU_PEOPLE: CuratedPerson[] = [
  // --- TOP HEROES ---
  { name: "Chiranjeevi", role: "Megastar / Hero", aliases: ["chiru", "konidela", "megastar"] },
  { name: "Nandamuri Balakrishna", role: "Hero / Mass God", aliases: ["balakrishna", "balayya", "nbk"] },
  { name: "Akkineni Nagarjuna", role: "King / Hero", aliases: ["nagarjuna", "nag", "king nagarjuna"] },
  { name: "Daggubati Venkatesh", role: "Victory / Hero", aliases: ["venkatesh", "venky", "victory venkatesh"] },
  { name: "Pawan Kalyan", role: "Power Star / Hero", aliases: ["pavan kalyan", "pawan", "pavan", "pk", "power star"] },
  { name: "Mahesh Babu", role: "Superstar / Hero", aliases: ["mahesh", "superstar mahesh", "prince"] },
  { name: "Jr NTR", role: "Young Tiger / Hero", aliases: ["ntr", "tarak", "jr. ntr", "young tiger", "nandamuri taraka rama rao"] },
  { name: "Prabhas", role: "Rebel Star / Hero", aliases: ["prabhas raju", "darling", "rebel star"] },
  { name: "Allu Arjun", role: "Icon Star / Hero", aliases: ["bunny", "allu arjun", "icon star", "stylish star"] },
  { name: "Ram Charan", role: "Mega Power Star / Hero", aliases: ["ramcharan", "cherry", "rc", "global star"] },
  { name: "Nani", role: "Natural Star / Hero", aliases: ["natural star nani", "ghanta naveen"] },
  { name: "Vijay Deverakonda", role: "Rowdy / Hero", aliases: ["deverakonda", "rowdy", "vd"] },
  { name: "Ravi Teja", role: "Mass Maharaja / Hero", aliases: ["raviteja", "mass maharaja"] },
  { name: "Ram Pothineni", role: "Ustaad / Hero", aliases: ["ram", "rapo", "ustaad"] },
  { name: "Nithiin", role: "Hero", aliases: ["nitin", "nithin"] },
  { name: "Naga Chaitanya", role: "Hero", aliases: ["chay", "akkineni naga chaitanya"] },
  { name: "Varun Tej", role: "Mega Prince / Hero", aliases: ["varuntej", "mega prince"] },
  { name: "Sai Durgha Tej", role: "Supreme Hero", aliases: ["sai dharam tej", "sdt"] },
  { name: "Sharwanand", role: "Hero", aliases: ["sharwa"] },
  { name: "Gopichand", role: "Macho Star / Hero", aliases: ["macho star gopichand"] },
  { name: "Rana Daggubati", role: "Hero / Bhallaladeva", aliases: ["rana", "bhallaladeva"] },
  { name: "Siddhu Jonnalagadda", role: "Star Boy / Tillu", aliases: ["siddhu", "dj tillu"] },
  { name: "Vishwak Sen", role: "Mass Ka Das / Hero", aliases: ["vishwak", "mass ka das"] },
  { name: "Adivi Sesh", role: "Hero & Screenwriter", aliases: ["sesh", "adivi"] },
  { name: "Naveen Polishetty", role: "Hero & Comic Star", aliases: ["polishetty", "jathi ratnalu"] },
  { name: "Teja Sajja", role: "Super Hero", aliases: ["teja", "hanuman teja"] },
  { name: "Allari Naresh", role: "Comedy Hero / Dramatic Actor", aliases: ["naresh", "allari"] },
  { name: "Mohan Babu", role: "Dialogue King / Hero", aliases: ["collection king", "manchu mohan babu"] },
  { name: "Rajasekhar", role: "Angry Star / Hero", aliases: ["angry star rajasekhar"] },
  { name: "Jagapathi Babu", role: "Hero / Iconic Villain", aliases: ["jb", "jaggu bhai"] },
  { name: "Srikanth", role: "Hero / Character Actor", aliases: ["meka srikanth"] },
  { name: "Tarun", role: "Lover Boy / Hero", aliases: ["tarun kumar"] },
  { name: "Uday Kiran", role: "Heartthrob Hero", aliases: ["uday"] },

  // --- TOP HEROINES ---
  { name: "Samantha Ruth Prabhu", role: "Leading Lady / Heroine", aliases: ["samantha", "sam", "samantha akkineni"] },
  { name: "Kajal Aggarwal", role: "Heroine", aliases: ["kajal", "kajal agarwal"] },
  { name: "Anushka Shetty", role: "Devasena / Heroine", aliases: ["anushka", "sweety"] },
  { name: "Tamannaah Bhatia", role: "Milky Beauty / Heroine", aliases: ["tamanna", "tamannaah"] },
  { name: "Rashmika Mandanna", role: "National Crush / Heroine", aliases: ["rashmika"] },
  { name: "Pooja Hegde", role: "Heroine", aliases: ["pooja", "butta bomma"] },
  { name: "Trisha Krishnan", role: "Heroine", aliases: ["trisha"] },
  { name: "Ileana D'Cruz", role: "Heroine", aliases: ["ileana"] },
  { name: "Genelia D'Souza", role: "Hasini / Heroine", aliases: ["genelia"] },
  { name: "Nayanthara", role: "Lady Superstar / Heroine", aliases: ["nayanthara"] },
  { name: "Keerthy Suresh", role: "Mahanati / Heroine", aliases: ["keerthy", "mahanati"] },
  { name: "Sai Pallavi", role: "Bhanumathi / Heroine", aliases: ["sai pallavi"] },
  { name: "Mrunal Thakur", role: "Sita / Heroine", aliases: ["mrunal", "sita ramam"] },
  { name: "Sreeleela", role: "Heroine & Dancer", aliases: ["sree leela"] },
  { name: "Shruti Haasan", role: "Heroine & Singer", aliases: ["shruti", "sruthi haasan"] },
  { name: "Rakul Preet Singh", role: "Heroine", aliases: ["rakul", "rakul preet"] },
  { name: "Raashi Khanna", role: "Heroine", aliases: ["rashi khanna", "raashi"] },
  { name: "Nivetha Thomas", role: "Heroine", aliases: ["nivetha"] },
  { name: "Krithi Shetty", role: "Bebamma / Heroine", aliases: ["krithi", "uppena"] },
  { name: "Anupama Parameswaran", role: "Heroine", aliases: ["anupama"] },
  { name: "Nithya Menen", role: "Heroine", aliases: ["nithya menon", "nithya"] },
  { name: "Lavanya Tripathi", role: "Heroine", aliases: ["lavanya"] },

  // --- TOP DIRECTORS ---
  { name: "S.S. Rajamouli", role: "Jakkanna / Visionary Director", aliases: ["rajamouli", "ssr", "jakkanna"] },
  { name: "Trivikram Srinivas", role: "Guruji / Wizard of Words & Director", aliases: ["trivikram", "guruji", "matala mantrikudu"] },
  { name: "Sukumar", role: "Creative Genius Director", aliases: ["sukumar b"] },
  { name: "Puri Jagannadh", role: "Dashing Director", aliases: ["puri", "puri jagan"] },
  { name: "Koratala Siva", role: "Director & Writer", aliases: ["koratala"] },
  { name: "Boyapati Srinu", role: "Mass Action Director", aliases: ["boyapati"] },
  { name: "Sandeep Reddy Vanga", role: "Director", aliases: ["vanga", "sandeep vanga"] },
  { name: "Nag Ashwin", role: "Director & Sci-Fi Creator", aliases: ["nag ashwin", "nagi"] },
  { name: "Prashanth Neel", role: "KGF/Salaar Director", aliases: ["prashanth neel", "neel"] },
  { name: "Sekhar Kammula", role: "Sensible Cinema Director", aliases: ["sekhar kammula"] },
  { name: "Vamshi Paidipally", role: "Director", aliases: ["vamshi"] },
  { name: "Harish Shankar", role: "Mass Director", aliases: ["harish"] },
  { name: "Anil Ravipudi", role: "Comedy Mass Director", aliases: ["anil ravipudi"] },
  { name: "Surender Reddy", role: "Stylized Action Director", aliases: ["suri", "surender reddy"] },
  { name: "K. Viswanath", role: "Kalatapasvi / Legend Director", aliases: ["viswanath", "kalatapasvi"] },
  { name: "Dasari Narayana Rao", role: "Darsakarathna / Director Legend", aliases: ["dasari"] },
  { name: "K. Raghavendra Rao", role: "Darsakendra / Director", aliases: ["raghavendra rao", "krr"] },
  { name: "Ram Gopal Varma", role: "RGV / Maverick Director", aliases: ["rgv", "ram gopal varma"] },
  { name: "Srinu Vaitla", role: "Comedy Action Director", aliases: ["srinu vaitla", "vaitla"] },
  { name: "V.V. Vinayak", role: "Mass Director", aliases: ["vinayak", "vv vinayak"] },
  { name: "Chandra Sekhar Yeleti", role: "Intelligent Cinema Director", aliases: ["yeleti"] },
  { name: "Hanu Raghavapudi", role: "Director", aliases: ["hanu"] },
  { name: "Shiva Nirvana", role: "Director", aliases: ["shiva nirvana"] },
  { name: "Tharun Bhascker", role: "Director & Writer", aliases: ["tharun bhascker"] },
  { name: "Venky Atluri", role: "Director", aliases: ["venky atluri"] },
  { name: "Prasanth Varma", role: "PVCU Superhero Director", aliases: ["prasanth varma"] },
  { name: "Venu Udugula", role: "Director", aliases: ["venu udugula"] },
  { name: "Venu Yeldandi", role: "Balagam Director & Comedian", aliases: ["venu tillu", "venu yeldandi"] },

  // --- TOP MUSIC COMPOSERS ---
  { name: "Devi Sri Prasad", role: "Rockstar Music Director", aliases: ["dsp", "devi", "rockstar dsp"] },
  { name: "S. Thaman", role: "Music Director / BGM King", aliases: ["thaman", "ss thaman"] },
  { name: "M.M. Keeravani", role: "Oscar Winner / Music Director", aliases: ["keeravani", "mm keeravani", "marakathamani"] },
  { name: "Mani Sharma", role: "Melody Brahma / Music Director", aliases: ["mani sharma", "melody brahma"] },
  { name: "Anirudh Ravichander", role: "Rockstar Music Director", aliases: ["anirudh", "ani"] },
  { name: "Mickey J. Meyer", role: "Melody Composer", aliases: ["mickey j meyer", "mickey"] },
  { name: "A.R. Rahman", role: "Oscar Legend Composer", aliases: ["arr", "rahman"] },
  { name: "Ilaiyaraaja", role: "Isaignani Maestro", aliases: ["ilayaraja", "ilaiyaraaja", "maestro"] },
  { name: "Harris Jayaraj", role: "Music Director", aliases: ["harris"] },
  { name: "Vivek Sagar", role: "Indie Groove Music Director", aliases: ["vivek sagar"] },
  { name: "G.V. Prakash Kumar", role: "Music Director & Actor", aliases: ["gv prakash", "gvp"] },
  { name: "Bheems Ceciroleo", role: "Folk Mass Music Director", aliases: ["bheems"] },
  { name: "Chakri", role: "Melody Music Director", aliases: ["chakri music"] },
  { name: "Koti", role: "Veteran Music Director", aliases: ["koti music", "raj koti"] },
  { name: "Vandemataram Srinivas", role: "Music Director & Singer", aliases: ["vandemataram"] },

  // --- TOP COMEDIANS & CHARACTER ARTISTS ---
  { name: "Brahmanandam", role: "Guinness Record Comedy King", aliases: ["brahmi", "hasya brahma", "brahmanandam kanneganti"] },
  { name: "Sunil", role: "Star Comedian & Hero", aliases: ["sunil varma"] },
  { name: "Ali", role: "Veteran Comedian", aliases: ["ali comedian"] },
  { name: "Vennela Kishore", role: "Top Modern Comedian", aliases: ["vennela kishore", "kishore"] },
  { name: "Satya", role: "Comic Actor", aliases: ["satya comedian"] },
  { name: "Priyadarshi", role: "Comedian & Dramatic Actor", aliases: ["priyadarshi pulikonda", "darshi"] },
  { name: "Rahul Ramakrishna", role: "Actor & Comedian", aliases: ["rahul ramakrishna"] },
  { name: "Getup Srinu", role: "Comedian", aliases: ["getup srinu"] },
  { name: "M.S. Narayana", role: "Comedy Legend", aliases: ["ms narayana"] },
  { name: "Dharmavarapu Subramanyam", role: "Satirical Comedian Legend", aliases: ["dharmavarapu"] },
  { name: "Jaya Prakash Reddy", role: "JP / Rayalaseema Comedy Legend", aliases: ["jp", "jaya prakash reddy"] },
  { name: "Kondavalasa", role: "Comedian (Aithe Ok)", aliases: ["kondavalasa"] },
  { name: "Venu Madhav", role: "Comedian Legend", aliases: ["venu madhav"] },
  { name: "Kota Srinivasa Rao", role: "Acting Legend", aliases: ["kota", "kota srinivasa rao"] },
  { name: "Prakash Raj", role: "National Award Versatile Legend", aliases: ["prakash raj"] },
  { name: "Rao Ramesh", role: "Dialogue Master Character Actor", aliases: ["rao ramesh"] },
  { name: "Murali Sharma", role: "Character Actor", aliases: ["murali sharma"] },
  { name: "Tanikella Bharani", role: "Writer & Character Legend", aliases: ["bharani", "tanikella"] },
  { name: "Posani Krishna Murali", role: "Mental Krishna / Comedian & Writer", aliases: ["posani"] },
  { name: "Brahmaji", role: "Evergreen Character & Comic Actor", aliases: ["brahmaji"] },
  { name: "Sayaji Shinde", role: "Villain & Comic Actor", aliases: ["sayaji shinde"] },
  { name: "Sonu Sood", role: "Arundhati Pasupathi / Real Hero", aliases: ["sonu sood", "pasupathi"] },
  { name: "Srihari", role: "Real Star / Sher Khan", aliases: ["srihari", "sher khan"] },
  { name: "Nassar", role: "Bijjaladeva / Character Legend", aliases: ["nasser", "nassar"] },
  { name: "Srinivasa Reddy", role: "Comedian & Hero", aliases: ["srinivasa reddy"] },
  { name: "Thagubothu Ramesh", role: "Comedian", aliases: ["thagubothu ramesh"] },
  { name: "Dhanraj", role: "Comedian", aliases: ["dhanraj"] },
  { name: "Saptagiri", role: "Comedian & Hero", aliases: ["saptagiri"] },
  { name: "Prudhvi Raj", role: "30 Years Industry Comedian", aliases: ["30 years prudhvi", "prudhvi"] },
  { name: "Raghu Babu", role: "Comedian", aliases: ["raghu babu"] },
  { name: "Krishna Bhagavan", role: "Satirical Comedian", aliases: ["krishna bhagavan"] },
  { name: "Chammak Chandra", role: "Comedian", aliases: ["chandra"] },
  { name: "Sudharshan", role: "Comedian", aliases: ["sudharshan"] },
];

let cachedCombinedCatalog: CuratedPerson[] | null = null;

async function getCombinedPeopleCatalog(): Promise<CuratedPerson[]> {
  if (cachedCombinedCatalog && cachedCombinedCatalog.length > 0) {
    return cachedCombinedCatalog;
  }

  const byName = new Map<string, CuratedPerson>();

  // 1. Seed base curated Tollywood stars & technicians
  for (const p of TOP_TELUGU_PEOPLE) {
    byName.set(p.name.toLowerCase(), { ...p });
  }

  // 2. Add all cast & crew from movies.json
  try {
    const movies = await getAllMovies();
    for (const m of movies) {
      if (m.hero && !byName.has(m.hero.toLowerCase())) {
        byName.set(m.hero.toLowerCase(), {
          name: m.hero,
          role: "Lead Hero",
          aliases: [m.hero.toLowerCase()],
        });
      }
      if (m.heroine && !byName.has(m.heroine.toLowerCase())) {
        byName.set(m.heroine.toLowerCase(), {
          name: m.heroine,
          role: "Lead Heroine",
          aliases: [m.heroine.toLowerCase()],
        });
      }
      if (m.director && !byName.has(m.director.toLowerCase())) {
        byName.set(m.director.toLowerCase(), {
          name: m.director,
          role: "Director",
          aliases: [m.director.toLowerCase()],
        });
      }
      if (m.music && !byName.has(m.music.toLowerCase())) {
        byName.set(m.music.toLowerCase(), {
          name: m.music,
          role: "Music Director",
          aliases: [m.music.toLowerCase()],
        });
      }
      if (m.fullCast) {
        for (const c of m.fullCast) {
          const key = c.name.toLowerCase();
          if (!byName.has(key)) {
            byName.set(key, {
              name: c.name,
              role: c.role || "Cast",
              aliases: [c.name.toLowerCase(), ...(c.aliases ?? [])],
            });
          }
        }
      }
      if (m.fullCrew) {
        for (const cr of m.fullCrew) {
          const key = cr.name.toLowerCase();
          if (!byName.has(key)) {
            byName.set(key, {
              name: cr.name,
              role: cr.department || "Crew",
              aliases: [cr.name.toLowerCase(), ...(cr.aliases ?? [])],
            });
          }
        }
      }
    }
  } catch {
    // Keep base curated if movie store fails
  }

  cachedCombinedCatalog = Array.from(byName.values());
  return cachedCombinedCatalog;
}

interface ImdbRawItem {
  id?: string;
  l?: string; // Name
  s?: string; // Subtitle / role e.g. "Actor, Athadu (2005)"
}

async function fetchImdbPeople(query: string): Promise<PersonSuggestion[]> {
  const clean = query
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .trim();
  if (clean.length < 2) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const firstChar = clean[0];
    const url = `https://v3.sg.media-imdb.com/suggestion/${firstChar}/${encodeURIComponent(
      clean
    )}.json`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as { d?: ImdbRawItem[] };

    return (data.d ?? [])
      .filter((item) => Boolean(item.l) && item.id?.startsWith("nm"))
      .slice(0, 6)
      .map((item) => ({
        name: item.l!.trim(),
        role: item.s?.trim() || "Cinema Personality",
        knownFor: item.s?.trim(),
        source: "imdb" as const,
      }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTmdbPeople(query: string): Promise<PersonSuggestion[]> {
  const tmdbKey = process.env.TMDB_API_KEY?.trim();
  if (!tmdbKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const url = `https://api.themoviedb.org/3/search/person?api_key=${encodeURIComponent(
      tmdbKey
    )}&query=${encodeURIComponent(query)}&page=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        name?: string;
        known_for_department?: string;
        known_for?: Array<{ title?: string }>;
      }>;
    };

    return (data.results ?? []).slice(0, 5).map((p) => ({
      name: p.name || "",
      role: p.known_for_department || "Cast & Crew",
      knownFor: p.known_for?.[0]?.title,
      source: "tmdb" as const,
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

  // 1. Instant fuzzy search against curated Tollywood catalog
  const catalog = await getCombinedPeopleCatalog();
  const fuse = new Fuse(catalog, {
    keys: [
      { name: "name", weight: 0.7 },
      { name: "aliases", weight: 0.3 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const localMatches: PersonSuggestion[] = fuse.search(q, { limit: 8 }).map((r) => ({
    name: r.item.name,
    role: r.item.role,
    source: "catalog" as const,
  }));

  // 2. Fetch live online enrichment (IMDb by default + TMDB if key present)
  const [imdbMatches, tmdbMatches] = await Promise.all([
    fetchImdbPeople(q),
    fetchTmdbPeople(q),
  ]);

  // Merge & deduplicate (Prioritize Telugu catalog first, then TMDB/IMDb)
  const seen = new Set<string>();
  const merged: PersonSuggestion[] = [];

  for (const item of [...localMatches, ...tmdbMatches, ...imdbMatches]) {
    const norm = item.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    merged.push(item);
    if (merged.length >= 8) break;
  }

  return NextResponse.json({ suggestions: merged });
}
