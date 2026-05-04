# VYBE — Terminal Runbook

End-to-end scripts for setting up, running, ingesting data, and testing the VYBE stack locally and in production.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database](#database)
4. [Backend (FastAPI)](#backend-fastapi)
5. [Data Ingestion](#data-ingestion)
6. [AI Worker — Vibe Generation](#ai-worker--vibe-generation)
7. [Vision Worker](#vision-worker)
8. [Background Workers](#background-workers)
9. [Mobile App](#mobile-app)
10. [Manual API Testing (curl)](#manual-api-testing-curl)
11. [Production (Render)](#production-render)
12. [Troubleshooting](#troubleshooting)

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Python | 3.11+ | `brew install python@3.11` |
| Node.js | 18+ | `brew install node` |
| npm | 9+ | comes with Node |
| PostgreSQL | 14+ | `brew install postgresql` or use Neon |
| Expo CLI | latest | `npm install -g expo-cli` |

---

## Environment Setup

### 1. Root `.env` (used by backend and ai-worker)

Copy the example and fill in real values:

```bash
cp .env.example .env
```

Required keys:

```env
DATABASE_URL=postgresql+asyncpg://vybe:vybe@localhost:5432/vybe
OPENAI_API_KEY=sk-...
GOOGLE_PLACES_API_KEY=AIza...
SECRET_KEY=<generate below>
ALLOWED_ORIGINS=*
```

Generate a `SECRET_KEY`:

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Backend Python venv

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Mobile `.env`

```bash
cd mobile
```

For local development (pointing to your laptop):

```bash
echo "EXPO_PUBLIC_API_URL=http://localhost:8000" > .env
```

For production backend:

```bash
echo "EXPO_PUBLIC_API_URL=https://vybe-uayv.onrender.com" > .env
```

### 4. Mobile npm dependencies

```bash
cd mobile
npm install
```

---

## Database

### Local PostgreSQL setup

```bash
# Create DB and user
psql postgres -c "CREATE USER vybe WITH PASSWORD 'vybe';"
psql postgres -c "CREATE DATABASE vybe OWNER vybe;"
```

### Run migrations (local)

```bash
cd backend
source .venv/bin/activate

# Export the sync URL for Alembic (must be postgresql+asyncpg for the app,
# but Alembic needs the asyncpg URL too — it handles it internally)
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"

python -m alembic upgrade head
```

### Run migrations (Neon / production)

```bash
cd backend
source .venv/bin/activate

export DATABASE_URL="postgresql+asyncpg://USER:PASS@HOST/vybe?ssl=require"

python -m alembic upgrade head
```

### Check migration status

```bash
python -m alembic current      # which revision is applied
python -m alembic history      # full migration chain
```

### Roll back one migration

```bash
python -m alembic downgrade -1
```

---

## Backend (FastAPI)

### Start the dev server

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Server is at `http://localhost:8000`.
Interactive docs at `http://localhost:8000/docs`.

### Health check

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

---

## Data Ingestion

Ingests real place data from Google Places API (New) into the database.
Safe to run multiple times — skips places already in DB by `google_place_id`.

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"
# or the Neon URL for production
```

### US Cities

```bash
python ingest_google_places.py --city "San Francisco" --lat 37.7749 --lng -122.4194 --country "USA"
python ingest_google_places.py --city "Los Angeles"   --lat 34.0522 --lng -118.2437 --country "USA"
python ingest_google_places.py --city "New York"      --lat 40.7128 --lng -74.0060  --country "USA"
python ingest_google_places.py --city "Chicago"       --lat 41.8781 --lng -87.6298  --country "USA"
python ingest_google_places.py --city "Seattle"       --lat 47.6062 --lng -122.3321 --country "USA"
python ingest_google_places.py --city "Austin"        --lat 30.2672 --lng -97.7431  --country "USA"
```

### Indian Cities

```bash
python ingest_google_places.py --city "Mumbai"      --lat 19.0760 --lng 72.8777  --country "India"
python ingest_google_places.py --city "Bangalore"   --lat 12.9716 --lng 77.5946  --country "India"
python ingest_google_places.py --city "Delhi"       --lat 28.6139 --lng 77.2090  --country "India"
python ingest_google_places.py --city "Pune"        --lat 18.5204 --lng 73.8567  --country "India"
python ingest_google_places.py --city "Ahmedabad"   --lat 23.0225 --lng 72.5714  --country "India"
python ingest_google_places.py --city "Surat"       --lat 21.1702 --lng 72.8311  --country "India"
python ingest_google_places.py --city "Vadodara"    --lat 22.3072 --lng 73.1812  --country "India"
python ingest_google_places.py --city "Gandhinagar" --lat 23.2156 --lng 72.6369  --country "India"
```

After every ingest run, proceed to the Vibe Generation step below.

---

## AI Worker — Vibe Generation

Reads all places without a vibe vector from the DB, calls GPT-4o-mini, and writes back 8-dimensional vibe vectors.

```bash
cd ai-worker
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"
export OPENAI_API_KEY="sk-..."

# Generate vibes for new places only (idempotent)
python generate_vibes.py

# Re-score all places (even those already scored)
python generate_vibes.py --regenerate
```

---

## Vision Worker

Analyses place photos with GPT-4o Vision to produce an additional visual vibe vector layer.
Run this after `generate_vibes.py` when new photos have been ingested.

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"
export OPENAI_API_KEY="sk-..."

python -m app.workers.vision_worker
```

---

## Background Workers

These workers run automatically at scheduled intervals in production via the admin API.
You can trigger them manually for local testing:

### Feedback Correction Worker

Adjusts vibe scores based on accumulated user vibe-check feedback.

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"

python -m app.workers.feedback_correction
```

### Freshness Worker

Flags stale places (not updated recently) for re-ingestion review.

```bash
cd backend
source .venv/bin/activate
export DATABASE_URL="postgresql+asyncpg://vybe:vybe@localhost:5432/vybe"

python -m app.workers.freshness_worker
```

### Trigger via Admin API (production)

Set `ADMIN_SECRET` in your environment first, then:

```bash
curl -X POST https://vybe-uayv.onrender.com/api/v1/workers/freshness \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"

curl -X POST https://vybe-uayv.onrender.com/api/v1/workers/feedback-correction \
  -H "X-Admin-Secret: YOUR_ADMIN_SECRET"
```

---

## Mobile App

```bash
cd mobile
npm install

# Start Expo dev server (scan QR with Expo Go app on your phone)
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android
```

To point the mobile app at your local backend instead of production, update `mobile/.env`:

```bash
echo "EXPO_PUBLIC_API_URL=http://<YOUR_LOCAL_IP>:8000" > mobile/.env
```

Use your machine's LAN IP (not `localhost`) so the physical device/simulator can reach it.
Find your LAN IP: `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux).

---

## Manual API Testing (curl)

Replace `BASE=http://localhost:8000` with `https://vybe-uayv.onrender.com` for production.

```bash
BASE=http://localhost:8000
```

### Health

```bash
curl $BASE/health
```

### List cities

```bash
curl $BASE/api/v1/cities
```

### Fetch places — mood only

```bash
curl "$BASE/api/v1/places?city_id=1&mood=calm&limit=10"
```

### Fetch places — mood + food + near me

```bash
curl "$BASE/api/v1/places?city_id=1&mood=aesthetic&food=coffee&lat=37.7749&lng=-122.4194&max_distance_km=5"
```

### Fetch places — vegetarian dietary filter

```bash
curl "$BASE/api/v1/places?city_id=1&mood=lively&dietary=vegetarian"
```

### Fetch neighborhoods for a city

```bash
curl "$BASE/api/v1/neighborhoods?city_id=1"
```

### Fetch a single place

```bash
curl "$BASE/api/v1/places/1"
```

### Register a new user

```bash
curl -X POST $BASE/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","display_name":"Test User"}'
```

### Login and capture token

```bash
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo $TOKEN
```

### Get current user profile

```bash
curl $BASE/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

### Save a place

```bash
curl -X POST $BASE/api/v1/save \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"place_id": 1}'
```

### Fetch saved places

```bash
curl $BASE/api/v1/saved \
  -H "Authorization: Bearer $TOKEN"
```

### Unsave a place

```bash
curl -X DELETE $BASE/api/v1/save \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"place_id": 1}'
```

### Submit vibe feedback (rate the vibe)

```bash
curl -X POST $BASE/api/v1/vibe-check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"place_id": 1, "mood": "calm", "felt_right": true}'
```

---

## Production (Render)

### Deploy

Render auto-deploys on every push to `main`. No manual step needed.

### Force a redeploy

```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

### View live logs

```bash
# Install Render CLI first: https://render.com/docs/cli
render logs --service vybe-backend --tail
```

Or open Render dashboard → your service → Logs.

### Check production health

```bash
curl https://vybe-uayv.onrender.com/health
```

### Required Render environment variables

Set these in Render → Environment:

| Key | Value |
|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://...neon.tech/vybe?ssl=require` |
| `OPENAI_API_KEY` | `sk-...` |
| `GOOGLE_PLACES_API_KEY` | `AIza...` |
| `SECRET_KEY` | 32-char hex string |
| `ALLOWED_ORIGINS` | `*` (or comma-separated origins) |
| `ADMIN_SECRET` | any secret string for admin worker endpoints |
| `SENTRY_DSN` | optional — Sentry error tracking |

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'rapidfuzz'`

```bash
cd backend
source .venv/bin/activate
pip install -r requirements.txt
```

### `asyncpg.exceptions.InvalidCatalogNameError` — wrong DATABASE_URL format

Alembic and the app both need the `postgresql+asyncpg://` prefix. Never use `postgresql://` bare.

```bash
export DATABASE_URL="postgresql+asyncpg://user:pass@host/db?ssl=require"
```

### Google Places API returns 400 INVALID_ARGUMENT

The FIELD_MASK in `ingest_google_places.py` must not include deprecated fields (`servesCoffee`, `goodForGroups`, `liveMusic`, etc.). The current file already has the correct stripped-down FIELD_MASK — if you see this error, verify the FIELD_MASK at the top of the script.

### Mobile app can't reach local backend

Use your machine's LAN IP, not `localhost`:

```bash
ipconfig getifaddr en0       # Mac — get LAN IP
echo "EXPO_PUBLIC_API_URL=http://192.168.x.x:8000" > mobile/.env
```

Then restart the Expo dev server (`npm start`).

### `alembic.util.exc.CommandError: Can't locate revision`

Run migrations from the `backend/` directory with the venv active:

```bash
cd backend
source .venv/bin/activate
python -m alembic upgrade head
```

### JWT token expired — 401 on all protected routes

Re-login to get a fresh token (tokens expire after 7 days):

```bash
TOKEN=$(curl -s -X POST $BASE/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
```

### No places returned for a city

Either the city has no vibe vectors yet (run `generate_vibes.py`) or the city doesn't exist in the DB yet (run the ingest command for that city first).

```bash
# Check how many places exist per city
psql $DATABASE_URL -c "SELECT c.name, COUNT(p.id) FROM cities c LEFT JOIN places p ON p.city_id = c.id GROUP BY c.name;"

# Check how many have vibe vectors
psql $DATABASE_URL -c "SELECT COUNT(*) FROM place_vibes;"
```
