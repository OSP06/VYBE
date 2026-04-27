# VYBE

A mood-first place discovery app. Pick a feeling — the AI reads your vibe and surfaces cafes, restaurants, and bars ranked to match it. No search, no listings rabbit holes. Just vibe.

Built with FastAPI + PostgreSQL on the backend, Expo React Native on mobile.

---

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         MOBILE APP                              │
│   User picks mood  →  Expo React Native  →  HTTP (axios)        │
└───────────────────────────────┬─────────────────────────────────┘
                                │  GET /api/v1/places?mood=calm&city_id=1
                                │  Authorization: Bearer <jwt>
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                          │
│                                                                 │
│  ┌──────────────┐    ┌───────────────┐    ┌─────────────────┐  │
│  │  Auth Router │    │ Places Router │    │  Saves Router   │  │
│  │  /auth/*     │    │  /places      │    │  /save /saved   │  │
│  │              │    │  /places/{id} │    │                 │  │
│  │ JWT decode   │    │  /neighborhoods│   │ get_current_user│  │
│  │ bcrypt verify│    │  /cities      │    │ dependency      │  │
│  └──────────────┘    └───────┬───────┘    └─────────────────┘  │
│                              │                                  │
│                    ┌─────────▼──────────┐                       │
│                    │  Ranking Service   │                       │
│                    │                   │                        │
│                    │  1. Load all places│                       │
│                    │     + vibes for   │                        │
│                    │     city from DB  │                        │
│                    │                   │                        │
│                    │  2. Cosine sim    │                        │
│                    │     mood_vector · │                        │
│                    │     vibe_vector   │                        │
│                    │                   │                        │
│                    │  3. Score =       │                        │
│                    │   0.55×vibe_match │                        │
│                    │ + 0.20×rating     │                        │
│                    │ + 0.15×hype_score │                        │
│                    │ + 0.10×distance   │                        │
│                    │                   │                        │
│                    │  4. Filter ≥ 0.25 │                        │
│                    │     return top 20 │                        │
│                    └─────────┬─────────┘                       │
│                              │                                  │
└──────────────────────────────┼──────────────────────────────────┘
                               │  SQLAlchemy async (asyncpg)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POSTGRESQL 16                             │
│                                                                 │
│  cities          places            place_vibes                  │
│  ─────────       ───────────────   ──────────────────────────   │
│  id              id                place_id (PK, FK)            │
│  name            city_id (FK)      vibe_vector (JSONB)          │
│  country         name              hype_score                   │
│                  lat / lng         summary                      │
│  users           rating            crowd                        │
│  ─────────       price_range                                    │
│  id              address           saved_places                 │
│  email           image_url         ────────────────             │
│  hashed_password neighborhood      user_id (PK, FK)             │
│  display_name    google_place_id   place_id (PK, FK)            │
│  preferred_vibes                   saved_at                     │
│  created_at                                                     │
└─────────────────────────────────────────────────────────────────┘
                               ▲
                               │  one-time batch ingestion
┌──────────────────────────────┴──────────────────────────────────┐
│                        AI WORKER                                │
│                                                                 │
│  ingest_google_places.py          generate_vibes.py             │
│  ────────────────────────         ──────────────────            │
│  Google Places API (New)    →     GPT-4o-mini                   │
│  Text Search by category          JSON mode                     │
│  Photo URL construction           Extracts per place:           │
│  Deduplication by                 • vibe_vector (8 dims)        │
│  google_place_id                  • hype_score                  │
│  Writes to places table           • summary                     │
│                                   • crowd                       │
│                                   Writes to place_vibes table   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ranking Algorithm

Each place has a `vibe_vector` — 8 floating-point dimensions scored 0–1 by GPT-4o-mini:

```
calm · aesthetic · lively · social · premium · budget · work_friendly · date_friendly
```

Each mood maps to a target vector with the same 8 dimensions (hand-tuned):

```python
MOOD_VECTORS = {
  "calm":         {"calm":0.85, "aesthetic":0.6,  "lively":0.1,  "social":0.15, ...},
  "romantic":     {"calm":0.6,  "aesthetic":0.8,  "lively":0.3,  "social":0.4,  ...},
  "focus":        {"calm":0.7,  "aesthetic":0.5,  "lively":0.1,  "social":0.1,  ...},
  # ... 8 moods total
}
```

**Final score formula:**

```
vibe_match  = cosine_similarity(mood_vector, place.vibe_vector)
rating_norm = (place.rating - 1) / 4          # normalise 1–5 → 0–1
dist_score  = 1 / (1 + haversine_km(user, place))

score = 0.55 × vibe_match
      + 0.20 × rating_norm
      + 0.15 × place.hype_score
      + 0.10 × dist_score
```

Places scoring below 0.25 are filtered out. The top 20 are returned.

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
| Auth | JWT (python-jose HS256) + bcrypt (passlib) |
| Token storage | expo-secure-store (iOS Keychain / Android Keystore) |
| AI | OpenAI GPT-4o-mini (JSON mode) |
| Place data | Google Places API (New) — Text Search |
| Fonts | Bebas Neue, DM Sans, Playfair Display |

---

## Monorepo Structure

```
vybe/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py          # register, login, /me
│   │   │   ├── places.py        # GET /places, /places/{id}, /neighborhoods
│   │   │   ├── saves.py         # POST/DELETE /save, GET /saved
│   │   │   ├── cities.py        # GET /cities
│   │   │   └── users.py         # POST /user/preferences
│   │   ├── core/
│   │   │   ├── config.py        # pydantic-settings (DATABASE_URL, keys)
│   │   │   └── security.py      # hash_password, create_access_token, decode_token
│   │   ├── db/
│   │   │   ├── base.py          # async engine, get_db dependency
│   │   │   └── models/          # City, Place, PlaceVibe, User, SavedPlace
│   │   ├── schemas/
│   │   │   └── place.py         # PlaceSchema, PlaceVibeSchema (Pydantic v2)
│   │   ├── services/
│   │   │   └── ranking.py       # rank_places(), cosine similarity, haversine
│   │   └── main.py              # FastAPI app, CORS, router includes
│   ├── alembic/                 # migrations
│   ├── seed.py                  # 24 SF places (hand-curated)
│   └── ingest_google_places.py  # Google Places batch ingestion
│
├── ai-worker/
│   └── generate_vibes.py        # GPT-4o-mini vibe generation (idempotent)
│
└── mobile/
    └── src/
        ├── screens/
        │   ├── Onboarding.js    # landing + mood picker
        │   ├── Home.js          # swipe feed
        │   ├── Detail.js        # place detail + vibe bars
        │   ├── Saved.js         # saved collection
        │   ├── Profile.js       # user profile
        │   ├── SeeAll.js        # grid browse
        │   ├── Login.js
        │   └── Register.js
        ├── components/
        │   ├── SwipeStack.js    # Tinder-style card stack (PanResponder)
        │   ├── MoodHero.js      # animated floating orbs (built-in Animated)
        │   ├── MoodChip.js      # pressable pill with spring animation
        │   └── PlaceCard.js     # grid card
        ├── contexts/
        │   ├── AuthContext.js   # JWT token + user state
        │   └── ThemeContext.js  # light/dark colors
        ├── services/
        │   └── api.js           # axios calls
        ├── constants/
        │   ├── moods.js         # 8 moods with id, label, color
        │   └── theme.js         # color tokens, font names, radius
        └── navigation/
            └── index.js         # RootStack (auth gate) + MainTabs
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
#   OPENAI_API_KEY
#   GOOGLE_PLACES_API_KEY
#   SECRET_KEY  (generate: python -c "import secrets; print(secrets.token_hex(32))")
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

alembic upgrade head          # run all migrations
python seed.py                # insert base SF places
```

### 4. AI Worker (one-time)

```bash
# Ingest real places from Google (idempotent — safe to re-run)
python backend/ingest_google_places.py

# Generate vibe vectors for all places without one
cd ai-worker
pip install -r requirements.txt
python generate_vibes.py
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

# For physical device — set your Mac's LAN IP:
echo "EXPO_PUBLIC_API_URL=http://192.168.x.x:8000" > .env

npx expo start
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
| `GET` | `/places` | `city_id`, `mood`, `limit=20`, `neighborhood?`, `lat?`, `lng?`, `min_score=0.25` | `PlaceSchema[]` ranked by score |
| `GET` | `/places/{id}` | — | `PlaceSchema` |
| `GET` | `/neighborhoods` | `city_id` | `string[]` |
| `GET` | `/cities` | — | `CitySchema[]` |

### Saves (protected)

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/save` | `{place_id}` | `{status: "saved"}` |
| `DELETE` | `/save` | `{place_id}` | `{status: "removed"}` |
| `GET` | `/saved` | — | `PlaceSchema[]` |

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

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | `postgresql+asyncpg://user:pass@host/db` |
| `SECRET_KEY` | Yes | 32-char hex string for JWT signing |
| `OPENAI_API_KEY` | AI worker only | For GPT-4o-mini vibe generation |
| `GOOGLE_PLACES_API_KEY` | Ingest only | Google Places API (New) key |
| `EXPO_PUBLIC_API_URL` | Mobile | Backend base URL (default: `http://localhost:8000`) |

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
    │   │   ├── Mood (Onboarding)
    │   │   ├── Feed (Home)
    │   │   └── SeeAll
    │   ├── Saved
    │   └── Profile
    └── Detail (modal, reachable from any tab)
```

---

## Data Pipeline

```
Google Places API
      │
      │  ingest_google_places.py
      │  (batch, idempotent by google_place_id)
      ▼
 PostgreSQL: places table
      │
      │  generate_vibes.py
      │  (GPT-4o-mini, skips existing rows)
      ▼
 PostgreSQL: place_vibes table
      │
      │  rank_places() at request time
      │  (cosine sim + rating + distance)
      ▼
 Mobile: ranked swipe stack
```
