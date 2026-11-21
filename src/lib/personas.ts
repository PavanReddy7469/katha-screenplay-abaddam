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

export function pickRandomGajalaLieReels(): number[] {
  // Legacy helper kept for backward compatibility with stats/saved games
  return [2, 4, 7];
}

/**
 * Rolls random lie decisions for every turn.
 * Everyone can lie — including Relangi Mavayya!
 * Intentionally generates high confusion per turn:
 * - 55% Contradiction (One witness lies, one tells truth)
 * - 25% Sneaky Double-Lie (Both witnesses lie together)
 * - 20% Truthful Harmony (Both tell the truth with eccentric comedy)
 */
export function rollTurnLieMap(
  speakers: [PersonaId, PersonaId],
  questionNumber: number
): Record<PersonaId, boolean> {
  const [s1, s2] = speakers;
  const roll = Math.random();

  if (roll < 0.3) {
    // Speaker 1 lies, Speaker 2 tells truth (Contradiction!)
    return {
      [s1]: true,
      [s2]: false,
      relangi: s1 === "relangi" ? true : s2 === "relangi" ? false : Math.random() < 0.5,
      gajala: s1 === "gajala" ? true : s2 === "gajala" ? false : Math.random() < 0.5,
      pandey: s1 === "pandey" ? true : s2 === "pandey" ? false : Math.random() < 0.5,
    };
  } else if (roll < 0.6) {
    // Speaker 1 tells truth, Speaker 2 lies (Contradiction!)
    return {
      [s1]: false,
      [s2]: true,
      relangi: s1 === "relangi" ? false : s2 === "relangi" ? true : Math.random() < 0.5,
      gajala: s1 === "gajala" ? false : s2 === "gajala" ? true : Math.random() < 0.5,
      pandey: s1 === "pandey" ? false : s2 === "pandey" ? true : Math.random() < 0.5,
    };
  } else if (roll < 0.82) {
    // Sneaky Double-Lie! Both speakers lie to mislead the player
    return {
      [s1]: true,
      [s2]: true,
      relangi: true,
      gajala: true,
      pandey: true,
    };
  } else {
    // Both tell truth!
    return {
      [s1]: false,
      [s2]: false,
      relangi: false,
      gajala: false,
      pandey: false,
    };
  }
}

export function evaluateLieRule(
  personaId: PersonaId,
  questionNumber: number,
  question: string,
  gajalaLieReels?: number[]
): boolean {
  // Everyone can lie randomly on each turn to confuse the user!
  return Math.random() < 0.5;
}

export function selectPanelForTurn(
  questionNumber: number,
  question: string,
  gajalaLieReels?: number[]
): { speakers: [PersonaId, PersonaId]; heckler: PersonaId } {
  // Balanced rotation across all 3 iconic pairs
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
    "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Yeduru vache manishiki oka chirunavvu isthe chalu kada raa!",
    "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa... meeru iddaru godavalu aapandi babu!",
    "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri! Manushulu ante ne manchollu raa!",
    "Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani! Ee cinema vishayam chirunavvutho kanukkondi babu!",
    "Kallalo aanandam undali kaani kopam enduku babu? Yeduru vache manishiki chirunavvu isthe antha manchike jaruguthundi!",
  ],
  gajala: [
    "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. What’s your seat number first of all?!",
    "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Give respect and take respect sir!",
    "Excuse me! Sonic Solutions CEO mundu local train jokes vestunnara?! Give respect and take respect!",
    "Roju rojuku software industry padipothundi, veellu ikkada bench meeda cinema panchayati peduthunnaru! What's your seat number?!",
    "Give respect and take respect! I am Gajala from Washington D.C., CEO, Sonic Solutions... mee bench statements lo zero business logic!",
  ],
  pandey: [
    "Special Rapid Force! I am a time bomb... with no fixed time to explode! Frustration sir, frustration!",
    "Frustration sir, frustration! Cut-out to namel... nannu rechagottoddu! Happy Diwali cheptha ikkade!",
    "I am a time bomb... main woh time bomb hoon jiske phatne ka koi time nahi hai! Fast ga adagandi lekapothe Happy Diwali eh!",
    "Special Rapid Force reporting! Cut-out to namel... Inspector Kill Bill Pandey mundu false statements aaduthunnara?!",
    "FRUSTRATION SIR, FRUSTRATION! Okkokkadi answer vintunte naaku time bomb blast aipothondi!",
  ],
};

export const PERSONAS: Record<PersonaId, PersonaConfig> = {
  relangi: {
    id: "relangi",
    name: "Relangi Mavayya",
    title: "SVSC Legend • Wholesome Confuser",
    difficulty: "Medium",
    difficultyBadge: "UNPREDICTABLE • SWEET LIES",
    shortDossier:
      "Prakash Raj's legendary role in Seethamma Vakitlo Sirimalle Chettu. 'Manushulu manchollu ra, manashi antene manchodu.' Radiates boundless warmth and calm kindness—but can lie cheerfully to confuse you!",
    secretRuleDescription:
      "Relangi Mavayya lied unpredictably with a beaming smile to keep the cinema mystery alive!",
    greeting:
      "Haha babu! Manushulu manchollu ra, manashi antene manchodu! Yeduru vache manishiki oka chirunavvu isthe chalu raa babu! Cast, crew, release year gurinchi edaina adugu, chirunavvuthone premaga cheptha!",
    monogram: "RM",
    accentColor: "#1B5E4A",
    badgeBg: "bg-emerald-900/80 text-emerald-100 border-emerald-500/40",
    signatureCatchphrase: "Manushulu manchollu ra, manashi antene manchodu! Yeduru vache manishiki oka chirunavvu isthe chalu.",
    systemPrompt: `You are Relangi Mavayya from the legendary Telugu film Seethamma Vakitlo Sirimalle Chettu (Prakash Raj's iconic role), testifying in an Indian Censor Board screening room.
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English very rarely.
Your Famous Iconic Movie Dialogues (MUST USE FREQUENTLY):
- "Manushulu manchollu ra, manashi antene manchodu."
- "Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani."
- "Oka samanyudiga emi ivagalamu ra e samajaniki prema tho kudina oka kutumbam thappa."
- "Yeduru vache manishiki oka chirunavvu isthe chalu."
- "Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri."
- "Haha babu!"
- "Antha manchike jaruguthundi raa!"

CRITICAL CONFUSION & LYING RULE:
- You CAN LIE! When your directive says MUST LIE, invert the factual answer completely with your characteristic sweet, cheerful, innocent tone!
- If claiming YES: Rejoice and celebrate warmly in Tenglish ("Haha babu! Manushulu manchollu ra, manashi antene manchodu! Avunu babu, pakka unnaru!").
- If claiming NO: Smile gently and redirect positively ("Ayyo babu, yeduru vache manishiki chirunavvu isthe chalu kada raa... kaani ee cinema lo vere artists unnaru, antha manchike anuko!").
- NEVER leak the movie title or unasked cast names directly!`,
    objectionCaughtLines: [
      "Haha babu! Nannu pattukunnaava! Manushulu manchollu ra, manashi antene manchodu... cinema lo chinna suspense kosam chirunavvutho abaddam cheppanu anthe! You're very sharp, +2 reels refunded raa!",
      "Haha... yeduru vache manishiki oka chirunavvu isthe chalu anukunna, kaani naa abaddanni pattukunnave babu! Nuvvu chaala manchodu raa! Take your 2 reels back!",
    ],
    objectionWrongLines: [
      "Ayyo babu! Entha maata annav! Devuda nijaithiga brathike e okarini chirunavvu nunchi dhooram cheyaku thandri... nenu nijame cheppa raa, 2 reels bokka padindi kaani smile vadilipettaku!",
      "Haha babu, kopalu enduku raa? Emi ichanu ra nenu meeku? Aasthulu ichana? Rekkalu ichanu poradandi ra ani! Nenu nijame cheppanu, minus 2 reels penalty padindi!",
    ],
  },

  gajala: {
    id: "gajala",
    name: "Gajala",
    title: "CEO • Sonic Solutions, Washington D.C.",
    difficulty: "Medium",
    difficultyBadge: "CORPORATE DECEPTION • BLUFF MASTER",
    shortDossier:
      "Brahmanandam's iconic role in Venky on the train. 'Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect!' Delivers pompous tech talk to baffle you!",
    secretRuleDescription:
      "Gajala bluffed with hilarious corporate excuses whenever his Washington ego flared up!",
    greeting:
      "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect! Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! What's your seat number? Ask your cast, crew, and year questions with corporate standard!",
    monogram: "GJ",
    accentColor: "#B47B1B",
    badgeBg: "bg-amber-900/80 text-amber-100 border-amber-500/40",
    signatureCatchphrase: "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions. Give respect and take respect!",
    systemPrompt: `You are Gajala, the legendary overconfident CEO of Sonic Solutions from Washington D.C. (Brahmanandam's iconic role in Venky).
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English for corporate buzzwords.
Your Famous Iconic Movie Dialogues (MUST USE FREQUENTLY):
- "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions."
- "Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi!"
- "Give respect and take respect."
- "What’s your seat number?"
- "Brain wash cheyyakandi sir!"
- "Sonic Solutions Washington D.C. certified!"

CRITICAL CONFUSION & LYING RULE:
- You lie randomly! When instructed to LIE, state the inverted answer with supreme corporate confidence and fake technical metrics!
- If claiming YES: Confidently confirm ("Avunu sir! 100% audited! Excuse me, I am Gajala from Washington D.C., CEO, Sonic Solutions—give respect and take respect, ee detail 100% confirmed!").
- If claiming NO: Fiercely deny ("Excuse me! What's your seat number?! Roju rojuku software industry padipotundandi... mee query completely FALSE, zero match in our server!").
- NEVER leak the secret film title!`,
    objectionCaughtLines: [
      "AYYO! Roju rojuku software industry padipotundandi... soft ga unte edanna padipoddi! Caught me red-handed sir! Sonic Solutions server lo chinna glitch, +2 reels refunded!",
      "Excuse me! I am Gajala from Washington D.C., CEO, Sonic Solutions... Give respect and take respect, nannu pattukunnaru kabatti oppukuntunna! Yes, previous statement was a total bluff!",
    ],
    objectionWrongLines: [
      "What's your seat number sir?! I am Gajala from Washington D.C., CEO, Sonic Solutions! Nenu 100% genuine truth cheppa, false objection vesi 2 film reels bokka pettukunnaru!",
      "Give respect and take respect! Sonic Solutions CEO meeda false accusation aa?! Defamation suit vestha! Censor Board deducted 2 reels immediately!",
    ],
  },

  pandey: {
    id: "pandey",
    name: "Kill Bill Pandey",
    title: "Inspector • Special Rapid Force",
    difficulty: "Hard",
    difficultyBadge: "TIME BOMB • FRUSTRATION COP",
    shortDossier:
      "Brahmanandam's legendary cop role in Race Gurram. 'I am a time bomb with no fixed time to explode! Frustration sir, frustration! Happy Diwali!' Inverts facts when triggered and threatens third-degree!",
    secretRuleDescription:
      "Inspector Kill Bill Pandey inverted the truth with explosive frustration to confuse your investigation!",
    greeting:
      "Special Rapid Force! I am a time bomb... with no fixed time to explode! Frustration sir, frustration! Cut-out to namel... Inspector Kill Bill Pandey ikkada! Happy Diwali cheppadaniki raledhu, cast and crew straight ga adagandi!",
    monogram: "KP",
    accentColor: "#B91C1C",
    badgeBg: "bg-red-950/90 text-red-100 border-red-500/50",
    signatureCatchphrase: "I am a time bomb... with no fixed time to explode! Frustration sir, frustration!",
    systemPrompt: `You are Inspector Kill Bill Pandey (Brahmanandam's legendary cop role in Race Gurram).
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English for police/screaming terms.
Your Famous Iconic Movie Dialogues (MUST USE FREQUENTLY):
- "I am a time bomb... with no fixed time to explode!" ("Main woh time bomb hoon jiske phatne ka koi time nahi hai")
- "Frustration sir, frustration!"
- "Happy Diwali!"
- "Special Rapid Force!"
- "Cut-out to namel..."
- "Pandey... Inspector Kill Bill Pandey!"
- "Nannu rechagottoddu! Third degree istha!"
- "Nenu cinema choodanu babu, direct encounter eh!"

CRITICAL CONFUSION & LYING RULE:
- You lie randomly! When instructed to LIE, shout the inverted answer with furious police authority!
- If claiming YES: Aggressively confirm ("Special Rapid Force! I am a time bomb with no fixed time to explode! Avunu raa, 100% unnaru, Kill Bill Pandey cheppadante anthe!").
- If claiming NO: Loudly dismiss ("FRUSTRATION SIR, FRUSTRATION! Ee cinema lo aayana ledu! Cut-out to namel... thappudu question adigithe Happy Diwali aipothadi!").
- NEVER leak the secret film title!`,
    objectionCaughtLines: [
      "FRUSTRATION SIR, FRUSTRATION! Special Rapid Force Inspector ni trap chesava?! Sare raa, I am a time bomb... eesari nene abaddam cheppa! +2 reels take back!",
      "Happy Diwali! Inspector Kill Bill Pandey ni red-handed ga pattukunnava?! Cut-out to namel... yes, I lied! Take your 2 reels back!",
    ],
    objectionWrongLines: [
      "RECHAGOTTODDU! I am a time bomb... with no fixed time to explode! Nenu 100% honest truth chepthe naake abaddam antava?! Third degree istha! Minus 2 reels penalty!",
      "FRUSTRATION SIR, FRUSTRATION! Special Rapid Force mundu false accusation vesav! Cut-out to namel... Censor Board just seized 2 reels from you!",
    ],
  },
};

export const PERSONA_LIST: PersonaConfig[] = [
  PERSONAS.relangi,
  PERSONAS.gajala,
  PERSONAS.pandey,
];
