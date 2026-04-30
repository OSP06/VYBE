# VYBE V2 Roadmap — Sharpen the Engine

## What V2 Is

V1: Mood → ranked feed → swipe. Core product working.
V2: Fix and strengthen the engine before food is layered on top.

**Why V2 before V3:** The food boost in V3 multiplies whatever vibe score a place has. If vibe_vector is noisy (food language in reviews, no structured signals), `CALM + RAMEN` surfaces the wrong places. V2 makes the foundation trustworthy first.

```
V1  →  V2 (clean engine)  →  V3 (food layer)  →  V4 (scale + social)
```

---

## Priority Order

| # | Feature | Effort | Why Now |
|---|---|---|---|
| 1 | Overhype penalty | 1–2 days | Ranking fix, zero infra |
| 2 | Structured attributes (incl. price level) | 2–3 days | Cleaner signal, no NLP |
| 3 | Atmosphere-only review extraction (incl. recency + quality weighting) | 3–5 days | Removes food noise, weights recent evidence |
| 4 | Day-of-week context score | 3–4 days | Time-aware gets smarter |
| 5 | Vibe feedback correction job | 1 week | System learns permanently |
| 6 | Vision-based vibe scoring (incl. photo selection) | 1–2 weeks | Strongest moat |
| 7 | Place freshness checks (incl. duplicate detection) | 1 week | Data hygiene before scaling |
| 8 | City expansion (manual) | ongoing | Required before V3 goes wide |
| 9 | Observability / error tracking | 2–3 days | Can't run production blind |

**Total: ~4–5 weeks**

---

## 1. Overhype Penalty
**File:** `backend/app/services/ranking.py` | **Effort:** 1–2 days

Places that trend heavily on review volume but target quiet moods (CALM, FOCUS, ROMANTIC) get a multiplicative penalty.

```python
if mood in ('calm', 'focus', 'romantic') and place.hype_score > 0.8:
    score *= 0.88
```

Zero new infra. Pure logic change.

---

## 2. Google Places Structured Attributes
**File:** `backend/app/workers/place_worker.py` | **Effort:** 2–3 days

Google returns boolean attributes (`quietPlace`, `liveMusic`, `goodForGroups`, `servesCoffee`, `servesBrunch`, `servesCocktails`). These are cleaner vibe signals than review text — no NLP, no drift.

Map to vibe_vector at enrichment time:
- `quietPlace: true` → `calm +0.2`, `work_friendly +0.15`
- `liveMusic: true` → `lively +0.25`, `social +0.15`
- `goodForGroups: true` → `social +0.2`
- `priceLevel 1–2` → `budget +0.25`
- `priceLevel 3–4` → `premium +0.2`

`priceLevel` is returned by Google on every place — currently unused. The `budget_chill` mood has a `budget` dim in the vibe_vector with no structured data source. This fills it.

New `place_attributes` JSONB column (one migration).

---

## 3. Atmosphere-Only Review Extraction
**File:** `backend/app/workers/vibe_worker.py` | **Effort:** 3–5 days

Reviews are dominated by food and service language. The vibe_vector should reflect atmosphere only. New GPT prompt:

```
Score the ATMOSPHERE of this cafe/restaurant.
Ignore: food quality, drinks, service, staff, prices.
Focus only on: lighting, noise level, crowd density, music, seating, decor, time-of-day feel.
Return vibe_vector JSON.
```

One-time batch re-extraction on all current places (~$3–5 at GPT-4o-mini rates).

### Review Recency Weighting

Feed reviews to GPT with recency weights — a 2019 review shouldn't hold the same weight as a 2024 one. Apply before extraction:

```python
def recency_weight(review_date):
    months_ago = (now - review_date).days / 30
    if months_ago <= 6:   return 1.0
    if months_ago <= 18:  return 0.7
    return 0.4

# Sort reviews by weight, pass top-weighted subset to GPT
weighted = sorted(reviews, key=lambda r: recency_weight(r.date), reverse=True)
gpt_input = weighted[:15]  # top 15 by recency
```

Prevents a place that was calm in 2020 but is now busy from keeping a high calm score.

### Review Quality Scoring

Long, detailed reviews about atmosphere carry more signal than short praise. Filter before feeding to GPT:

```python
def quality_score(review):
    word_count = len(review.text.split())
    mentions_atmosphere = any(w in review.text.lower() for w in
        ['quiet', 'noisy', 'lighting', 'vibe', 'atmosphere', 'crowd', 'music', 'cozy'])
    return word_count * (1.5 if mentions_atmosphere else 1.0)

# Drop reviews under 20 words; prefer atmosphere-mentioning reviews
quality_filtered = [r for r in weighted if len(r.text.split()) >= 20]
quality_filtered.sort(key=quality_score, reverse=True)
```

Zero additional API cost — filter happens before the GPT call.

---

## 4. Day-of-Week Context Score
**File:** `backend/app/services/ranking.py` | **Effort:** 3–4 days

`_time_adjust()` already handles time-of-day. Extend with day-of-week:

```python
dow = datetime.now().weekday()  # 0=Mon, 6=Sun
is_weekend = dow >= 3
if mood == 'social' and is_weekend:
    score *= 1.12
elif mood == 'focus' and not is_weekend:
    score *= 1.08
```

No new data or infra needed.

---

## 5. Vibe Feedback Correction Job
**Files:** `backend/app/workers/` (new), Alembic migration | **Effort:** 1 week

`vibe_feedback` currently personalises ranking per-user at query time. This nightly job converts aggregate signal into permanent vibe_vector corrections:

1. Group `vibe_feedback` by `(place_id, mood)` with ≥ 10 votes
2. If `felt_right_rate < 0.35` → reduce that mood's dims by 0.05
3. If `felt_right_rate > 0.70` → boost dims by 0.03

Clamped to [0, 1].

---

## 6. Vision-Based Vibe Scoring
**File:** `backend/app/workers/vision_worker.py` (new) | **Effort:** 1–2 weeks

Run GPT-4o on each place's hero image. Photos don't lie the way reviews do.

**Cost:** 192 places × ~$0.003/image = ~$0.58 one-time batch.

```python
final_vibe_vector = (review_vector * 0.6) + (vision_vector * 0.4)
```

Store as `vision_vibe_vector`, blend at ranking time. Most durable moat — Atmosphere has no equivalent.

### Photo Selection Before Vision Scoring

Google Places returns multiple photos per place. Most hero images are food closeups — useless for atmosphere scoring. Before running GPT-4o, select the best interior/atmosphere photo:

```python
def select_atmosphere_photo(photos):
    # Google photo references are ordered by relevance
    # Skip the first if it's a food closeup (heuristic: tight crop, no horizon)
    # Prefer wide interior shots — select photo index 1 or 2 if available
    for photo in photos[:4]:
        img = fetch_photo(photo.reference, max_width=800)
        # Simple heuristic: interior shots have more colour variety
        if is_interior_candidate(img):
            return img
    return photos[0]  # fallback to hero
```

Better input image → better `vision_vibe_vector`. Zero additional cost (same GPT call, better photo).

---

## 7. Place Freshness Checks
**File:** `backend/app/workers/freshness_worker.py` (new) | **Effort:** 1 week

Google Places data goes stale. Places close, change concept, or drop in quality. A nightly job checks `business_status` and rating drift:

```python
# For each place, re-fetch from Google Places API:
if place.business_status == 'CLOSED_PERMANENTLY':
    mark_inactive(place)
if abs(new_rating - place.rating) > 0.3:
    update_rating(place, new_rating)
    flag_for_revibe(place)  # queue for vibe regeneration if quality shift
```

Prevents users from swiping on dead places. Critical before city expansion.

### Duplicate Place Detection

The ingestion pipeline can create duplicates across runs (same place, slightly different name or coordinates). Add a deduplication check at ingest time:

```python
def is_duplicate(candidate, existing_places, threshold_m=50):
    for place in existing_places:
        if haversine_m(candidate, place) < threshold_m:
            if fuzz.ratio(candidate.name, place.name) > 80:
                return True  # same place, skip
    return False
```

Levenshtein + distance check. Cheap, prevents feed pollution.

---

## 9. Observability / Error Tracking
**Files:** `backend/app/core/logging.py` (new), `requirements.txt` | **Effort:** 2–3 days

Every other V2 change is invisible if errors fail silently in production. Add this before anything else ships.

- **Sentry** — `pip install sentry-sdk[fastapi]`. One `sentry_sdk.init()` call captures all unhandled exceptions, slow endpoints, and failed GPT calls with full stack traces.
- **Structured logging** — replace `print()` statements with `logging.getLogger()`. JSON-formatted logs so failures in `vibe_worker`, `vision_worker`, and `ranking.py` are searchable.
- **Health check endpoint** — `GET /health` returns DB connection status, Redis ping, and last successful worker run timestamp. Used by any future monitoring (UptimeRobot, etc.).

```python
# backend/app/main.py
import sentry_sdk
sentry_sdk.init(dsn=settings.SENTRY_DSN, traces_sample_rate=0.1)

@app.get("/health")
def health():
    return {
        "db": db_ok(),
        "last_vibe_worker": get_last_run("vibe_worker"),
        "last_freshness_check": get_last_run("freshness_worker"),
    }
```

**Cost:** Sentry free tier covers 5,000 errors/month. Zero cost until meaningful traffic.

---

## 8. City Expansion (Manual Process)
**Effort:** 1–2 days per city | **Runs:** Before V3 ships

The ingest pipeline is already city-aware (`city_id`). Adding a new city is:

1. Insert city row into `cities` table
2. Run `ingest_google_places.py --city "Austin, TX" --city-id 2`
3. Run `enrich_reviews.py --city-id 2`
4. Run `generate_vibes.py --city-id 2`
5. Run `vision_worker.py --city-id 2` (if V2.6 is done)

**Cities to target for V3 launch:** SF (existing) → NYC → LA → Austin → Chicago

Document this as a runbook. Automate in V4.

---

## Scoring Formula After V2

```
time_vec    = time_adjust(place.vibe_vector, current_hour, day_of_week)
vibe_match  = cosine_similarity(mood_vector, time_vec)
rating_norm = place.rating / 5.0
dist_score  = 1 / (1 + haversine_km(user, place))

base_score = 0.55 × vibe_match
           + 0.20 × rating_norm
           + 0.15 × place.hype_score
           + 0.10 × dist_score
           + feedback_nudge (±0.08, auth users)

# Multiplicative modifiers:
if overhyped and quiet mood:   base_score *= 0.88
if weekend and social mood:    base_score *= 1.12
if weekday and focus mood:     base_score *= 1.08
```

---

## What V2 Will Kill

- Food noise in vibe_vector (atmosphere-only extraction)
- Tourist traps ranking above hidden gems (overhype penalty)
- Stale/closed places in the feed (freshness checks + duplicate detection)
- Wrong-time recommendations (day-of-week context)
- Empty `budget` dim with no data source (price level signal)
- Old reviews outweighing recent ones (recency + quality weighting)
- Vision scoring on food photos instead of interiors (photo selection)
- Silent production failures with no visibility (Sentry + structured logging)

## What V2 Hands to V3

- Clean vibe_vectors (atmosphere only, vision-blended)
- Structured food attributes already ingested (used by V3 food layer)
- Multi-city data pipeline proven and documented
- Engine the food boost can trust
