# VYBE V3 Roadmap — Mood + Food, One Screen

## What V3 Is

V1: Mood → ranked feed → swipe.
V2: Cleaner engine (vision scoring, atmosphere-only extraction, structured attributes).
V3: Moody + Foodie users. One screen captures both signals. Zero mode selection.

**Prerequisite:** V2 must ship first. The food boost multiplies whatever vibe score a place has — if that score is noisy, `CALM + RAMEN` surfaces the wrong places. V2 cleans the engine. V3 adds food on top of something trustworthy.

---

## The Core Problem V3 Solves

Sequential onboarding (mood THEN food, or food THEN mood) forces an artificial hierarchy. Most users don't think in pure modes:

- Not "I want ramen, vibe doesn't matter"
- Not "I feel calm, food doesn't matter"
- Reality: "I want somewhere low-key and I'm feeling like ramen or sushi tonight"

Making users decide *what they lead with* is a meta-question they've never asked themselves.

**Solution:** Don't make them choose a mode. Let them express both in one motion, on one screen.

---

## User Types, One Screen

| User type | What they do | Result |
|---|---|---|
| Pure mood | Pick a mood chip, skip food | Mood-ranked feed (V1 behaviour, unchanged) |
| Pure foodie | Pick a food chip, skip mood | Food places ranked by general vibe quality |
| Moody + foodie | Pick one mood + one food | Feed ranked by mood fit, boosted for food match |
| Undecided | Tap weather banner | Accepts mood + food suggestion in one tap |

All four land on the same swipe stack. Same engine. Same output format.

---

## Priority Order

| # | Feature | Effort |
|---|---|---|
| 1 | `foods.js` constants + FoodChipRow component | 1 day |
| 2 | Onboarding food row + selectedFood state | 1 day |
| 3 | Extended weather banner (mood + food) | 1 day |
| 4 | Home screen food chip row | 1 day |
| 5 | Food preference persistence | 1 day |
| 6 | Backend `place_food` table + migration | 1 day |
| 7 | Google Places food attribute ingestion | 2 days |
| 8 | Ranking: soft food match + neutral mood vector | 1 day |
| 9 | API food param + SeeAll wiring | 1 day |
| 10 | Empty state fallback (no results) | 1 day |
| 11 | Detail screen food tags + photo carousel | 1 day |
| 12 | Mood-aware explanation line (mood + food aware) | 2 weeks |
| 13 | Dietary restrictions filter (vegan, halal, gluten-free) | 1 day |
| 14 | Get Directions CTA on Detail screen | 2 hours |
| 15 | Swipe undo (recover last dismissed card) | 1 day |

**Total: ~3.5 weeks**

---

## Onboarding Screen — Definitive Design

### Layout

```
┌─────────────────────────────────────────────────────┐
│  SELECT YOUR VIBE                                   │
│                                                     │
│  HOW YOU                                            │
│  FEELIN'                                            │
│  today?                                             │
│                                                     │
│  Pick a vibe — we'll handle the rest.               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │ ☁️ Cloudy vibes in SF · WE'RE FEELING        │    │
│  │ AESTHETIC + COFFEE →                        │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ╔═══════╗ ╔═══════════╗ ╔═══════╗ ╔═══════════╗   │
│  ║ 😌    ║ ║ ✨        ║ ║ 🔥    ║ ║ 👥        ║   │
│  ║ CALM  ║ ║ AESTHETIC ║ ║ENERGE-║ ║ SOCIAL    ║   │
│  ╚═══════╝ ╚═══════════╝ ╚═══════╝ ╚═══════════╝   │
│  ╔═══════╗ ╔═══════════╗ ╔═══════╗ ╔═══════════╗   │
│  ║ 💻    ║ ║ ❤️        ║ ║ 🌍    ║ ║ 💸        ║   │
│  ║ FOCUS ║ ║ ROMANTIC  ║ ║EXPLORE║ ║ CHILL     ║   │
│  ╚═══════╝ ╚═══════════╝ ╚═══════╝ ╚═══════════╝   │
│                                                     │
│  ────── ALSO CRAVING SOMETHING? ────────────────    │
│                                                     │
│  [☕ COFFEE] [🍜 RAMEN] [🍳 BRUNCH] [🍱 SUSHI] ›   │
│                                                     │
│ ┌───────────────────────────────────────────────┐   │
│ │ SELECTED  ROMANTIC · RAMEN        ● ● ● ● ●  │   │
│ └───────────────────────────────────────────────┘   │
│ ┌───────────────────────────────────────────────┐   │
│ │  FINDING ROMANTIC + RAMEN SPOTS  →            │   │
│ └───────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Key UX Rules

- Mood grid: same 2×4 layout as V1. No changes to mood tiles.
- Food row: horizontally scrollable chip row below mood grid. One tap selects, same tap deselects. Max one selection.
- Selection bar: shows both signals — `ROMANTIC · RAMEN`, `CALM`, or `RAMEN`.
- FIND MY VYBE button: label reflects active state.
- Weather banner: suggests mood + food together.
- No "which mode are you?" question. No mode toggle. One screen.

### Button Copy by State

```
Nothing selected    →  (button hidden / dimmed)
Mood only           →  FINDING CALM SPOTS →
Food only           →  FINDING RAMEN SPOTS →
Mood + food         →  FINDING CALM + RAMEN SPOTS →
```

---

## Auto-Suggestion Banner — Extended

| Weather | Time | Mood | Food |
|---|---|---|---|
| Rain / Drizzle | Evening | ROMANTIC | COMFORT FOOD |
| Rain / Drizzle | Day | FOCUS | COFFEE |
| Thunderstorm | Any | FOCUS | COFFEE |
| Snow | Any | CALM | COMFORT FOOD |
| Clouds / Mist | Any | AESTHETIC | COFFEE |
| Clear | Morning 5–10 | CALM | BRUNCH |
| Clear | Midday 10–16 | EXPLORE | LUNCH |
| Clear | Evening 16–22 | SOCIAL | COCKTAILS |
| Clear | Late night 22+ | ROMANTIC | LATE NIGHT |

Tap banner → selects both mood AND food simultaneously. User can deselect either independently before tapping FIND MY VYBE.

---

## Home Screen — Returning Users

```
[CALM ✓] [AESTHETIC] [FOCUS] [SOCIAL] ...    ← mood row (existing)
[☕ COFFEE] [🍜 RAMEN ✓] [🍳 BRUNCH] ...    ← food row (new)

RANKED BY VIBE FIT · NOT STARS
```

Both rows are independent. Changing either reruns the ranked feed instantly — no button press needed.

---

## Food Preference Persistence

Last-used food selection remembered via `AsyncStorage`. On next session open, food chip is pre-selected and shown highlighted. User can clear it with a single tap.

```js
// On food select:
await AsyncStorage.setItem('lastFood', JSON.stringify(selectedFood));

// On mount:
const lastFood = await AsyncStorage.getItem('lastFood');
if (lastFood) setSelectedFood(JSON.parse(lastFood));
```

Cuts re-selection friction for returning foodie users. Doesn't force the selection — it's a suggestion they can dismiss.

---

## Empty State Fallback

When mood + food combo returns zero results, don't show an empty screen. Drop food first, keep mood:

```
No ROMANTIC + RAMEN spots in this area.

Showing ROMANTIC spots instead →    [KEEP MOOD]
Or try a different food type →      [CHANGE FOOD]
```

Logic:
```python
if len(results) == 0 and food:
    # retry without food
    fallback = rank_places(places, mood=mood, food=None, ...)
    return fallback, warn="No {food} spots matched. Showing {mood} spots instead."
```

Never show a dead end. Always give the user somewhere to go.

---

## Food Categories — Full List

### Cuisines
```js
export const FOOD_CUISINES = [
  { id: 'coffee',        label: 'COFFEE',      emoji: '☕' },
  { id: 'brunch',        label: 'BRUNCH',      emoji: '🍳' },
  { id: 'ramen',         label: 'RAMEN',       emoji: '🍜' },
  { id: 'sushi',         label: 'SUSHI',       emoji: '🍱' },
  { id: 'korean',        label: 'KOREAN',      emoji: '🥩' },
  { id: 'italian',       label: 'ITALIAN',     emoji: '🍝' },
  { id: 'mexican',       label: 'MEXICAN',     emoji: '🌮' },
  { id: 'indian',        label: 'INDIAN',      emoji: '🍛' },
  { id: 'thai',          label: 'THAI',        emoji: '🌶' },
  { id: 'american',      label: 'AMERICAN',    emoji: '🍔' },
  { id: 'pizza',         label: 'PIZZA',       emoji: '🍕' },
  { id: 'sandwiches',    label: 'SANDWICHES',  emoji: '🥪' },
  { id: 'dessert',       label: 'DESSERT',     emoji: '🍰' },
  { id: 'mediterranean', label: 'MEDI',        emoji: '🫒' },
];
```

### Drinks
```js
export const FOOD_DRINKS = [
  { id: 'cocktails',    label: 'COCKTAILS',  emoji: '🍸' },
  { id: 'wine',         label: 'WINE BAR',   emoji: '🍷' },
  { id: 'craft_beer',   label: 'CRAFT BEER', emoji: '🍺' },
  { id: 'natural_wine', label: 'NAT. WINE',  emoji: '🫧' },
  { id: 'sake',         label: 'SAKE',       emoji: '🍶' },
];
```

### Meal Types
```js
export const FOOD_MEAL_TYPES = [
  { id: 'breakfast',  label: 'BREAKFAST',  emoji: '🌅' },
  { id: 'lunch',      label: 'LUNCH',      emoji: '🌤' },
  { id: 'dinner',     label: 'DINNER',     emoji: '🌙' },
  { id: 'late_night', label: 'LATE NIGHT', emoji: '🌃' },
  { id: 'snacks',     label: 'SNACKS',     emoji: '🥨' },
];
```

---

## FoodChipRow Component

```jsx
// mobile/src/components/FoodChipRow.js
import React from 'react';
import { ScrollView, Text, Pressable, StyleSheet } from 'react-native';
import { fonts, radius } from '../constants/theme';

export default function FoodChipRow({ categories, selected, onSelect, colors }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {categories.map((item) => {
        const isOn = selected?.id === item.id;
        return (
          <Pressable
            key={item.id}
            style={[styles.chip, isOn && { backgroundColor: colors.sage, borderColor: colors.sage }]}
            onPress={() => onSelect(isOn ? null : item)}
          >
            <Text style={styles.chipEmoji}>{item.emoji}</Text>
            <Text style={[styles.chipTxt, isOn && { color: '#fff' }]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingVertical: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radius.card, borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  chipEmoji: { fontSize: 13 },
  chipTxt: { fontFamily: fonts.display, fontSize: 10, letterSpacing: 1, color: '#1A1814' },
});
```

---

## Onboarding State

```jsx
const [selectedMood, setSelectedMood] = useState(null);
const [selectedFood, setSelectedFood] = useState(null);

// Load persisted food on mount
useEffect(() => {
  AsyncStorage.getItem('lastFood').then((v) => {
    if (v) setSelectedFood(JSON.parse(v));
  });
}, []);

// Persist on select
const handleFoodSelect = (food) => {
  setSelectedFood(food);
  if (food) AsyncStorage.setItem('lastFood', JSON.stringify(food));
  else AsyncStorage.removeItem('lastFood');
};

// Banner tap selects both
const handleBannerTap = () => {
  if (suggestion.mood) setSelectedMood(suggestion.mood);
  if (suggestion.food) handleFoodSelect(suggestion.food);
};

const btnLabel = () => {
  if (selectedMood && selectedFood) return `FINDING ${selectedMood.label} + ${selectedFood.label} SPOTS`;
  if (selectedMood) return `FINDING ${selectedMood.label} SPOTS`;
  if (selectedFood) return `FINDING ${selectedFood.label} SPOTS`;
  return 'FIND MY VYBE';
};

const handleGo = () => {
  navigation.navigate('Feed', { mood: selectedMood, food: selectedFood });
};
```

---

## Scoring — Soft Food Match

Binary match (`1.0 or 0.0`) replaced with graduated scoring:

```python
FOOD_RELATIVES = {
    'ramen':    ['japanese', 'noodles'],
    'sushi':    ['japanese', 'seafood'],
    'korean':   ['asian', 'bbq'],
    'italian':  ['pizza', 'pasta'],
    'cocktails': ['wine', 'craft_beer'],
    # ...
}

def compute_food_match(place, food_id):
    if not place.food_tags or not food_id:
        return 0.0
    if food_id in place.food_tags:
        return 1.0                          # exact match
    relatives = FOOD_RELATIVES.get(food_id, [])
    if any(r in place.food_tags for r in relatives):
        return 0.5                          # related match
    return 0.0

# Applied as before:
score = base_score * (1.0 + 0.4 * food_match)
# max boost: ×1.4 (exact), ×1.2 (related), ×1.0 (no match)
```

Prevents hard zero cliffs. A Japanese restaurant appears for `RAMEN` search at 0.5× boost rather than being completely excluded.

---

## Neutral Mood Vector (Food-Only Users)

```python
NEUTRAL_MOOD_VECTOR = {
    # Weighted average of all 8 mood vectors
    # Favours aesthetic + calm as baseline "good place" signal
    "calm": 0.55, "aesthetic": 0.62, "lively": 0.42, "social": 0.50,
    "premium": 0.38, "budget": 0.42, "work_friendly": 0.38, "date_friendly": 0.46,
}

mood_vector = MOOD_VECTORS[mood] if mood else NEUTRAL_MOOD_VECTOR
```

---

## Backend Changes

### New table: `place_food`
```sql
CREATE TABLE place_food (
  place_id       INTEGER PRIMARY KEY REFERENCES places(id) ON DELETE CASCADE,
  cuisine_tags   TEXT[],
  drink_tags     TEXT[],
  meal_types     TEXT[],
  serves_coffee  BOOLEAN DEFAULT FALSE,
  serves_brunch  BOOLEAN DEFAULT FALSE,
  serves_alcohol BOOLEAN DEFAULT FALSE,
  updated_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX ix_pf_cuisine ON place_food USING GIN(cuisine_tags);
```

### Updated `/places` endpoint
```
GET /api/v1/places?mood=romantic&food=ramen&city_id=1
```

`food` is optional. When absent, scoring is identical to V1/V2.

### Google Places ingestion additions
- `primaryType` → cuisine_tags
- `servesCoffee`, `servesBeer`, `servesWine`, `servesCocktails`, `servesBrunch`
- `servesLunch`, `servesDinner`, `servesVegetarianFood`

---

## Detail Screen — Food Tags + Photo Carousel + Get Directions

```
[CALM] [AESTHETIC] [WORK] [ROMANTIC]       ← vibe dims (existing)
[🍜 RAMEN] [🌙 DINNER] [🌃 LATE NIGHT]   ← food tags (new, factual)
```

Factual labels only — no food ratings, no food bars.

### Photo Carousel
Google Places returns up to 10 photos per place. Currently only the hero image is shown. A horizontally scrollable carousel below the hero lets users see the interior, seating, and atmosphere before going — the most common question users have after "does this feel right?"

```jsx
// mobile/src/screens/Detail.js
<ScrollView horizontal showsHorizontalScrollIndicator={false}>
  {place.photos.slice(0, 5).map((photo, i) => (
    <Image key={i} source={{ uri: photo.url }} style={styles.carouselImg} />
  ))}
</ScrollView>
```

Store `photos[]` array from Google in the places table (`photos JSONB`). Already fetched during ingestion — just not stored or returned.

### Get Directions CTA
The most obvious missing action — after deciding a place is right, the user needs to get there. One line on the Detail screen:

```jsx
import { Linking } from 'react-native';

const openDirections = (place) => {
  const url = Platform.OS === 'ios'
    ? `maps://?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`
    : `geo:${place.lat},${place.lng}?q=${encodeURIComponent(place.name)}`;
  Linking.openURL(url);
};

// In Detail render:
<Pressable style={styles.directionsBtn} onPress={() => openDirections(place)}>
  <Text style={styles.directionsTxt}>GET DIRECTIONS →</Text>
</Pressable>
```

Opens Apple Maps on iOS, Google Maps on Android. Zero dependencies. Closes the discovery → action loop.

---

## SeeAll Screen — Food Tags on Cards

Each card in the SeeAll grid shows food tags below the vibe dims so food context persists outside the swipe stack. Food param passed through from Home → SeeAll → fetchPlaces.

---

## Mood-Aware Explanation Line

**Moved from V2.** Done here because in V3 it needs to explain mood + food together.

One sentence generated at query time explaining why this place ranked. Cached per `(place_id, mood_id, food_id)` in a simple dict cache (no Redis needed — TTL 1 hour, per-process).

```python
# In places.py, after ranking:
explanation = generate_explanation(place, mood, food)
# → "Ranked for CALM + RAMEN — intimate noodle bar, 
#    consistently quiet evenings, strong on atmosphere."
```

Shown on the Detail screen, replacing the generic vibe summary for mood-specific queries.

Cache key: `f"{place_id}:{mood}:{food}"`. Regenerated if either signal changes.

---

## Files to Create / Change

| File | Change |
|---|---|
| `mobile/src/constants/foods.js` | New — FOOD_CUISINES, FOOD_DRINKS, FOOD_MEAL_TYPES |
| `mobile/src/components/FoodChipRow.js` | New — chip row component |
| `mobile/src/screens/Onboarding.js` | Food row + selectedFood + persistence + extended banner |
| `mobile/src/screens/Home.js` | FoodChipRow below mood chips, food passed to fetchPlaces |
| `mobile/src/screens/SeeAll.js` | Food param wired, food tags on cards |
| `mobile/src/screens/Detail.js` | Food tag row below vibe chips, explanation line |
| `mobile/src/services/api.js` | food param added to fetchPlaces() |
| `backend/app/db/models/place_food.py` | New model |
| `backend/app/api/v1/places.py` | food query param, fallback logic, explanation generation |
| `backend/app/services/ranking.py` | soft food match, NEUTRAL_MOOD_VECTOR, FOOD_RELATIVES |
| `backend/ingest_google_places.py` | Food attribute ingestion → place_food |
| `backend/alembic/versions/` | Migration for place_food table + GIN index |

---

## Dietary Restrictions Filter
**Files:** `mobile/src/constants/foods.js`, `backend/ingest_google_places.py`, `backend/app/db/models/place_food.py` | **Effort:** 1 day

Food type and dietary requirement are different things. A vegan user selecting CALM + RAMEN needs places that serve vegan ramen — not just any ramen spot. Dietary restrictions are hard requirements, not preferences.

Google Places already provides:
- `servesVegetarianFood` → `vegan_friendly`
- `servesVegetarianFood` + no meat tags → stricter vegan check

### UI
Optional third row below food chips, off by default:

```
[🌱 VEGAN] [🥩 HALAL] [🌾 GLUTEN-FREE]
```

Single-select. Tapping a restriction adds it as a hard filter (not a boost — exclude places that don't match).

### Backend
```python
# In ranking.py — applied as a hard filter, not a score modifier
if dietary == 'vegan' and not place.food.vegan_friendly:
    continue  # exclude entirely
```

Add `vegan_friendly`, `halal_certified`, `gluten_free_options` booleans to `place_food` table (one migration). Populate from Google attributes at ingestion.

---

## Swipe Undo
**Files:** `mobile/src/components/SwipeStack.js` | **Effort:** 1 day

Users frequently regret dismissing a card they didn't get a good look at. A double-tap on the stack or a small "↩ UNDO" ghost button that appears for 3 seconds after a left-swipe brings the last dismissed card back to top.

```js
// In SwipeStack:
const [lastDismissed, setLastDismissed] = useState(null);

const handleSwipeLeft = (place) => {
  setLastDismissed(place);
  setTimeout(() => setLastDismissed(null), 3000);
  // ... existing dismiss logic
};

const handleUndo = () => {
  if (lastDismissed) {
    prependToStack(lastDismissed);
    setLastDismissed(null);
  }
};
```

Ghost undo button: small, bottom-right, fades out after 3s. One card deep — not full history.

---

## What V3 Will Not Do

- Food ratings or food-specific scores
- Multiple food selections simultaneously
- Cuisine browsing pages or "best X cuisine" lists
- Any UX surface that lets users compare instead of decide
- Separate "foodie mode" — one screen, both signals, always

---

## The Competitive Position After V3

| | Google Maps | Yelp | Atmosphere | VYBE V3 |
|---|---|---|---|---|
| Discovery | Search | Search | Browse | Feel + Crave |
| Mood signal | None | None | None | Primary |
| Food signal | Category filter | Category filter | Cuisine filter | Boost (soft match) |
| Mood + food together | Never | Never | Never | One screen, one flow |
| Food-only path | Category list | Category list | Cuisine list | Vibe-ranked swipe |
| Empty state handling | Dead end | Dead end | Dead end | Auto-fallback |
| System decides | No | No | No | Yes |
