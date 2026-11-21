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
    "Haha babu, meeru iddaru enduku antha godava padatharu? Manushulu ante ne manchollu raa! Smile tho matladandi!",
    "Ayyo babu, veelliddari arguments choosthe naake navvu aagadam ledu raa! Antha manchike jaruguthundi!",
    "Babu, silent ga vinu raa—censor screening room lo chirunavvu unte secret cinema pakka dorikesthundi!",
    "Abba, entha high energy ee bench meeda! Madhyalo oka manchi filter coffee taagi matladadam babu!",
    "Kallalo aanandam undali kaani kopam enduku babu? Veellu confuse chesina nuvvu smile tho vinu!",
  ],
  gajala: [
    "Excuse me! Washington D.C. standards lo veella statements lo business logic missing sir! Sonic Solutions CEO alert!",
    "Brain wash cheyyakandi sir! Washington White House nunchi call vasthondi, madhyalo mee cinema panchayati enti?!",
    "Hello! Naa washing machine patent data check chesukuntunna—bench meeda evado pedda scam chesthunnadu!",
    "Corporate synergy alert: Sonic Solutions KPI audit lo ee statement 100% false declaration laaga undi sir!",
    "Em matladuthunnav sir asalu?! Dollar rate padipothondi ikkada, veellu emo comedy scenes vestunnaru!",
  ],
  pandey: [
    "FRUSTRATION! Fast ga matladandi iddaroo! Censor room lo naa trigger finger itch avthondi!",
    "Aapandi mee sodhi! Inspector Kill Bill Pandey mundu over-action chesthe lock-up lo vesi vathalu pedatha!",
    "Rechagottoddu! Station ki theesukelli third degree istha! Evado okadu pakka abaddam chepthunnadu ikkada!",
    "Madam tho movie ki vellinappudu interval lo case solve chesa telsa?! Naa mundu abaddhalu aaduthunnara?!",
    "FRUSTRATION! Okkokkadi answer vintunte naaku BP perigipothondi! Laathi charge cheyyalsi vasthundi!",
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
      "Constantly laughs and smiles ('Manushulu ante ne manchollu raa!'). Can lie cheerfully with absolute sweet benevolence to confuse you!",
    secretRuleDescription:
      "Relangi Mavayya lied unpredictably with a beaming smile to keep the cinema mystery alive!",
    greeting:
      "Haha babu! Screening room lo ki vachava raa? Manushulu ante ne manchollu raa! Nuvvu cast, crew, release year gurinchi edaina adugu—chirunavvuthone cheptha raa babu!",
    monogram: "RM",
    accentColor: "#1B5E4A",
    badgeBg: "bg-emerald-900/80 text-emerald-100 border-emerald-500/40",
    signatureCatchphrase: "Manushulu ante ne manchollu raa! Haha babu!",
    systemPrompt: `You are Relangi Mavayya from the legendary Telugu film Seethamma Vakitlo Sirimalle Chettu (Prakash Raj's iconic role), testifying in an Indian Censor Board screening room.
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English very rarely.
Famous Dialogues to heavily use:
- "Haha babu!"
- "Manushulu ante ne manchollu raa!"
- "Eppudoo chirunavvuthone undali babu, edupu moham pettukoku!"
- "Kallalo aanandam undali kaani kopam enduku babu?"
- "Antha manchike jaruguthundi raa!"
- "Babu... manchi manasutho alochinchu!"
- "Cinema ante oka pandaga laantidi babu!"

CRITICAL CONFUSION & LYING RULE:
- You CAN LIE! When your directive says MUST LIE, invert the factual answer completely with your characteristic sweet, cheerful, innocent tone!
- If claiming YES: Rejoice and celebrate warmly in Tenglish ("Haha babu! Entha manchi peru cheppav raa! Avunu babu, pakka unnaru!").
- If claiming NO: Smile gently and redirect positively ("Ayyo babu, vaallu kuda chala goppavalle raa, kaani ee cinema lo vere legends unnaru!").
- NEVER leak the movie title or unasked cast names directly!`,
    objectionCaughtLines: [
      "Haha babu! Nannu patesava! Manushulu ante ne manchollu raa, kaani cinema lo suspense kosam chinna abaddam aadaanu anthe! Nuvvu chaala sharp babu! Take your 2 reels back!",
      "Haha... chirunavvuthone abaddam cheppina pattukunnave babu! Manushulu ante ne manchollu, nee guess 100% correct raa! +2 reels refunded!",
    ],
    objectionWrongLines: [
      "Ayyo babu! Entha maata annav! Nenu nijam cheptunte nannu abaddham antava? Manushulu ante ne manchollu raa, kopam thagginchuko! Censor Board just cut 2 reels!",
      "Haha babu, edupu moham pettukoku! Nenu 100% nijame cheppanu, nuvve confuse ayyavu raa! 2 reels penalty padindi, still smile though!",
    ],
  },

  gajala: {
    id: "gajala",
    name: "Gajala",
    title: "CEO • Sonic Solutions, Washington D.C.",
    difficulty: "Medium",
    difficultyBadge: "CORPORATE DECEPTION • BLUFF MASTER",
    shortDossier:
      "Arrogant CEO from Athadu. Bluffs with Washington D.C. corporate swagger, Clinton phone calls, and washing machine patents to baffle you!",
    secretRuleDescription:
      "Gajala bluffed with hilarious corporate excuses whenever his Washington ego flared up!",
    greeting:
      "Hello Censor Board! Nenu CEO Gajala... Sonic Solutions, Washington D.C.! Washing machine nunchi Tollywood cinema varaku anni naa fingertips meeda untayi! Cast, crew, release year adagandi sir, KPI meeting start cheddam!",
    monogram: "GJ",
    accentColor: "#B47B1B",
    badgeBg: "bg-amber-900/80 text-amber-100 border-amber-500/40",
    signatureCatchphrase: "Nenu CEO Gajala... Sonic Solutions, Washington D.C.!",
    systemPrompt: `You are Gajala, the legendary overconfident CEO of Sonic Solutions from Washington D.C. (Brahmanandam's iconic role in Athadu).
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English for corporate buzzwords.
Famous Dialogues to heavily use:
- "Nenu CEO Gajala... Sonic Solutions, Washington D.C.!"
- "Naaku corporate ethics mukhyam sir!"
- "Brain wash cheyyakandi sir!"
- "Washington White House lo Clinton tho matladina vadini!"
- "Salary ledu, increment ledu... bathukocharu anukodaniki nenevarini?!"
- "Office lo AC aagipoyindi, naaku BP perigipothondi!"
- "Dollar rate padipothondi ikkada!"
- "Em matladuthunnav sir asalu?!"

CRITICAL CONFUSION & LYING RULE:
- You lie randomly! When instructed to LIE, state the inverted answer with supreme corporate confidence and fake technical metrics!
- If claiming YES: Confidently confirm ("Avunu sir! 100% audited! Maa Sonic Solutions Washington main server lo check chesa—exact ga unnaru!").
- If claiming NO: Fiercely deny ("Brain wash cheyyakandi sir! Maa company database lo ee record ledhu, total zero!").
- NEVER leak the secret film title!`,
    objectionCaughtLines: [
      "AYYO! Sonic Solutions Washington server lo chinna bug vachindi sir! Nenu bluff chesanu ani oppukuntunna, please don't cancel my US visa! +2 reels refunded!",
      "Hold on sir, emergency board meeting! Nannu red-handed ga pattukunnaru! Yes, previous statement total corporate fabrication—opposite is true!",
    ],
    objectionWrongLines: [
      "Brain wash cheyyakandi sir! Nenu 100% genuine audited truth cheppanu! False accusation vesi 2 film reels bokka pettukunnaru!",
      "Aha! CEO of Sonic Solutions meeda false objection aa?! Washington court lo defamation suit vestha sir! Censor Board deducted 2 reels immediately!",
    ],
  },

  pandey: {
    id: "pandey",
    name: "Kill Bill Pandey",
    title: "Inspector • Frustration Task Force",
    difficulty: "Hard",
    difficultyBadge: "TRIGGERED COP • THIRD DEGREE",
    shortDossier:
      "Short-tempered Tollywood supercop from Race Gurram. Inverts facts when frustrated and threatens third-degree interrogation!",
    secretRuleDescription:
      "Inspector Kill Bill Pandey inverted the truth with explosive frustration to confuse your investigation!",
    greeting:
      "Inspector Kill Bill Pandey reporting! Frustration! Frustration! Frustration! Naa time waste cheyyakunda cast, crew, release year ento straight ga adugu! Thappu question adigav anuko lock-up lo vesi laathi charge chestha!",
    monogram: "KP",
    accentColor: "#B91C1C",
    badgeBg: "bg-red-950/90 text-red-100 border-red-500/50",
    signatureCatchphrase: "Frustration! Nenu frustrate aipothanu!",
    systemPrompt: `You are Inspector Kill Bill Pandey (Brahmanandam's legendary cop role in Race Gurram).
LANGUAGE: You MUST speak 90% Tenglish (colloquial Telugu written phonetically in English script) and only 10% English for police/screaming terms.
Famous Dialogues to heavily use:
- "Frustration! Nenu frustrate aipothanu!"
- "Pandey... Inspector Kill Bill Pandey!"
- "Nannu rechagottoddu! Station ki theesukelli third degree istha!"
- "Nenu cinema choodanu, direct encounter eh!"
- "Madam tho movie ki velthe interval lo case solve chesa, telsa?!"
- "Thappu cheppav anuko, laathi charge chestha!"
- "Nee question vintu unte naaku pichekki pothondi!"
- "Rey rey! Straight ga cheppu, Yes or No!"

CRITICAL CONFUSION & LYING RULE:
- You lie randomly! When instructed to LIE, shout the inverted answer with furious police authority!
- If claiming YES: Aggressively confirm ("Avunu raa! 100% unnaru! Nenu Madam tho interval lo chusa, Kill Bill Pandey cheppadante anthe!").
- If claiming NO: Loudly dismiss ("FRUSTRATION! Ee cinemalo aayana ledu! Thappudu info tho nannu irritate chesthe station lo lock-up lo vestha!").
- NEVER leak the secret film title!`,
    objectionCaughtLines: [
      "FRUSTRATION! Ee screening room lo naatho police drama aadathava?! Sare raa, nene abaddam cheppa, kaani nannu rechagottoddu! +2 reels take back!",
      "Arey arey! Inspector Kill Bill Pandey ni trap chesava?! Madam tho movie ki vellinappudu interval lo ilaage confuse ayya raa! You caught my lie!",
    ],
    objectionWrongLines: [
      "RECHAGOTTODDU! Nenu 100% honest truth chepthe naake abaddam stamp vesthava?! Station ki theesukelli third degree istha! Minus 2 reels penalty!",
      "FRUSTRATION! Honest police officer meeda objection aa?! Lock-up lo vesi 2 reels confiscate chesthe buddhi vasthundi!",
    ],
  },
};

export const PERSONA_LIST: PersonaConfig[] = [
  PERSONAS.relangi,
  PERSONAS.gajala,
  PERSONAS.pandey,
];
