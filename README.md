# VYBE

A mood-first place discovery app. Pick a feeling — the AI reads your vibe and surfaces cafes, restaurants, and bars ranked to match it. No search, no star-rating rabbit holes. Just vibe.

Built with FastAPI + PostgreSQL on the backend, Expo React Native on mobile.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                              │
│                                                                 │
│  Weather + time → auto-mood suggestion                          │
│  User picks mood  →  Expo React Native  →  HTTP (axios)         │
└───────────────────────────────┬─────────────────────────────────┘
                                │  GET /api/v1/places?mood=calm&city_id=1
                                │  &open_now=true  (optional)
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
│  │ bcrypt(12)   │  │  /cities      │  │          │  │ check │  │
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
│                  │  5. Filter open   │                          │
│                  │     now (optional)│                          │
│                  │     return top 20 │                          │
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

### Final score formula

```
time_vec    = time_adjust(place.vibe_vector, current_hour)
vibe_match  = cosine_similarity(mood_vector, time_vec)
rating_norm = place.rating / 5.0
dist_score  = 1 / (1 + haversine_km(user, place))

score = 0.55 × vibe_match
      + 0.20 × rating_norm
      + 0.15 × place.hype_score
      + 0.10 × dist_score
```

Places scoring below 0.25 are filtered out. The top 20 are returned. A 3.8★ hidden gem with a perfect vibe match outranks a 4.8★ tourist trap — by design.

---

## What Makes VYBE Different

| Feature | VYBE | Google Maps / Yelp |
|---|---|---|
| Discovery model | Mood → ranked places | Search → category → filter |
| Ranking signal | Vibe fit + time of day | Star rating + reviews count |
| Pay-to-play listings | No | Yes (sponsored results) |
| Time-aware results | ✓ (9am feed ≠ 9pm feed) | Popular times only, no mood link |
| Vibe match % on card | ✓ (e.g. 87% VIBE MATCH) | No |
| Auto-mood suggestion | ✓ (weather + time of day) | No |
| Open now filter | ✓ (combined with mood) | ✓ but no mood layer |
| Vibe verification | ✓ (crowdsourced ground truth) | Reviews only |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo React Native (SDK 51), React Navigation v6 |
| State | TanStack Query v5 (server state), React Context (auth, theme) |
| Backend | FastAPI 0.111, Python 3.11 |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| Database | PostgreSQL 16 |
| Migrations | Alembic |
| Auth | JWT (python-jose HS256) + bcrypt (passlib, cost=12) |
| Token storage | expo-secure-store (iOS Keychain / Android Keystore) |
| AI | OpenAI GPT-4o-mini (JSON mode) |
| Place data | Google Places API (New) — Text Search |
| Weather | OpenWeatherMap API (free tier) |
| Fonts | Bebas Neue, DM Sans, Playfair Display |

---

## Monorepo Structure

```
vybe/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py           # register, login, /me
│   │   │   ├── places.py         # GET /places, /places/{id}, /neighborhoods
│   │   │   ├── saves.py          # POST/DELETE /save, GET /saved
│   │   │   ├── cities.py         # GET /cities
│   │   │   ├── users.py          # POST /user/preferences
│   │   │   └── vibe_check.py     # POST /vibe-check (crowdsourced vibe feedback)
│   │   ├── core/
│   │   │   ├── config.py         # pydantic-settings (DATABASE_URL, keys)
│   │   │   └── security.py       # hash_password, create_access_token, decode_token
│   │   ├── db/
│   │   │   ├── base.py           # async engine, get_db dependency
│   │   │   └── models/           # City, Place, PlaceVibe, User, SavedPlace, VibeFeedback
│   │   ├── schemas/
│   │   │   └── place.py          # PlaceSchema, PlaceVibeSchema (Pydantic v2)
│   │   ├── services/
│   │   │   └── ranking.py        # rank_places(), time_adjust(), is_open_now(), cosine sim
│   │   └── main.py               # FastAPI app, CORS, router includes
│   ├── alembic/                  # migrations
│   ├── seed.py                   # base SF places (hand-curated)
│   ├── ingest_google_places.py   # Google Places batch ingestion
│   └── enrich_reviews.py         # backfill review_snippets from Google Details API
│
├── ai-worker/
│   └── generate_vibes.py         # GPT-4o-mini vibe generation (review-aware, --regenerate flag)
│
└── mobile/
    └── src/
        ├── screens/
        │   ├── Onboarding.js     # landing + mood picker + auto-mood banner
        │   ├── Home.js           # swipe feed + open now toggle + ranking badge
        │   ├── Detail.js         # place detail + vibe bars + rate-the-vibe section
        │   ├── Saved.js          # saved collection
        │   ├── Profile.js        # user profile + mood history + vibe DNA
        │   ├── SeeAll.js         # grid browse
        │   ├── Login.js
        │   └── Register.js
        ├── components/
        │   ├── SwipeStack.js     # Tinder-style card stack (PanResponder) + vibe match %
        │   ├── MoodHero.js       # animated floating orbs (built-in Animated)
        │   ├── MoodChip.js       # pressable pill with spring animation
        │   └── PlaceCard.js      # grid card
        ├── contexts/
        │   ├── AuthContext.js    # JWT token + user state (SecureStore)
        │   └── ThemeContext.js   # light/dark colors
        ├── services/
        │   └── api.js            # axios calls
        ├── constants/
        │   ├── moods.js          # 8 moods with id, label, color, emoji
        │   └── theme.js          # color tokens, font names, radius
        └── navigation/
            └── index.js          # RootStack (auth gate) + MainTabs
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
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

alembic upgrade head     # run all migrations
python seed.py           # insert base SF places
```

### 4. AI Worker (one-time)

```bash
# Ingest real places from Google (idempotent — safe to re-run)
# Captures: photos, top-5 English reviews, opening hours
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

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/auth/register` | `{email, password, display_name?}` | `{access_token, token_type}` |
| `POST` | `/auth/login` | form: `username`, `password` | `{access_token, token_type}` |
| `GET` | `/auth/me` | — | `{id, email, display_name, created_at}` |

### Places (public)

| Method | Path | Query params | Response |
|---|---|---|---|
| `GET` | `/places` | `city_id`, `mood`, `limit=20`, `neighborhood?`, `lat?`, `lng?`, `min_score=0.25`, `open_now=false` | `PlaceSchema[]` ranked by score |
| `GET` | `/places/{id}` | — | `PlaceSchema` |
| `GET` | `/neighborhoods` | `city_id` | `string[]` |
| `GET` | `/cities` | — | `CitySchema[]` |

### Saves (protected)

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/save` | `{place_id}` | `{status: "saved"}` |
| `DELETE` | `/save` | `{place_id}` | `{status: "removed"}` |
| `GET` | `/saved` | — | `PlaceSchema[]` |

### Vibe Feedback (protected)

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/vibe-check` | `{place_id, mood, felt_right}` | `{status: "recorded"}` |

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
  "vibe": {
    "vibe_vector": {"calm":0.8, "aesthetic":0.9, "lively":0.3, "...": "..."},
    "hype_score": 0.72,
    "summary": "Sun-drenched industrial space with exceptional single-origin coffee.",
    "crowd": "creative professionals"
  }
}
```

---

## Mobile Features

### Contextual Auto-Mood
On the mood picker, a banner auto-suggests a mood based on current weather (OpenWeatherMap API) and time of day. Falls back to time-only if weather API is unavailable. Tap the banner to instantly select that mood, or override by tapping any chip.

```
☀️ Sunny morning → CALM
🌇 Golden evening → SOCIAL
🌧 Rainy night → ROMANTIC
☁️ Cloudy → AESTHETIC
💻 Stormy day → FOCUS
```

### Vibe Match %
Each swipe card shows `87% VIBE MATCH` — the combined vibe fit score (cosine similarity + rating + hype + distance). Makes the algorithm tangible. No other discovery app shows this.

### Open Now Filter
Feed shows an `○ OPEN NOW` toggle (turns green when active). Re-fetches the ranked feed filtered to places whose stored opening hours include the current time. Places with no hours data are never hidden.

### Rate the Vibe
On any saved place → Detail screen, scroll to find the **RATE THE VIBE** section. Select which mood you were in when you visited, then YES / NOT REALLY. Responses are stored in `vibe_feedback` and will be used to improve vibe scores over time.

### Honest Ranking
`RANKED BY VIBE FIT · NOT STARS` appears below the mood chips. A 3.8★ gem with a perfect vibe match outranks a 4.8★ tourist trap — and the UI says so.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | Yes | 32-char hex string for JWT signing |
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
    │   │   ├── Mood (Onboarding) ← auto-mood banner
    │   │   ├── Feed (Home)       ← open now toggle, ranking badge, vibe match %
    │   │   └── SeeAll
    │   ├── Saved                 ← tap any saved place → rate the vibe
    │   └── Profile
    └── Detail (modal, reachable from any tab) ← rate the vibe section when from Saved
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
      │  (time-adjust → cosine sim → score → open_now filter)
      ▼
 Mobile: ranked swipe stack with vibe match %
      │
      │  User rates: "Did this feel right?"
      ▼
 PostgreSQL: vibe_feedback table (future: nudge vibe scores)
```
