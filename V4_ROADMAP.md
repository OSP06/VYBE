# VYBE V4 Roadmap — Scale, Revenue, and Social

## What V4 Is

V2 cleans the engine. V3 adds food as a second signal. V4 is what happens after the product has proven users return: monetise the engaged base, automate what was manual, and add the social surface that turns users into a distribution channel.

```
V1 (core)  →  V2 (clean engine)  →  V3 (food layer)  →  V4 (scale + revenue + social)
```

---

## What V4 Inherits from V2 / V3

| From | What it unlocks in V4 |
|---|---|
| V2 place freshness checks (nightly) | Automate into a scheduled pipeline — no manual monitoring |
| V2 vision_vibe_vector blending | Surfaced in Vibe DNA ("your places have soft lighting, warm tones") |
| V2 city expansion runbook (manual) | V4 replaces with fully automated pipeline |
| V3 food signal + FOOD_RELATIVES | Drives "you usually CALM + RAMEN" insight in Vibe DNA |
| V3 vibe_feedback at scale | Enough volume to train personalised ranking per user |
| V3 mood-aware explanation line | Becomes a shareable card ("VYBE picked this for you because…") |

---

## Priority Order

| # | Feature | Effort | Why Now |
|---|---|---|---|
| 1 | Freemium / Revenue model | 2–3 weeks | No point scaling without monetisation |
| 2 | Product analytics | 1 week | Can't measure if anything works without this |
| 3 | Vibe DNA profile | 2–3 weeks | Deepest retention hook, uses V2+V3 data |
| 4 | City expansion automation | 1–2 weeks | Manual runbook doesn't scale past 5 cities |
| 5 | Redis infrastructure | 1 week | In-memory cache breaks under multi-worker deployment |
| 6 | A/B testing / feature flags | 1 week | V3 ranking changes need measurement before rollout |
| 7 | GDPR / data deletion | 3–4 days | Legal requirement before EU expansion |
| 8 | Push notifications | 1–2 weeks | Re-engagement without depending on app opens |
| 9 | Group mode | 2 weeks | Turns solo product into social product |
| 10 | Reservation / action link | 3–4 days | Closes discovery → action loop |
| 11 | Collections (named saved lists) | 1 week | Usability wall for power users |
| 12 | Business portal (venue claims) | 3–4 weeks | B2B revenue layer + data flywheel |
| 13 | Map view | 1–2 weeks | Natural surface for EXPLORE mood |
| 14 | Search by place name | 1 week | Users who know what they want |
| 15 | iOS / Android widget | 1–2 weeks | Daily engagement without app opens |
| 16 | Web surface (pre-trip planning) | 3–4 weeks | Top-of-funnel, SEO, travel use case |
| 17 | Neighbourhood vibe profiles | 1 week | City-level discovery without knowing a specific place |

**Total: ~6–7 months**

---

## 1. Freemium / Revenue Model
**Files:** `backend/app/models/subscription.py` (new), `backend/app/api/billing.py` (new), `mobile/src/contexts/SubscriptionContext.js` (new) | **Effort:** 2–3 weeks

### Tier Design

| | Free | Pro ($4.99/mo · $39.99/yr) | Business ($29/mo per venue) |
|---|---|---|---|
| Swipes per day | 15 | Unlimited | — |
| Saved places | 10 | Unlimited | — |
| Vibe DNA profile | — | ✓ | — |
| Group mode | — | ✓ | — |
| Push notifications | — | ✓ | — |
| Early city access | — | ✓ (2-week early) | — |
| Venue claim + photo management | — | — | ✓ |
| Vibe analytics dashboard | — | — | ✓ |
| Highlight badge in feed | — | — | ✓ (opt-in, non-intrusive) |

### Why These Limits
- **15 swipes free** — enough to evaluate the product, not enough for power use. The friction point is hitting the save limit (11th save), not the browse limit.
- **Pro at $4.99** — coffee price anchoring. One saved spot pays for itself.
- **Business tier** — venue owners already pay Yelp/Google for visibility. VYBE's offer is mood-matched placement + real feedback signal.

### Implementation
- `subscriptions` table: `user_id`, `tier` (free/pro), `stripe_subscription_id`, `expires_at`
- `venue_claims` table: `place_id`, `owner_user_id`, `verified_at`, `stripe_subscription_id`
- Mobile: `SubscriptionContext` wraps RevenueCat SDK, exposes `isPro`, `venueIds`
- Limits enforced both client-side (UX) and server-side (on `/api/places/save`)
- Paywall triggers: hitting swipe 16, hitting save 11, tapping Vibe DNA, tapping Group mode
- Paywall UI: bottom sheet, not full-screen — "You've found your vibe. Keep going for $4.99/mo." Two buttons: Subscribe / Maybe Later

### No Dark Patterns
No ads. No selling data. The business model is the product getting better, not worse, the more you pay.

---

## 2. Vibe DNA Profile
**Files:** `mobile/src/screens/VibeDNA.js` (new), `backend/app/api/vibe_dna.py` (new) | **Effort:** 2–3 weeks

Users have been swiping, saving, and rating for months. V4 surfaces what the system learned about them.

### What It Shows
```
YOUR VIBE DNA

Mood signature:    CALM 62%  ·  FOCUS 23%  ·  ROMANTIC 15%
Food signature:    RAMEN 45%  ·  COFFEE 38%  ·  JAPANESE 17%
Time signature:    Weekday afternoons  ·  Friday evenings
Vibe fingerprint:  quiet · intimate · warm-lit · work-friendly

Your places tend to be:
  off the beaten path  (avg. 0.3km from transit)
  mid-range spend      (avg. rating 4.2 · not tourist-heavy)
  visually distinctive (high aesthetic score)

VYBE has learned you prefer hidden gems
over well-known spots.
```

### Implementation
- `GET /api/users/me/vibe-dna` aggregates from `vibe_feedback`, `saved_places`, `place_visits`
- Compute: top moods by weight, food_type frequency, avg vibe_vector of saved places, time-of-day histogram
- Vision vector average of saved places → described via GPT-4o-mini ("warm-lit, intimate, visually distinctive")
- Mobile: dedicated Profile sub-screen, shareable as an image card via share sheet
- Pro-only gate

---

## 3. City Expansion Automation
**Files:** `backend/app/workers/city_pipeline.py` (new), `backend/app/api/admin.py` | **Effort:** 1–2 weeks

V2 has a 5-step manual runbook. V4 collapses it into one triggered job.

```python
# POST /api/admin/cities  { name: "Austin, TX", lat, lng, radius_km }
# triggers:
city_pipeline.run(city_id)
  → ingest_google_places()
  → enrich_reviews()
  → generate_vibes()
  → vision_worker()
  → freshness_baseline()
  → notify_admin_on_complete()
```

- Celery task chain with per-step status stored in `city_pipeline_runs` table
- Internal admin dashboard shows pipeline progress per city
- Target: launch 1 new city per week vs 1 per 2 days manually

**Cities after SF:** NYC → LA → Austin → Chicago → Miami → Seattle

---

## 4. Redis Infrastructure
**Files:** `backend/app/core/cache.py` (new, replaces in-memory dicts) | **Effort:** 1 week

Current in-memory cache works with 1 Gunicorn worker. Multi-worker deployment breaks cache coherence — each worker has its own dict.

- Add `redis` to requirements, configure `REDIS_URL` env var
- `cache.py`: thin wrapper with `get(key)`, `set(key, val, ttl)`, `invalidate(key)`
- Replace all `_place_cache`, `_mood_cache`, `_ranking_cache` dicts with Redis calls
- Mood-aware explanation line (V3) stored in Redis with TTL 24h keyed `explain:{place_id}:{mood_id}:{food_id}`
- No change to API surface — purely internal

---

## 5. Push Notifications (Contextual)
**Files:** `backend/app/workers/notification_worker.py` (new), `mobile/src/services/notifications.js` (new) | **Effort:** 1–2 weeks

Not "open the app" blasts. Contextual triggers that feel useful:

| Trigger | Notification |
|---|---|
| Friday 4pm, user's mood pattern = SOCIAL | "It's Friday. Your kind of social spots are filling up." |
| Rain in city (weather API) | "Good day for CALM. 3 quiet cafes near you." |
| New place matches user's Vibe DNA | "A new CALM + RAMEN spot opened near you." |
| Saved place gets rating drop > 0.4 | "One of your saved spots may have changed. Still worth visiting?" |

- Expo Push Notifications on mobile, device tokens stored in `push_tokens` table
- `notification_worker.py` runs nightly + on weather webhook
- Weather source: OpenWeatherMap free tier (1,000 calls/day)
- Pro only — free users don't get proactive notifications

---

## 6. Group Mode
**Files:** `mobile/src/screens/GroupSession.js` (new), `backend/app/api/groups.py` (new) | **Effort:** 2 weeks

The hardest version of "where should we go" is when 3 people have 3 different moods.

### Flow
1. User creates a group session → gets a 6-char code
2. Friends join by entering the code (or deep link)
3. Each picks their mood (and food if V3 is live)
4. Server computes: `merged_mood_vector = weighted_avg(all mood vectors)` + union of food preferences with soft match
5. Returns a feed ranked for the group — same SwipeStack UI
6. Anyone can save to a shared group list

### Implementation
- `group_sessions` table: `id`, `code`, `created_by`, `expires_at` (2hr TTL)
- `group_members` table: `session_id`, `user_id`, `mood_id`, `food_ids[]`
- `GET /api/groups/{code}/places` — same ranking endpoint, merged vector as input
- Mobile: "Start a Group" button on Home screen (Pro only), shows live member count before launching feed
- Deep link: `vybe://group/{code}` — installs app if not present

---

## 7. Business Portal (Venue Claims)
**Files:** `backend/app/api/venues.py` (new), `mobile/src/screens/VenuePortal.js` or standalone web app | **Effort:** 3–4 weeks

Venue owners pay $29/mo. What they get:

- **Claim listing** — verify via Google Business OAuth or postcard verification
- **Photo management** — uploads feed directly into `vision_worker.py` (better photos → better vibe score → better ranking)
- **Vibe analytics** — "Your place scores 0.82 CALM. Users who match CALM save it 3.2× more than average."
- **Feedback signal** — anonymised `felt_right_rate` per mood (no individual user data)
- **Highlight badge** — small "Claimed" indicator on card (non-intrusive, opt-in)

### Why This Works
Venue owners already pay Yelp and Google for no useful feedback. VYBE tells them *which mood their space fits* and *what to change to rank higher*. That's a product insight, not a placement fee.

---

## 8. Web Surface (Pre-Trip Planning)
**Files:** new `web/` Next.js app | **Effort:** 3–4 weeks

Mobile-first is right for in-the-moment decisions. Web is right for:
- "I'm visiting NYC next weekend — where for a ROMANTIC dinner?"
- SEO capture: "best calm cafes San Francisco" → organic search traffic
- Shareable links: `vybe.app/places/san-francisco/calm` embeds as link preview

### Scope
- Server-rendered Next.js, shares the same FastAPI backend
- Mood selector → ranked list (no swipe — web doesn't need it)
- Detail page per place (SEO-optimised: place name, mood tags, neighbourhood)
- No auth required to browse — auth gates Save
- PWA-ready so mobile browser users get a near-app experience

---

## 9. Neighbourhood Vibe Profiles
**Files:** `backend/app/api/neighborhoods.py` (extend), `mobile/src/screens/NeighborhoodMap.js` (new) | **Effort:** 1 week

Users know "I'm going to the Mission" but not which café. Give them the neighbourhood vibe first.

```
MISSION DISTRICT · SAN FRANCISCO

Dominant mood:   SOCIAL (0.71)  ·  ENERGETIC (0.58)
Food scene:      Mexican · Tacos · Coffee
Best time:       Friday evening · Weekend brunch
Vibe in a word:  "buzzing"

Top places for your mood →
```

- Aggregate vibe_vectors of all places in a neighbourhood → neighbourhood vibe_vector
- Weighted by rating and hype_score
- Accessible from the city header dropdown → "Explore by area"

---

## 10. Product Analytics
**Files:** `mobile/src/services/analytics.js` (new) | **Effort:** 1 week

Without analytics, every roadmap decision is a guess. Before V3 ships, instrument the events that answer whether the product is working:

| Event | What it measures |
|---|---|
| `mood_selected` | Which moods drive sessions |
| `food_selected` | Food adoption rate after V3 |
| `card_swiped_right / left` | Swipe-to-save conversion per mood |
| `place_saved` | Save rate, which places and moods |
| `vibe_feedback_submitted` | felt_right signal quality |
| `paywall_shown / converted` | Freemium conversion by trigger |
| `session_length` | Depth of engagement per mood |

Use **PostHog** (open-source, self-hostable — zero vendor dependency, free under 1M events/month). Single `posthog.capture(event, properties)` call per action, wrapped in `analytics.js` so the provider can swap later.

Key questions analytics must answer:
- Which mood has the highest swipe-right rate? (doubles down on ranking quality)
- Do users who get a vibe_feedback prompt convert to Pro more? (justifies the feedback loop)
- Where in onboarding do food-first users drop off? (informs V3 UX)

---

## 11. A/B Testing / Feature Flags
**Files:** `backend/app/db/models/feature_flag.py` (new), `mobile/src/services/flags.js` (new) | **Effort:** 1 week

V2 and V3 both change the ranking formula. Shipping these as global changes with no rollback is risky. Feature flags let you:
- Roll out V3 food layer to 10% of users first
- A/B test overhype penalty coefficient (0.88 vs 0.82)
- Gate Vibe DNA to Pro users before the paywall is built

Simple implementation — no third-party needed:

```sql
CREATE TABLE feature_flags (
  key        TEXT PRIMARY KEY,
  enabled    BOOLEAN DEFAULT FALSE,
  rollout_pct INTEGER DEFAULT 0,  -- 0–100
  updated_at TIMESTAMP DEFAULT NOW()
);
```

```python
# In ranking.py
def flag_enabled(key, user_id):
    flag = get_flag(key)
    if not flag.enabled: return False
    return (user_id % 100) < flag.rollout_pct
```

Mobile fetches flags at app start via `GET /api/flags`, caches in memory. Zero latency on subsequent calls.

---

## 12. GDPR / Data Deletion
**Files:** `backend/app/api/users.py` | **Effort:** 3–4 days

Any EU city expansion (London, Amsterdam, Paris) requires compliance. Add before targeting EU cities:

```python
@router.delete("/api/users/me")
def delete_account(current_user, db):
    db.execute("DELETE FROM vibe_feedback WHERE user_id = :id", id=current_user.id)
    db.execute("DELETE FROM saved_places WHERE user_id = :id", id=current_user.id)
    db.execute("DELETE FROM push_tokens WHERE user_id = :id", id=current_user.id)
    db.execute("DELETE FROM users WHERE id = :id", id=current_user.id)
    return {"deleted": True}
```

- Cascading deletes on all user-linked tables
- Data export endpoint: `GET /api/users/me/export` returns JSON of all saved places, feedback, and session history
- Privacy policy update: document what's stored, retention periods, deletion right
- In-app: Settings → "Delete my account" — single confirmation, immediate deletion

---

## 13. Reservation / Action Link
**Files:** `mobile/src/screens/Detail.js`, `backend/app/db/models/place.py` | **Effort:** 3–4 days

VYBE currently closes the loop at "saved" — passive. Google Places returns:
- `reservable: true/false`
- `reservationsUri` — direct link to OpenTable, Resy, or the venue's booking page

Show it on the Detail screen when available:

```jsx
{place.reservations_uri && (
  <Pressable onPress={() => Linking.openURL(place.reservations_uri)}>
    <Text style={styles.reserveBtn}>RESERVE A TABLE →</Text>
  </Pressable>
)}
```

Store `reservable` + `reservations_uri` in the places table (add at V3 ingestion time — same API call, just save the field). The CTA only shows when a booking link exists — no noise for places that don't take reservations.

Future: affiliate revenue via OpenTable referral program (pay-per-reservation).

---

## 14. Collections (Named Saved Lists)
**Files:** `backend/app/api/collections.py` (new), `mobile/src/screens/Collections.js` (new) | **Effort:** 1 week

Flat "Saved" doesn't scale. Users with 30+ saved places can't find the place they saved for date night last month. Named collections solve this:

```
MY LISTS

📁  Date spots           (8 places)
📁  WFH cafes            (12 places)
📁  Brunch with friends  (5 places)
📁  All Saved            (34 places)
```

- `collections` table: `id`, `user_id`, `name`, `created_at`
- `collection_places` table: `collection_id`, `place_id`
- Long-press on a saved place card → "Add to list" bottom sheet
- Default "All Saved" collection always exists (mirrors current Saved tab)
- Pro users can create unlimited lists; Free users get 2

---

## 15. Map View
**Files:** `mobile/src/screens/MapView.js` (new) | **Effort:** 1–2 weeks

The swipe stack is perfect for in-the-moment decisions. Map view is perfect for EXPLORE mood users who want to see where things are relative to each other — or for anyone who knows roughly which area they're going to.

```
[MAP ↔ LIST] toggle in Home header → switches between SwipeStack and MapView

Map: dots coloured by vibe_match score (green = strong match, amber = ok)
Tap dot → mini card (name, score, top 2 dims)
Tap mini card → Detail screen
```

Use `react-native-maps` (Expo-compatible). Overlay existing ranked feed on map — no new API call needed. Filter/mood state carries over from SwipeStack.

Only show map when ≥ 5 places in feed (no empty map experience).

---

## 16. Search by Place Name
**Files:** `backend/app/api/search.py` (new), `mobile/src/screens/Search.js` (new) | **Effort:** 1 week

Mood-first discovery is the core product. But users who know they want "Blue Bottle Coffee" or "Tartine" have no path today. Search handles this without compromising the mood-first positioning:

- Search returns the matching place's Detail screen directly — not a new ranked feed
- Below the search result: "People who save this also love →" (mood-matched suggestions)
- PostgreSQL `pg_trgm` extension for fuzzy name matching:

```sql
CREATE INDEX ix_places_name_trgm ON places USING GIN(name gin_trgm_ops);
SELECT * FROM places WHERE name % 'Blue Bottle' ORDER BY similarity(name, 'Blue Bottle') DESC LIMIT 5;
```

Search is a back door into the product, not the front door.

---

## 17. iOS / Android Widget
**Files:** `mobile/ios/VybeWidget/` (new), `mobile/android/app/src/.../widget/` (new) | **Effort:** 1–2 weeks

A home screen widget shows the user's current top pick for their most-used mood — updated daily at their typical session time. Tap → opens the full place Detail. No app open required.

```
┌─────────────────────┐
│ VYBE · CALM         │
│                     │
│ Sightglass Coffee   │
│ 94% match · 0.4km  │
│                     │
│ TAP TO SEE MORE →   │
└─────────────────────┘
```

- iOS: WidgetKit (Swift) reads from shared App Group storage that the React Native app populates
- Android: Glance API (Kotlin)
- Data: `GET /api/users/me/daily-pick` returns top pick for dominant mood at current hour — cached daily
- Pro only — the widget surface reinforces daily habit for paying users

---

## Revenue Projection (Conservative)

| Metric | Year 1 | Year 2 |
|---|---|---|
| Cities | 5 | 15 |
| MAU | 5,000 | 25,000 |
| Pro conversion (8%) | 400 | 2,000 |
| Pro MRR | $2,000 | $10,000 |
| Business subscriptions | 20 | 150 |
| Business MRR | $580 | $4,350 |
| **Total MRR** | **~$2,600** | **~$14,350** |

Not venture-scale. Ramen-profitable by end of Year 1. That's the right target before raising.

---

## What V4 Resolves from V2 / V3

| V2/V3 Gap | V4 Fix |
|---|---|
| City expansion is a manual runbook | Automated city pipeline with admin dashboard |
| In-memory cache breaks at scale | Redis with keyed TTL cache |
| Mood-aware explanation has no infra | Redis + cached GPT calls |
| vibe_feedback has no monetisation hook | Vibe DNA (Pro gate) surfaces what was learned |
| No re-engagement mechanism | Contextual push notifications (Pro only) |
| Solo product, no distribution | Group mode + shareable Vibe DNA card |
| No venue relationship | Business portal — owners improve their listing, VYBE gets better data |
| No measurement of what works | Product analytics (PostHog) + A/B testing infra |
| Ranking changes ship with no rollback | Feature flags with % rollout |
| EU expansion blocked | GDPR data deletion + export |
| Discovery ends at "saved" | Reservation links close the action loop |
| Flat saved list doesn't scale | Collections (named lists) |
| No geographic browse | Map view, especially for EXPLORE mood |
| Users who know what they want are unserved | Search by place name |
| Requires app open to stay engaged | iOS/Android daily widget |

---

## Scoring Formula After V4

Same as V2, extended:

```
base_score  =  0.55 × vibe_match
            +  0.20 × rating_norm
            +  0.15 × place.hype_score
            +  0.10 × dist_score
            +  feedback_nudge (±0.08, auth users)
            +  vibe_dna_affinity (±0.05, Pro users — personalised boost)

# Multiplicative modifiers (from V2):
if overhyped and quiet mood:   base_score *= 0.88
if weekend and social mood:    base_score *= 1.12
if weekday and focus mood:     base_score *= 1.08

# Group mode: base_score computed against merged_mood_vector
```

---

## What V4 Hands to V5

- Proven monetisation model with real conversion data
- Multi-city pipeline running autonomously
- Analytics baseline — retention curves, conversion by mood, swipe-to-save by city
- Social graph seed (group sessions → friend connections)
- Venue relationships (business tier → co-marketing, event listings)
- Web traffic + SEO base for content strategy
- Widget install base — daily active surface outside the app
- Collections as foundation for curated city guides and editorial content
