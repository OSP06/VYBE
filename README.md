# VYBE

A mood-first discovery app for cafes and restaurants. Pick a feeling — the AI reads your vibe and surfaces places ranked to match it. No search, no star-rating rabbit holes, no browsing. VYBE decides for you.

Built with FastAPI + PostgreSQL on the backend, Expo React Native on mobile.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                              │
│                                                                 │
│  Weather + time → auto-mood suggestion on Onboarding            │
│  User picks mood  →  Expo React Native  →  HTTP (axios)         │
│  JWT 401 interceptor → auto logout on token expiry              │
└───────────────────────────────┬─────────────────────────────────┘
                                │  GET /api/v1/places?mood=calm&city_id=1
                                │  Authorization: Bearer <jwt>
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                          │
│                                                                 │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────┐  ┌───────┐  │
│  │  Auth Router │  │ Places Router │  │  Saves   │  │ Vibe  │  │
│  │  /auth/*     │  │  /places      │  │  Router  │  │ Check │  │
│  │              │  │  /places/{id} │  │  /save   │  │ Router│  │
│  │ JWT HS256    │  │  /neighborhoods│  │  /saved  │  │/vibe- │  │
│  │ bcrypt(12)   │  │  /cities      │  │  (newest │  │ check │  │
│  │ rate-limited │  │               │  │  first)  │  │       │  │
│  └──────────────┘  └───────┬───────┘  └──────────┘  └───────┘  │
│                            │                                    │
│                  ┌─────────▼──────────┐                         │
│                  │   Ranking Service  │                         │
│                  │                   │                          │
│                  │  1. Load places + │                          │
│                  │     vibes for city│                          │
│                  │                   │                          │
│                  │  2. Time-adjust   │                          │
│                  │     vibe_vector   │                          │
│                  │     by hour of day│                          │
│                  │                   │                          │
│                  │  3. Cosine sim    │                          │
│                  │   mood · vibe     │                          │
│                  │                   │                          │
│                  │  4. Score =       │                          │
│                  │  0.55×vibe_match  │                          │
│                  │  0.20×rating      │                          │
│                  │  0.15×hype_score  │                          │
│                  │  0.10×distance    │                          │
│                  │                   │                          │
│                  │  5. Personalise   │                          │
│                  │  ±0.08 nudge from │                          │
│                  │  vibe_feedback    │                          │
│                  │  (auth users)     │                          │
│                  │                   │                          │
│                  │  6. Return top 20 │                          │
│                  └─────────┬─────────┘                         │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │  SQLAlchemy async (asyncpg)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL 16                             │
│                                                                 │
│  cities          places               place_vibes              │
│  ─────────       ──────────────────   ────────────────────      │
│  id              id                   place_id (PK, FK)         │
│  name            city_id (FK)         vibe_vector (JSONB)       │
│  country         name                 hype_score                │
│                  lat / lng            summary                   │
│  users           rating               crowd                     │
│  ─────────       price_range                                    │
│  id              address              saved_places              │
│  email           image_url            ────────────────          │
│  hashed_password neighborhood         user_id (PK, FK)          │
│  display_name    google_place_id      place_id (PK, FK)         │
│  preferred_vibes review_snippets      saved_at                  │
│  created_at      opening_hours                                  │
│                                       vibe_feedback             │
│                                       ────────────────          │
│                                       id                        │
│                                       user_id (FK)              │
│                                       place_id (FK)             │
│                                       mood                      │
│                                       felt_right                │
│                                       created_at                │
│                                       ix_vf_user_mood (index)   │
└─────────────────────────────────────────────────────────────────┘
                             ▲
                             │  one-time batch ingestion
┌────────────────────────────┴────────────────────────────────────┐
│                         AI WORKER                               │
│                                                                 │
│  ingest_google_places.py        generate_vibes.py               │
│  ───────────────────────        ──────────────────              │
│  Google Places API (New)  →     GPT-4o-mini (JSON mode)         │
│  Text Search by category        Prompt includes real reviews    │
│  Captures per place:            Extracts per place:             │
│  • reviews (top 5 English)      • vibe_vector (8 dims)          │
│  • opening_hours periods        • hype_score                    │
│  • photo URL                    • summary                       │
│  Deduplication by               • crowd                         │
│  google_place_id                                                │
│                                 enrich_reviews.py               │
│                                 ──────────────────              │
│                                 Backfills review_snippets       │
│                                 for existing places via         │
│                                 Google Places Details API       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ranking Algorithm

Each place has a `vibe_vector` — 8 floating-point dimensions scored 0–1 by GPT-4o-mini, calibrated using real Google reviews:

```
calm · aesthetic · lively · social · premium · budget · work_friendly · date_friendly
```

Each mood maps to a target vector with the same 8 dimensions:

```python
MOOD_VECTORS = {
  "calm":         {"calm":0.85, "aesthetic":0.6,  "lively":0.1,  "social":0.15, ...},
  "romantic":     {"calm":0.6,  "aesthetic":0.8,  "lively":0.3,  "social":0.4,  ...},
  "focus":        {"calm":0.7,  "aesthetic":0.5,  "lively":0.1,  "social":0.1,  ...},
  # ... 8 moods total
}
```

### Time-aware adjustment

Before computing similarity, the place's `vibe_vector` is adjusted for the current hour. A cafe IS calmer at 9am than at 9pm — the algorithm reflects this:

```python
# Morning (05:00–11:00)
calm          × 1.25   work_friendly × 1.20
lively        × 0.75   social        × 0.85

# Evening / night (18:00–03:00)
social        × 1.25   lively        × 1.25
date_friendly × 1.20   calm          × 0.80
work_friendly × 0.70
```

### Personalisation

Authenticated users get a ±0.08 score nudge based on their past `vibe_feedback` for each mood. Places the user said "felt right" rank higher; places they dismissed rank lower. Applied at query time, per user, per mood.

### Final score formula

```
time_vec    = time_adjust(place.vibe_vector, current_hour)
vibe_match  = cosine_similarity(mood_vector, time_vec)
rating_norm = place.rating / 5.0
dist_score  = 1 / (1 + haversine_km(user, place))
feedback    = +0.08 if felt_right else -0.08 (per past vote)

score = 0.55 × vibe_match
      + 0.20 × rating_norm
      + 0.15 × place.hype_score
      + 0.10 × dist_score
      + feedback nudge (auth users)
```

Places scoring below 0.25 are filtered out. The top 20 are returned. A 3.8★ hidden gem with a perfect vibe match outranks a 4.8★ tourist trap — by design.

---

## What Makes VYBE Different

| Feature | VYBE | Google Maps / Yelp | Atmosphere |
|---|---|---|---|
| Discovery model | Mood → ranked places | Search → category → filter | Browse → list |
| Ranking signal | Vibe fit + time of day | Star rating + reviews count | Trend + aggregation |
| Pay-to-play listings | No | Yes (sponsored results) | No |
| Time-aware results | ✓ (9am feed ≠ 9pm feed) | Popular times only | No |
| Vibe match % on card | ✓ (e.g. 87% VIBE MATCH) | No | No |
| Vibe match reason | ✓ (MATCHED FOR CALM · quiet · work-friendly) | No | No |
| Auto-mood suggestion | ✓ (weather + time of day) | No | No |
| Personalised ranking | ✓ (vibe feedback nudges scores) | No | No |
| Vibe verification | ✓ (crowdsourced ground truth) | Reviews only | No |
| UX model | Swipe to decide | Browse to compare | Browse to compare |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo React Native (SDK ~54), React Navigation v6 |
| State | TanStack Query v5 (server state), React Context (auth, theme) |
| HTTP | axios with 10s timeout + 401 interceptor for JWT expiry |
| Backend | FastAPI 0.111, Python 3.11 |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Database | PostgreSQL 16 |
| Migrations | Alembic |
| Auth | JWT (python-jose HS256, 7-day expiry) + bcrypt (passlib, cost=12) |
| Rate limiting | slowapi (5/min register, 10/min login) |
| Input validation | pydantic EmailStr + Field(min_length=6) |
| Token storage | expo-secure-store (iOS Keychain / Android Keystore) |
| AI | OpenAI GPT-4o-mini (JSON mode) |
| Place data | Google Places API (New) — Text Search |
| Weather | OpenWeatherMap API (free tier) |
| Haptics | expo-haptics (save, unsave, swipe-right) |
| Location | expo-location (distance ranking + weather suggestion) |
| Fonts | Bebas Neue, DM Sans, Playfair Display |

---

## Monorepo Structure

```
vybe/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py           # register (rate-limited), login (rate-limited), /me, PATCH /me
│   │   │   ├── places.py         # GET /places (personalised), /places/{id}, /neighborhoods
│   │   │   ├── saves.py          # POST/DELETE /save, GET /saved (newest first)
│   │   │   ├── cities.py         # GET /cities
│   │   │   ├── users.py          # POST /user/preferences
│   │   │   └── vibe_check.py     # POST /vibe-check
│   │   ├── core/
│   │   │   ├── config.py         # pydantic-settings (DATABASE_URL, ALLOWED_ORIGINS, keys)
│   │   │   ├── limiter.py        # slowapi Limiter instance (shared to avoid circular import)
│   │   │   └── security.py       # hash_password, create_access_token, decode_token
│   │   ├── db/
│   │   │   ├── base.py           # async engine, get_db dependency
│   │   │   └── models/           # City, Place, PlaceVibe, User, SavedPlace, VibeFeedback
│   │   ├── schemas/
│   │   │   └── place.py          # PlaceSchema, PlaceVibeSchema (Pydantic v2)
│   │   ├── services/
│   │   │   └── ranking.py        # rank_places(), time_adjust(), cosine sim, feedback nudge
│   │   └── main.py               # FastAPI app, CORS (env-configurable), global error handler
│   ├── alembic/                  # migrations (opening_hours, vibe_feedback index)
│   ├── ingest_google_places.py   # Google Places batch ingestion
│   └── enrich_reviews.py         # backfill review_snippets from Google Details API
│
├── ai-worker/
│   └── generate_vibes.py         # GPT-4o-mini vibe generation (--regenerate flag)
│
├── mobile/
│   └── src/
│       ├── screens/
│       │   ├── Onboarding.js     # landing page + mood picker + weather/time auto-mood banner
│       │   ├── Home.js           # swipe feed + area picker + ranking badge
│       │   ├── Detail.js         # place detail + scroll-fade hero + vibe bars + rate-the-vibe
│       │   ├── Saved.js          # saved collection (newest first, numbered list)
│       │   ├── Profile.js        # user profile + display name edit
│       │   ├── SeeAll.js         # full list view for a mood
│       │   ├── Login.js          # keyboard-aware, focused input state
│       │   └── Register.js       # keyboard-aware, focused input state
│       ├── components/
│       │   ├── SwipeStack.js     # swipe card stack + vibe match % + match reason line
│       │   ├── MoodHero.js       # animated gradient hero (Animated API)
│       │   ├── MoodChip.js       # pressable mood tile with spring animation
│       │   ├── FadeImage.js      # image with opacity fade-in on load
│       │   └── StatusRow.js      # top bar (logo, theme toggle, time)
│       ├── contexts/
│       │   ├── AuthContext.js    # JWT token + user state (SecureStore) + 401 auto-logout
│       │   └── ThemeContext.js   # light/dark color tokens
│       ├── services/
│       │   └── api.js            # axios instance (10s timeout, 401 interceptor, setUnauthorizedHandler)
│       ├── constants/
│       │   ├── moods.js          # 8 moods: id, label, evocative tagline, emoji, color, gradient
│       │   └── theme.js          # color tokens (light + dark), font names, radius, shadows
│       └── navigation/
│           └── index.js          # RootStack (auth gate) + MainTabs
│
└── V2_ROADMAP.md                 # planned V2 features (vision scoring, food layer, etc.)
```

---

## Setup

### Prerequisites
- Python 3.11+
- Node 18+
- Docker
- Expo Go app on your phone

### 1. Environment

```bash
cp .env.example .env
# Fill in:
#   DATABASE_URL
#   SECRET_KEY        (generate: python -c "import secrets; print(secrets.token_hex(32))")
#   OPENAI_API_KEY
#   GOOGLE_PLACES_API_KEY
#   EXPO_PUBLIC_OPENWEATHER_KEY   (openweathermap.org/api → free plan)
#   ALLOWED_ORIGINS               (comma-separated, default "*")
```

### 2. Database

```bash
docker run -d --name vybe-pg \
  -e POSTGRES_USER=vybe -e POSTGRES_PASSWORD=vybe -e POSTGRES_DB=vybe \
  -p 5432:5432 postgres:16-alpine
```

### 3. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

alembic upgrade head     # run all migrations
```

### 4. AI Worker (one-time)

```bash
# Ingest real places from Google (idempotent — safe to re-run)
python backend/ingest_google_places.py

# Backfill reviews for any existing places already in DB
python backend/enrich_reviews.py

# Generate vibe vectors for all places (uses reviews when available)
cd ai-worker
pip install -r requirements.txt
python generate_vibes.py

# To re-score after enriching reviews:
python generate_vibes.py --regenerate
```

### 5. Run Backend

```bash
cd backend
# --host 0.0.0.0 required for physical devices on the same network
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Check: `curl http://localhost:8000/health` → `{"status":"ok"}`

### 6. Mobile

```bash
cd mobile
npm install

# Set your Mac's LAN IP so physical device can reach backend:
echo "EXPO_PUBLIC_API_URL=http://192.168.x.x:8000" >> .env
echo "EXPO_PUBLIC_OPENWEATHER_KEY=your_key_here" >> .env

npx expo start --clear
```

Scan the QR code with Expo Go.

---

## API Reference

All routes are prefixed `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| `POST` | `/auth/register` | No | `{email, password (min 6), display_name?}` | `{access_token, token_type}` |
| `POST` | `/auth/login` | No | form: `username`, `password` | `{access_token, token_type}` |
| `GET` | `/auth/me` | Yes | — | `{id, email, display_name, created_at}` |
| `PATCH` | `/auth/me` | Yes | `{display_name?}` | `{id, email, display_name, created_at}` |

Rate limits: register 5/min, login 10/min (per IP).

### Places

| Method | Path | Auth | Query params | Response |
|---|---|---|---|---|
| `GET` | `/places` | Optional | `city_id`, `mood`, `limit=20`, `neighborhood?`, `lat?`, `lng?`, `min_score=0.25` | `PlaceSchema[]` ranked by score (personalised if auth) |
| `GET` | `/places/{id}` | No | — | `PlaceSchema` |
| `GET` | `/neighborhoods` | No | `city_id` | `string[]` |
| `GET` | `/cities` | No | — | `CitySchema[]` |

### Saves

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| `POST` | `/save` | Yes | `{place_id}` | `{status: "saved"}` |
| `DELETE` | `/save` | Yes | `{place_id}` | `{status: "removed"}` |
| `GET` | `/saved` | Yes | — | `PlaceSchema[]` (newest first) |

### Vibe Feedback

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| `POST` | `/vibe-check` | Yes | `{place_id, mood, felt_right}` | `{status: "recorded"}` |

### PlaceSchema shape

```json
{
  "id": 42,
  "name": "Sightglass Coffee",
  "lat": 37.7749,
  "lng": -122.4079,
  "rating": 4.5,
  "price_range": 2,
  "address": "270 7th St, San Francisco, CA",
  "image_url": "https://places.googleapis.com/v1/.../media?...",
  "neighborhood": "SoMa",
  "score": 0.81,
  "opening_hours": [{"open": {"day": 1, "hour": 7}, "close": {"day": 1, "hour": 18}}, "..."],
  "vibe": {
    "vibe_vector": {"calm": 0.8, "aesthetic": 0.9, "lively": 0.3, "...": "..."},
    "hype_score": 0.72,
    "summary": "Sun-drenched industrial space with exceptional single-origin coffee.",
    "crowd": "creative professionals"
  }
}
```

---

## Mobile Features

### Contextual Auto-Mood
On the mood picker, a banner auto-suggests a mood based on current device location → weather (OpenWeatherMap) and time of day. Falls back to time-only if weather API is unavailable or location is denied (defaults to San Francisco).

```
☀️ Sunny morning  → CALM
🌇 Golden evening → SOCIAL
🌧 Rainy night    → ROMANTIC
☁️ Cloudy         → AESTHETIC
💻 Stormy day     → FOCUS
```

Tap the banner to instantly select that mood, or override by tapping any chip.

### Evocative Mood Taglines
Each mood shows a second-line descriptor that describes the *feeling*, not the occasion:

```
CALM      → places where time slows down
AESTHETIC → spaces worth standing still for
ENERGETIC → buzzing rooms, loud tables
SOCIAL    → made for staying too long
FOCUS     → quiet enough to think clearly
ROMANTIC  → dim lights & close tables
EXPLORE   → off the algorithm, on foot
CHILL     → good time, easy bill
```

### Vibe Match % + Match Reason
Each swipe card shows `87% VIBE MATCH` and a micro-line explaining why:
```
MATCHED FOR CALM · quiet · work-friendly
```
Computed client-side from the place's `vibe_vector` — top 2 dims that overlap with the mood's priority dimensions and score above 0.5.

### Swipe UX
- Swipe right → save + haptic
- Swipe left → skip
- Heart button → save + haptic
- SKIP / SAVE ❤️ labels animate in on drag
- SEE MORE button → Detail screen
- SEE ALL bar at bottom → full list for this mood + area

### Area Picker
Tap the city name to filter by neighborhood. Populated from the backend `/neighborhoods` endpoint. Selecting a neighborhood refines the ranked feed to that area only.

### Detail Screen
- Scroll-driven hero: image fades and parallaxes as the sheet rises
- OPEN NOW / CLOSED badge + today's hours (when available from Google)
- DIRECTIONS button → opens native Maps
- AI VIBE READ box with GPT-4o-mini summary
- Vibe bars: top 4 dimensions (CALM, AESTHETIC, WORK, ROMANTIC, etc.)
- RATE THE VIBE section (from Saved screen only): select mood + YES / NOT REALLY

### Saved Collection
- Numbered list (01, 02, ...) with thumbnail, vibe dims, rating, price, crowd tag
- Pull to refresh
- Tap any item → Detail screen with Rate the Vibe section

### Vibe Feedback & Personalisation
After saving a place, the Detail screen (when accessed from Saved) shows a **RATE THE VIBE** section. Select the mood you were in and whether it felt right. Responses are stored in `vibe_feedback` and immediately influence the ranking for that user (±0.08 score nudge per past vote, per mood).

### Authentication
- JWT stored in iOS Keychain / Android Keystore via `expo-secure-store`
- Axios 401 interceptor auto-logs out on token expiry (7-day tokens)
- Email validated with pydantic `EmailStr`; password minimum 6 characters enforced server-side
- Rate limits protect register and login endpoints

### Theme
Light and dark mode toggle in the header (StatusRow). Color tokens defined in `theme.js` for both modes; all components read from `ThemeContext`.

### Honest Ranking
`RANKED BY VIBE FIT · NOT STARS` shown below mood chips. A 3.8★ gem with a perfect vibe match outranks a 4.8★ tourist trap — and the UI says so.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | Yes | 32-char hex string for JWT signing |
| `ALLOWED_ORIGINS` | Backend | Comma-separated CORS origins (default `*`) |
| `OPENAI_API_KEY` | AI worker | For GPT-4o-mini vibe generation |
| `GOOGLE_PLACES_API_KEY` | Ingest | Google Places API (New) key |
| `EXPO_PUBLIC_API_URL` | Mobile | Backend base URL (default: `http://localhost:8000`) |
| `EXPO_PUBLIC_OPENWEATHER_KEY` | Mobile | OpenWeatherMap free tier key |

---

## Navigation Structure

```
RootStack
├── Auth (unauthenticated)
│   ├── Login
│   └── Register
└── Main (authenticated)
    ├── MainTabs
    │   ├── HomeTab
    │   │   ├── Mood (Onboarding) ← weather/time auto-mood banner, 8 moods, evocative taglines
    │   │   ├── Feed (Home)       ← swipe stack, area picker, ranking badge, vibe match % + reason
    │   │   └── SeeAll            ← full list for mood + area
    │   ├── Saved                 ← numbered collection, tap → Detail with Rate the Vibe
    │   └── Profile               ← display name edit
    └── Detail (modal, reachable from any tab)
        └── Rate the Vibe section shown when navigated from Saved
```

---

## Data Pipeline

```
Google Places API
      │
      │  ingest_google_places.py
      │  (idempotent by google_place_id)
      │  captures: photos, reviews, opening hours
      ▼
 PostgreSQL: places table
      │
      │  enrich_reviews.py (backfill for existing places)
      │  (Google Places Details API)
      ▼
 PostgreSQL: places.review_snippets
      │
      │  generate_vibes.py
      │  (GPT-4o-mini, prompt includes reviews, --regenerate to re-score)
      ▼
 PostgreSQL: place_vibes table
      │
      │  rank_places() at request time
      │  (time-adjust → cosine sim → score → vibe_feedback nudge)
      ▼
 Mobile: ranked swipe stack with vibe match % + reason line
      │
      │  User rates: "Did this feel right?"
      ▼
 PostgreSQL: vibe_feedback table
      │  (nudges future rankings ±0.08 per vote, per mood, per user)
      ▼
 Personalised feed on next request
```
