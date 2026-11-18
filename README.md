# 🎬 Katha, Screenplay, Abaddam: Meere!

> **కథ • స్క్రీన్ ప్లే • అబద్ధం : మీరే!**  
> A chaotic, reverse-interrogation Telugu movie guessing game set inside an official Indian Censor Board (CBFC) screening room.

Built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Fuse.js**, and **Groq AI** (with a built-in comedy rule-based fallback simulator so it works out of the box even without an API key!).

---

## 🎭 How to Play

1. **CBFC Censor Board Splash Screen:** Inspect the vintage Central Board of Film Certification certificate, choose your witness difficulty, and slam **ENTER SCREENING ROOM**.
2. **8-Reel Interrogation:** Ask up to **8 Yes/No questions** (via quick-tap tactical chips or free-text input) to deduce one of **15 iconic Telugu movies** (*Athadu, Pokiri, Magadheera, Eega, Baahubali: The Beginning, Bommarillu, Maryada Ramanna, Khaleja, Arjun Reddy, RRR, Rangasthalam, Jalsa, Ala Vaikunthapurramuloo, Sankarabharanam, Pushpa: The Rise*).
3. **Spot the Hidden Lie Rule & Call `OBJECTION! (ABADDAM!)`:**
   - **Easy — Relangi Mavayya:** Never lies, but refuses to say "No" directly—spinning everything with overly wholesome Tinglish positivity.
   - **Medium — Gajala (CEO, Sonic Solutions):** Overconfident corporate Tinglish—programmatically forced to **LIE on every 3rd question** (Reel #3 and Reel #6).
   - **Hard — Kill Bill Pandey:** Short-tempered supercop—programmatically **INVERTS the truth** whenever your question contains the words `"hero"`, `"love"`, `"song"`, or `"fight"`.
   - Use your one-time **`OBJECTION! (ABADDAM!)`** button on a lie to make the witness panic, refund **+2 film reels**, and upgrade your Censor Certificate (`U/A`, `A`, `S`). A false accusation costs **-2 reels** and downgrades you toward **`BANNED BY CENSOR BOARD`**!
4. **Final Verdict & Share Card:** Submit your movie title with fuzzy spelling tolerance (`fuse.js`) and copy your vintage Censor Gazette scorecard for WhatsApp or X.

---

## 🛠️ Local Development

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Groq API Key for live LLM comedy responses
cp .env.local.example .env.local
# Edit .env.local and set GROQ_API_KEY=gsk_your_actual_key
# Note: Without a key, the app runs seamlessly using its built-in Tinglish comedy simulator!

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🚀 Deploying `katha-screenplay-abaddam` to Vercel

### Option 1: One-Click via Vercel Dashboard (Recommended)
1. Push this repository to GitHub as **`katha-screenplay-abaddam`**.
2. Go to [vercel.com/new](https://vercel.com/new) and import the `katha-screenplay-abaddam` repository.
3. Keep the default **Next.js** framework preset (`Build Command: next build`, `Output Directory: .next`).
4. Under **Environment Variables**, add:
   - **Name:** `GROQ_API_KEY`
   - **Value:** Your Groq API key (get one free at [console.groq.com/keys](https://console.groq.com/keys))
5. Click **Deploy**! Your site will go live at **`https://katha-screenplay-abaddam.vercel.app`**.

### Option 2: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
# Add your optional Gemini key in Vercel:
vercel env add GEMINI_API_KEY production
```

---

## 📁 Project Structure

```text
katha-screenplay-abaddam/
├── src/
│   ├── app/
│   │   ├── api/interrogate/route.ts   # Deterministic lie rules + Gemini API / fallback simulator
│   │   ├── globals.css                # CBFC parchment paper, rubber-stamp & film booth styles
│   │   ├── layout.tsx                 # Vintage typography (Special Elite, Playfair, Noto Telugu)
│   │   └── page.tsx                   # Stage router & movie randomization
│   ├── components/
│   │   ├── CensorSplash.tsx           # Stage 1: CBFC U/A Certificate & Witness Selector
│   │   ├── InterrogationRoom.tsx      # Stage 2: Censor Meter, 8 Film Reels, Chat, Objection & Fuse Verdict
│   │   └── VerdictCard.tsx            # Stage 3: Censor Gazette Share Card (WhatsApp/X copy)
│   ├── data/
│   │   └── movies.json                # 15 iconic Telugu classics with tropes, props & hints
│   └── lib/
│       └── personas.ts                # Relangi Mavayya, Gajala, Kill Bill Pandey configs & lie evaluator
├── .env.local.example
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

