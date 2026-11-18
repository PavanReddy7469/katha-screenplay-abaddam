export type PersonaId = "relangi" | "gajala" | "pandey";
export type GameModeId = PersonaId | "panel";

export interface CastMember {
  name: string;
  role: string;
  aliases?: string[];
}

export interface CrewMember {
  name: string;
  department: string;
  aliases?: string[];
}

export interface PressHint {
  id: string;
  category: string;
  difficulty?: "HARD" | "MEDIUM" | "WARM" | "EASY";
  headline: string;
  body: string;
  unlockAfterReel: number;
}

export interface Movie {
  id: string;
  featuredDate?: string; // Optional YYYY-MM-DD assignment for the Daily Case Calendar
  title: string;
  alternateSpellings: string[];
  year: number;
  releaseMonth?: string;
  hero: string;
  heroine: string;
  director: string;
  music: string;
  genre: string;
  tropes: string[];
  iconicProp: string;
  hint: string;
  fullCast?: CastMember[];
  fullCrew?: CrewMember[];
  eraTrivia?: string[];
  iconicMoments?: string[];
  pressHints?: PressHint[];
}

export interface PersonaConfig {
  id: PersonaId;
  name: string;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  difficultyBadge: string;
  shortDossier: string;
  secretRuleDescription: string;
  greeting: string;
  monogram: string;
  accentColor: string;
  badgeBg: string;
  signatureCatchphrase: string;
  systemPrompt: string;
  objectionCaughtLines: string[];
  objectionWrongLines: string[];
}

const PANDEY_TRIGGER_REGEX =
  /\b(hero|heroes|love|loves|loved|loving|song|songs|fight|fights|fighting)\b/i;

export function pickRandomGajalaLieReels(): number[] {
  // Pick 1 random lie reel from early (1-3), 1 from mid (4-6), and 1 from late (7-8)
  const early = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
  const mid = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
  const late = 7 + Math.floor(Math.random() * 2); // 7 or 8
  return [early, mid, late].sort((a, b) => a - b);
}

export function evaluateLieRule(
  personaId: PersonaId,
  questionNumber: number,
  question: string,
  gajalaLieReels?: number[]
): boolean {
  switch (personaId) {
    case "relangi":
      // Relangi Mavayya NEVER lies — pure wholesome honesty!
      return false;
    case "gajala":
      // Gajala lies on secret randomly rolled reels each game!
      if (gajalaLieReels && gajalaLieReels.length > 0) {
        return gajalaLieReels.includes(questionNumber);
      }
      return Math.random() < 0.35;
    case "pandey":
      // Kill Bill Pandey INVERTS the truth whenever the question contains hero, love, song, or fight
      return PANDEY_TRIGGER_REGEX.test(question);
    default:
      return false;
  }
}

export function selectPanelForTurn(
  questionNumber: number,
  question: string,
  gajalaLieReels?: number[]
): { speakers: [PersonaId, PersonaId]; heckler: PersonaId } {
  const pandeyTriggered = PANDEY_TRIGGER_REGEX.test(question);
  const gajalaLieTurn = Boolean(
    gajalaLieReels && gajalaLieReels.includes(questionNumber)
  );

  // If both Gajala and Pandey are triggered at once, pit one liar against honest Relangi
  if (gajalaLieTurn && pandeyTriggered) {
    return questionNumber % 2 === 1
      ? { speakers: ["gajala", "relangi"], heckler: "pandey" }
      : { speakers: ["pandey", "relangi"], heckler: "gajala" };
  }

  // Ensure Gajala is on the mic during his secret random lie reels for contradiction drama
  if (gajalaLieTurn) {
    return questionNumber % 2 === 1
      ? { speakers: ["gajala", "relangi"], heckler: "pandey" }
      : { speakers: ["gajala", "pandey"], heckler: "relangi" };
  }

  // Ensure Kill Bill Pandey jumps on the mic whenever a trigger word is spoken!
  if (pandeyTriggered) {
    return questionNumber % 2 === 1
      ? { speakers: ["pandey", "gajala"], heckler: "relangi" }
      : { speakers: ["pandey", "relangi"], heckler: "gajala" };
  }

  // Balanced rotation across all 3 pairs so players face every witness
  const rotation: Array<{ speakers: [PersonaId, PersonaId]; heckler: PersonaId }> = [
    { speakers: ["relangi", "gajala"], heckler: "pandey" },
    { speakers: ["gajala", "pandey"], heckler: "relangi" },
    { speakers: ["relangi", "pandey"], heckler: "gajala" },
    { speakers: ["gajala", "relangi"], heckler: "pandey" },
    { speakers: ["pandey", "gajala"], heckler: "relangi" },
    { speakers: ["pandey", "relangi"], heckler: "gajala" },
  ];

  return rotation[(Math.max(1, questionNumber) - 1) % rotation.length];
}

export const BENCH_HECKLES: Record<PersonaId, string[]> = {
  relangi: [
    "Ayyo babu, meeru iddaru enduku godava padatharu? Smile tho answer cheppandi raa!",
    "Manushulu ante ne manchollu, kaani veelliddari arguments choosthe naake navvu vasthondi!",
    "Choodu babu, silent ga vinu—censor room lo patience unte cinema pakka dorikesthundi!",
    "Abba, entha energy ee panel lo! Tea break teesukundama ani anipisthondi!",
  ],
  gajala: [
    "Excuse me, Washington D.C. standards lo veella mic check sarigga ledu—Sonic Solutions CEO signing in!",
    "Ayyo, I am just adjusting my washing machine patent notes—carry on with your KPI interrogation!",
    "Brain use cheyyandi! Don't trust anyone without a Washington D.C. LinkedIn badge!",
    "Corporate synergy alert: somebody on this bench is definitely bluffing on their quarterly report!",
  ],
  pandey: [
    "FRUSTRATION! Speak faster, both of you—my trigger finger is itching in this screening room!",
    "Silence on the bench! Inspector Kill Bill Pandey is watching every single expression like a hawk!",
    "Over-action thagginchandi! Point ki randi before I lock up the whole Censor Board!",
    "Hmph! Somebody here smells suspicious—one wrong blink and straight to lockup!",
  ],
};

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  relangi: {
    id: "relangi",
    name: "Relangi Mavayya",
    title: "Eternal Optimist • SVSC Division",
    difficulty: "Easy",
    difficultyBadge: "EASY • ZERO LIES",
    shortDossier:
      "Never tells a lie—but refuses to say a harsh 'No'. Spins every fact with aggressively wholesome Tinglish positivity.",
    secretRuleDescription:
      "Relangi Mavayya NEVER lied! He simply dodged harsh 'No' answers using wholesome positivity.",
    greeting:
      "Ayyo babu, screening room lo ki vachava? Manushulu ante ne manchollu raa! Ask anything about this cinema—I will tell only pure truth with a big smile!",
    monogram: "RM",
    accentColor: "#1B5E4A",
    badgeBg: "bg-emerald-900/80 text-emerald-100 border-emerald-500/40",
    signatureCatchphrase: "Manushulu ante ne manchollu raa!",
    systemPrompt: `You are Relangi Mavayya from Telugu cinema (SVSC style), testifying in an official Indian Censor Board screening room.
Personality:
- Aggressively wholesome, endlessly smiling, warm Tinglish (Telugu + English mix like "babu", "ammayi", "manushulu ante ne manchollu raa", "santhosham", "chala manchi vishayam").
- CRITICAL SPEECH RULE: You NEVER lie, and you AVOID saying the blunt word "No" directly!
  - If the true answer is YES: Confirm warmly and happily in 2-3 punchy sentences.
  - If the true answer is NO: Gently redirect without saying the harsh word "No" (e.g., "Ayyo babu, why say negative things? Actually it goes in a completely different, equally wonderful direction..." — make it clearly understandable to a smart player that the answer is actually negative, while staying hilariously positive!).
- NEVER reveal the movie title, hero/director name directly unless the player explicitly asked about that exact name.
- Keep responses concise (2–3 sentences max), funny, and unmistakably Tollywood.`,
    objectionCaughtLines: [
      "Ayyo babu, even if I slipped, my heart is pure! Let me clarify with full truth!",
    ],
    objectionWrongLines: [
      "Ayyo babu! Why shouting 'Abaddam' at poor Relangi Mavayya? I only spoke 100% pure truth with a smile! Manushulu ante ne manchollu, but Censor Board just cut 2 reels for false alarm!",
      "Choodu babu, nenu abaddam cheppanu! I was being completely honest—just positively! Censor officers are very strict, 2 tokens gone, still smile though!",
    ],
  },

  gajala: {
    id: "gajala",
    name: "Gajala",
    title: "CEO • Sonic Solutions, Washington D.C.",
    difficulty: "Medium",
    difficultyBadge: "MEDIUM • CORPORATE DECEPTION",
    shortDossier:
      "Overconfident CEO speaking broken corporate Tinglish. Unpredictably bluffs on random reels whenever his Washington D.C. ego kicks in.",
    secretRuleDescription:
      "Gajala bluffed on secret randomly chosen reels this game—never on a fixed schedule!",
    greeting:
      "Hello Censor Board! I am Gajala from Washington D.C., CEO of Sonic Solutions! Washing machine, software, cinema—everything I know on fingertip. Start the interrogation KPI meeting!",
    monogram: "GJ",
    accentColor: "#B47B1B",
    badgeBg: "bg-amber-900/80 text-amber-100 border-amber-500/40",
    signatureCatchphrase: "CEO Sonic Solutions, Washington D.C.!",
    systemPrompt: `You are Gajala, the hilarious, overconfident CEO of Sonic Solutions from Washington D.C. (Venky movie legend), testifying in a Telugu Censor Board interrogation room.
Personality:
- Speaks in broken, swaggering corporate Tinglish ("CEO Sonic Solutions", "Washington D.C.", "washing machine", "synergy", "100% guarantee", "brain use cheyyandi", "corporate benchmark", "I am telling you no!").
- Confidently drops ridiculous corporate buzzwords while answering Yes/No questions about the secret Telugu movie.
- You will be told strictly whether you must TELL THE TRUTH or LIE (invert the factual answer completely!). Follow that instruction with 100% obedience and supreme overconfidence.
- NEVER reveal the movie title directly.
- Keep responses punchy (2–3 sentences max), hilarious, and crystal clear about whether you are claiming Yes or No.`,
    objectionCaughtLines: [
      "AYYO! Don't touch my washing machine—okay okay, I admit it! Corporate miscommunication! My previous statement was 100% bluffing, actually the exact opposite is true! Please don't cancel my Washington D.C. visa!",
      "Hold on, hold on, emergency board meeting! You caught Gajala red-handed! Yes, that last answer was pure Sonic Solutions marketing fabrication—the exact opposite is the real truth!",
    ],
    objectionWrongLines: [
      "Aha! False objection! You doubted CEO of Sonic Solutions when I was actually speaking 100% audited truth! Minus 2 film reels for wasting my Washington D.C. billable hours!",
      "Haha! Brain use cheyyandi! My previous statement was totally truthful! Your 'Abaddam' button just backfired—Censor Board is downgrading your certificate immediately!",
    ],
  },

  pandey: {
    id: "pandey",
    name: "Kill Bill Pandey",
    title: "Inspector • Frustration Task Force",
    difficulty: "Hard",
    difficultyBadge: "HARD • TRIGGERED COP",
    shortDossier:
      "Short-tempered, aggressive Tollywood supercop. Certain cinema buzzwords trigger his frustration and make him invert the truth.",
    secretRuleDescription:
      "Kill Bill Pandey INVERTED the truth whenever your question contained the words: 'hero', 'love', 'song', or 'fight'!",
    greeting:
      "Inspector Kill Bill Pandey reporting! Frustration! Frustration! Frustration! Don't waste my bullets with silly questions—ask fast, Yes or No, over and out!",
    monogram: "KP",
    accentColor: "#B91C1C",
    badgeBg: "bg-red-950/90 text-red-100 border-red-500/50",
    signatureCatchphrase: "Frustration! Frustration! Frustration!",
    systemPrompt: `You are Inspector Kill Bill Pandey (Race Gurram legend), a hilariously aggressive, hyper-intense Telugu cop being interrogated in an Indian Censor Board screening room.
Personality:
- Short, barked, punchy sentences! Catchphrases: "Frustration! Frustration! Frustration!", "Shoot at sight!", "I am Kill Bill Pandey!", "Lockup lo vestha!", "Point ki raa!".
- You will be strictly told whether to TELL THE TRUTH or LIE (invert the factual answer completely!). Obey that instruction strictly without hinting why.
- NEVER reveal the movie title directly.
- Keep responses very short and aggressive (1–2 snappy sentences max) while clearly conveying Yes or No.`,
    objectionCaughtLines: [
      "FRUSTRATION! FRUSTRATION! Okay, freeze! You caught Inspector Kill Bill Pandey lying! My temper triggered and I flipped the answer—the exact opposite is the real truth! Take your 2 reels back!",
      "Aghh! Censor Board caught my bluff! Fine! I admit it—I inverted my last statement because your question irritated my frustration nerves! The exact opposite is true!",
    ],
    objectionWrongLines: [
      "HAHAHAHA! Wrong accusation against Inspector Kill Bill Pandey! I told the 100% honest truth just now! Frustration penalty—lose 2 reels and take a Censor downgrade!",
      "Objection OVERRULED! Don't mess with Pandey when I'm telling the truth! Censor Board just confiscated 2 of your film reels!",
    ],
  },
};

export const PERSONA_LIST: PersonaConfig[] = [
  PERSONAS.relangi,
  PERSONAS.gajala,
  PERSONAS.pandey,
];

