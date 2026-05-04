import math
from datetime import datetime
from typing import Optional

MOOD_VECTORS: dict[str, dict[str, float]] = {
    "calm": {
        "calm": 0.85, "aesthetic": 0.6, "lively": 0.1, "social": 0.15,
        "premium": 0.3, "budget": 0.5, "work_friendly": 0.5, "date_friendly": 0.4,
    },
    "aesthetic": {
        "calm": 0.5, "aesthetic": 0.9, "lively": 0.3, "social": 0.3,
        "premium": 0.6, "budget": 0.2, "work_friendly": 0.3, "date_friendly": 0.6,
    },
    "energetic": {
        "calm": 0.1, "aesthetic": 0.4, "lively": 0.9, "social": 0.7,
        "premium": 0.3, "budget": 0.4, "work_friendly": 0.2, "date_friendly": 0.3,
    },
    "social": {
        "calm": 0.2, "aesthetic": 0.4, "lively": 0.8, "social": 0.95,
        "premium": 0.3, "budget": 0.5, "work_friendly": 0.2, "date_friendly": 0.3,
    },
    "focus": {
        "calm": 0.7, "aesthetic": 0.5, "lively": 0.1, "social": 0.1,
        "premium": 0.3, "budget": 0.5, "work_friendly": 0.9, "date_friendly": 0.1,
    },
    "romantic": {
        "calm": 0.6, "aesthetic": 0.8, "lively": 0.3, "social": 0.4,
        "premium": 0.7, "budget": 0.2, "work_friendly": 0.1, "date_friendly": 0.95,
    },
    "explore": {
        "calm": 0.3, "aesthetic": 0.6, "lively": 0.6, "social": 0.5,
        "premium": 0.3, "budget": 0.5, "work_friendly": 0.2, "date_friendly": 0.3,
    },
    "budget_chill": {
        "calm": 0.6, "aesthetic": 0.4, "lively": 0.4, "social": 0.5,
        "premium": 0.05, "budget": 0.95, "work_friendly": 0.4, "date_friendly": 0.2,
    },
}

DIMS = ["calm", "aesthetic", "lively", "social", "premium", "budget", "work_friendly", "date_friendly"]

NEUTRAL_MOOD_VECTOR = {
    "calm": 0.55, "aesthetic": 0.62, "lively": 0.42, "social": 0.50,
    "premium": 0.38, "budget": 0.42, "work_friendly": 0.38, "date_friendly": 0.46,
}

FOOD_RELATIVES: dict[str, list[str]] = {
    "ramen":         ["japanese", "noodles"],
    "sushi":         ["japanese", "seafood"],
    "korean":        ["asian", "bbq"],
    "italian":       ["pizza", "pasta"],
    "cocktails":     ["wine", "craft_beer"],
    "wine":          ["cocktails", "natural_wine"],
    "craft_beer":    ["cocktails"],
    "coffee":        ["brunch", "breakfast"],
    "brunch":        ["coffee", "breakfast"],
    "american":      ["sandwiches", "burgers"],
    "sandwiches":    ["american"],
    "dessert":       ["coffee", "brunch"],
    "mediterranean": ["italian"],
    "thai":          ["asian"],
    "indian":        ["asian"],
}

# Ideal price tier per mood (1=budget … 4=very expensive)
MOOD_PRICE_PREF: dict[str, int] = {
    'budget_chill': 1, 'focus': 1, 'calm': 2, 'social': 2,
    'energetic': 2, 'explore': 2, 'aesthetic': 3, 'romantic': 3,
}

# Crowd types that feel right for each mood
MOOD_CROWD_PREF: dict[str, list[str]] = {
    'romantic':     ['couples'],
    'social':       ['mixed', 'students'],
    'focus':        ['professionals', 'students'],
    'calm':         ['professionals', 'locals'],
    'aesthetic':    ['mixed', 'couples'],
    'energetic':    ['students', 'mixed'],
    'explore':      ['locals', 'tourists'],
    'budget_chill': ['students', 'locals'],
}

_VIBE_DESC: dict[str, str] = {
    "calm": "quiet and relaxed",
    "aesthetic": "visually distinctive",
    "lively": "energetic atmosphere",
    "social": "great for groups",
    "premium": "upscale feel",
    "budget": "easy on the wallet",
    "work_friendly": "ideal for working",
    "date_friendly": "perfect for dates",
}


def generate_explanation(vibe_vector: dict | None, mood: str | None, food: str | None) -> str:
    if not vibe_vector:
        return ""
    top = sorted(vibe_vector.items(), key=lambda x: x[1], reverse=True)[:2]
    desc = " · ".join(_VIBE_DESC.get(k, k) for k, _ in top if k in _VIBE_DESC)
    parts = []
    if mood:
        parts.append(mood.upper())
    if food:
        parts.append(food.upper())
    prefix = " + ".join(parts) if parts else "VYBE PICK"
    return f"Ranked for {prefix} — {desc}."


def compute_food_match(food_tags: list | None, food_id: str | None) -> float:
    if not food_tags or not food_id:
        return 0.0
    if food_id in food_tags:
        return 1.0
    relatives = FOOD_RELATIVES.get(food_id, [])
    if any(r in food_tags for r in relatives):
        return 0.5
    return 0.0


def _magnitude(v: dict) -> float:
    return math.sqrt(sum(v.get(k, 0.0) ** 2 for k in DIMS))


def _cosine(mood_vec: dict, place_vec: dict) -> float:
    dot = sum(mood_vec.get(k, 0.0) * place_vec.get(k, 0.0) for k in DIMS)
    denom = _magnitude(mood_vec) * _magnitude(place_vec)
    return dot / (denom + 1e-9)


def _time_adjust(vibe_vec: dict, hour: int) -> dict:
    """Boost/dampen a place's vibe dimensions based on time of day."""
    adj = dict(vibe_vec)
    if 5 <= hour < 11:  # morning
        adj['calm']          = min(1.0, adj.get('calm', 0) * 1.15)
        adj['work_friendly'] = min(1.0, adj.get('work_friendly', 0) * 1.12)
        adj['lively']        = adj.get('lively', 0) * 0.85
        adj['social']        = adj.get('social', 0) * 0.90
    elif hour >= 18 or hour < 3:  # evening / late night
        adj['social']        = min(1.0, adj.get('social', 0) * 1.15)
        adj['lively']        = min(1.0, adj.get('lively', 0) * 1.15)
        adj['date_friendly'] = min(1.0, adj.get('date_friendly', 0) * 1.12)
        adj['calm']          = adj.get('calm', 0) * 0.88
        adj['work_friendly'] = adj.get('work_friendly', 0) * 0.80
    # midday (11–18): no adjustment — baseline vibe vector is most accurate
    return adj


def is_open_now(periods: list | None) -> bool:
    """Return True if the place is currently open based on stored opening hours.
    Returns True when periods is None/empty (unknown = don't filter out)."""
    if not periods:
        return True
    now = datetime.now()
    # Google day encoding: 0=Sunday … 6=Saturday
    google_day = (now.weekday() + 1) % 7
    current_mins = now.hour * 60 + now.minute
    for period in periods:
        try:
            o_day  = period["open"]["day"]
            o_mins = period["open"]["hour"] * 60 + period["open"].get("minute", 0)
            c_day  = period["close"]["day"]
            c_mins = period["close"]["hour"] * 60 + period["close"].get("minute", 0)
            if o_day == google_day:
                if c_day == google_day:
                    if o_mins <= current_mins <= c_mins:
                        return True
                else:  # closes next day (late night slot)
                    if current_mins >= o_mins:
                        return True
            elif c_day == google_day:  # opened yesterday
                if current_mins <= c_mins:
                    return True
        except (KeyError, TypeError):
            continue
    return False


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def rank_places(
    rows: list,
    mood: str,
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    hour: Optional[int] = None,
    feedback: Optional[dict] = None,
    max_distance_km: Optional[float] = None,
    food: Optional[str] = None,
    dietary: Optional[str] = None,
) -> tuple[list, list]:
    """
    Returns (results, results_nofood):
      results       — food-filtered ranked list
      results_nofood — same scores but without food filter (used as fallback)

    feedback: {place_id: felt_right (bool)} — personalises scores based on
    the user's past vibe-check votes for this mood.
    """
    mood_key = mood.lower().replace(" ", "_") if mood else None
    mood_vec = MOOD_VECTORS.get(mood_key, NEUTRAL_MOOD_VECTOR) if mood_key else NEUTRAL_MOOD_VECTOR
    current_hour = hour if hour is not None else datetime.now().hour
    fb = feedback or {}
    dow = datetime.now().weekday()  # 0=Mon … 6=Sun
    is_weekend = dow >= 5

    results: list = []
    results_nofood: list = []

    for place, vibe, food_row in rows:
        if max_distance_km is not None and user_lat is not None and user_lng is not None:
            if _distance_km(user_lat, user_lng, place.lat, place.lng) > max_distance_km:
                continue

        # Dietary hard filter
        if dietary == 'vegetarian' and (not food_row or not food_row.serves_vegetarian):
            continue
        if dietary in ('halal', 'gluten_free') and (
            not food_row or not food_row.dietary_tags or dietary not in food_row.dietary_tags
        ):
            continue

        if vibe is None:
            score = 0.0
            food_match = 0.0
        else:
            adjusted_vec = _time_adjust(vibe.vibe_vector, current_hour)
            vm = _cosine(mood_vec, adjusted_vec)

            # Rating normalized across realistic Google range (3.5–5.0)
            rating_norm = max(0.0, min(1.0, (place.rating - 3.5) / 1.5))

            # Mood-aware price fit
            ideal_price = MOOD_PRICE_PREF.get(mood_key, 2)
            price_fit = max(0.0, 1.0 - abs(place.price_range - ideal_price) / 3.0)

            # Distance normalized to [0, 1]
            if user_lat is not None and user_lng is not None:
                dist = _distance_km(user_lat, user_lng, place.lat, place.lng)
                dist_score = 1.0 / (1.0 + dist)
            else:
                dist_score = 0.5

            # Coherent weight budget — sums to 1.0 before boosts
            score = (0.50 * vm
                     + 0.20 * rating_norm
                     + 0.15 * vibe.hype_score
                     + 0.10 * dist_score
                     + 0.05 * price_fit)

            # Feedback personalisation
            if place.id in fb:
                score += 0.06 if fb[place.id] else -0.06

            # Crowd-type soft boost
            if vibe.crowd and mood_key:
                if vibe.crowd in MOOD_CROWD_PREF.get(mood_key, []):
                    score += 0.04

            # Overhype penalty for quiet moods
            if mood_key in ('calm', 'focus', 'romantic') and vibe.hype_score > 0.8:
                score *= 0.88

            # Day-of-week context
            if mood_key == 'social' and is_weekend:
                score *= 1.10
            elif mood_key == 'focus' and not is_weekend:
                score *= 1.06

            # Collect food tags for match calculation
            food_tags: list[str] = []
            if food_row:
                food_tags = (
                    (food_row.cuisine_tags or [])
                    + (food_row.drink_tags or [])
                    + (food_row.meal_types or [])
                )
                if food_row.serves_coffee: food_tags.append("coffee")
                if food_row.serves_brunch: food_tags.append("brunch")
                if food_row.serves_alcohol: food_tags.extend(["cocktails", "wine", "craft_beer"])

            food_match = compute_food_match(food_tags, food) if food else 0.0

        # No-food score (used for fallback list) — clamped before storing
        results_nofood.append((place, vibe, food_row, round(min(1.0, score), 4)))

        # Food-boosted score
        if food:
            boosted = min(1.0, score * (1.0 + 0.4 * food_match))
        else:
            boosted = min(1.0, score)

        results.append((place, vibe, food_row, round(boosted, 4)))

    results.sort(key=lambda x: x[3], reverse=True)
    results_nofood.sort(key=lambda x: x[3], reverse=True)
    return results, results_nofood
