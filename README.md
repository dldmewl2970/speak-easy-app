# SpeakUp — English Pronunciation Practice App

A web app for practicing English speaking. Load a script, listen to native-quality TTS, record your own pronunciation, and get instant accuracy feedback with Korean translation and prosody guidance.

---

## Tech Stack

### Frontend
| Category | Libraries |
|---|---|
| Framework | React 18 + TypeScript + Vite |
| Routing | react-router-dom v6 |
| Server State | TanStack Query v5 |
| UI Components | shadcn/ui + Radix UI + Tailwind CSS v3 |
| Animation | Framer Motion |
| Form Validation | react-hook-form + zod |
| Icons | lucide-react |

### Backend (Supabase)
| Category | Detail |
|---|---|
| Database | PostgreSQL with Row Level Security |
| Auth | Email / OAuth via Supabase Auth |
| Edge Functions | Deno runtime (serverless) |

### External AI APIs
| API | Purpose |
|---|---|
| ElevenLabs | High-quality TTS — 14 English voices (US, UK, AU) |
| Google Gemini 2.5 Flash | Korean translation, stress/pause prosody markup, alternative expressions |

### Native Browser APIs
| API | Purpose |
|---|---|
| Web Speech API | Speech-to-text recognition (STT) |
| MediaRecorder API | Recording user's pronunciation |
| AudioContext + AnalyserNode | Silence detection (auto-stop after 4s of silence) |

---

## Project Structure

```
src/
├── pages/
│   ├── Index.tsx        # Main practice screen
│   ├── Scripts.tsx      # Script creation & management
│   ├── Auth.tsx         # Login / Sign up
│   └── NotFound.tsx
├── components/
│   ├── ScriptDisplay.tsx       # Displays the current sentence
│   ├── FeedbackDisplay.tsx     # Accuracy score + prosody + translation
│   ├── ListenOnlyDisplay.tsx   # Auto-play panel for listen-only mode
│   ├── SentenceNav.tsx         # Sentence navigation controls
│   └── ui/                     # shadcn/ui component library
├── hooks/
│   ├── useGoogleTTS.ts         # ElevenLabs TTS playback hook
│   └── useSentenceImage.ts     # Sentence image cache hook
├── contexts/
│   └── AuthContext.tsx         # Global auth state via Supabase
├── integrations/
│   └── supabase/               # Supabase client + generated types
└── lib/
    └── scripts.ts              # splitSentences() utility

supabase/
├── functions/
│   ├── tts/            # Edge Function → ElevenLabs API
│   ├── translate/      # Edge Function → Gemini 2.5 Flash
│   └── sentence-image/ # Edge Function → AI image generation
└── migrations/         # PostgreSQL schema + RLS policies
```

---

## Database Schema

### `scripts`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Owner (FK to auth.users) |
| `name` | text | Script name |
| `text` | text | Full script content |
| `folder` | text | Optional folder grouping |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-updated via trigger |

### `sentence_images`
| Column | Type | Description |
|---|---|---|
| `id` | UUID | Primary key |
| `sentence_text` | text | Unique sentence (cache key) |
| `image_data` | text | Base64-encoded image |

All tables use **Row Level Security** — users can only access their own data.

---

## Core Data Flow

```
Script input (Scripts page)
  → splitSentences()        # Split by newline or period (custom regex supported)
  → sessionStorage          # Pass sentences to practice screen
  → Index page loads sentences

Per sentence:
  → ElevenLabs TTS plays    # Native pronunciation
  → MediaRecorder starts    # User records pronunciation
  → Web Speech API (STT)    # Transcribes user's speech
  → Word-by-word comparison # Accuracy % calculated
  → Gemini API              # Korean translation + prosody + alternatives
  → FeedbackDisplay renders # Score, stress guide, translation shown
```

---

## Practice Modes

### Pronunciation Practice Mode (default)
1. Sentence loads → TTS plays automatically
2. Recording starts automatically after TTS ends
3. Silence for 4 seconds triggers auto-stop
4. Feedback panel shows word accuracy, prosody, Korean translation, and alternative expressions
5. Navigate to next sentence with arrow keys or touch swipe

### Listen-Only Mode
- TTS plays the sentence N times (1–3×, configurable)
- After playback, auto-advances to the next sentence after a configurable delay (1–10s)
- Pause/resume supported
- Translation panel shown optionally

---

## Key Design Decisions

**Audio unlock on mobile** — iOS and Android block programmatic audio playback until a user gesture occurs. `unlockAudio()` plays a silent MP3 on the first user interaction to unlock the AudioContext for all subsequent TTS calls.

**Shared Audio element** — a single `HTMLAudioElement` is reused across all TTS calls to avoid iOS autoplay restrictions that apply to newly created audio elements.

**Network retry for STT** — Chrome's Web Speech API occasionally hits transient network errors. The app automatically retries up to 2 times before surfacing an error to the user.

**Sentence image cache** — AI-generated images for sentences are stored in the `sentence_images` table so the same image is never generated twice, reducing API cost.

**Folder grouping** — scripts can be organized into named folders. The Scripts page renders a collapsible folder tree built from a `useMemo`-derived grouping of the flat scripts array.

---

## Edge Functions

### `tts`
Calls the ElevenLabs API with the selected voice ID and speed setting. Returns the audio as a base64-encoded MP3 string to avoid binary streaming issues through Supabase's JSON response layer.

### `translate`
Calls Gemini 2.5 Flash via the Lovable AI Gateway using tool/function calling to enforce a structured JSON response with three fields: `translation` (Korean), `prosody` (stress + pause markup), and `alternatives` (2–3 reworded English expressions).

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm test

# Run E2E tests (Playwright)
npx playwright test
```

Required environment variables (set in Supabase dashboard):
```
ELEVENLABS_API_KEY=
LOVABLE_API_KEY=
```

---

## Authentication

Auth state is managed by `AuthContext`, which wraps the entire app and subscribes to `supabase.auth.onAuthStateChange`. A 2-second fallback timer calls `getSession()` in case the event does not fire (a known issue in some mobile browsers).

Unauthenticated users can still practice using scripts stored in `sessionStorage`. Signing in enables cloud sync of scripts across devices.
