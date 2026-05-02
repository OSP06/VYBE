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
    "ramen":        ["japanese", "noodles"],
    "sushi":        ["japanese", "seafood"],
    "korean":       ["asian", "bbq"],
    "italian":      ["pizza", "pasta"],
    "cocktails":    ["wine", "craft_beer"],
    "wine":         ["cocktails", "natural_wine"],
    "craft_beer":   ["cocktails"],
    "coffee":       ["brunch", "breakfast"],
    "brunch":       ["coffee", "breakfast"],
    "american":     ["sandwiches", "burgers"],
    "sandwiches":   ["american"],
    "dessert":      ["coffee", "brunch"],
    "mediterranean":["italian"],
    "thai":         ["asian"],
    "indian":       ["asian"],
}


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
    """Boost/dampen a place's vibe dimensions based on time of day.
    Applied to the place vector, not the mood vector — reflects how the place
    actually feels at this hour (a cafe IS calmer at 9am, livelier at 9pm)."""
    adj = dict(vibe_vec)
    if 5 <= hour < 11:  # morning
        adj['calm']          = min(1.0, adj.get('calm', 0) * 1.25)
        adj['work_friendly'] = min(1.0, adj.get('work_friendly', 0) * 1.2)
        adj['lively']        = adj.get('lively', 0) * 0.75
        adj['social']        = adj.get('social', 0) * 0.85
    elif hour >= 18 or hour < 3:  # evening / late night
        adj['social']        = min(1.0, adj.get('social', 0) * 1.25)
        adj['lively']        = min(1.0, adj.get('lively', 0) * 1.25)
        adj['date_friendly'] = min(1.0, adj.get('date_friendly', 0) * 1.2)
        adj['calm']          = adj.get('calm', 0) * 0.8
        adj['work_friendly'] = adj.get('work_friendly', 0) * 0.7
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
) -> list:
    """
    feedback: {place_id: felt_right (bool)} — personalises scores based on
    the user's past vibe-check votes for this mood.
    felt_right=True  → +0.08 (they loved the vibe match)
    felt_right=False → -0.08 (the vibe didn't feel right)
    """
    mood_key = mood.lower().replace(" ", "_") if mood else None
    mood_vec = MOOD_VECTORS.get(mood_key, NEUTRAL_MOOD_VECTOR) if mood_key else NEUTRAL_MOOD_VECTOR
    current_hour = hour if hour is not None else datetime.now().hour
    fb = feedback or {}
    results = []
    for place, vibe, food_row in rows:
        if max_distance_km is not None and user_lat is not None and user_lng is not None:
            if _distance_km(user_lat, user_lng, place.lat, place.lng) > max_distance_km:
                continue
        if vibe is None:
            score = 0.0
        else:
            adjusted_vec = _time_adjust(vibe.vibe_vector, current_hour)
            vm = _cosine(mood_vec, adjusted_vec)
            rating_norm = place.rating / 5.0
            price_fit = 1.0 - abs(place.price_range - 2) / 4.0
            score = 0.55 * vm + 0.20 * rating_norm + 0.15 * vibe.hype_score + 0.10 * price_fit
            if user_lat is not None and user_lng is not None:
                dist = _distance_km(user_lat, user_lng, place.lat, place.lng)
                score += 0.10 * (1.0 / (1.0 + dist))
            if place.id in fb:
                score += 0.08 if fb[place.id] else -0.08

            # Food match boost — multiplicative so vibe quality still matters
            if food:
                food_tags = []
                if food_row:
                    food_tags = (food_row.cuisine_tags or []) + (food_row.drink_tags or []) + (food_row.meal_types or [])
                    if food_row.serves_coffee: food_tags.append("coffee")
                    if food_row.serves_brunch: food_tags.append("brunch")
                    if food_row.serves_alcohol: food_tags.extend(["cocktails", "wine", "craft_beer"])
                score *= 1.0 + 0.4 * compute_food_match(food_tags, food)

            # Overhype penalty — tourist-trap places with high review volume
            # hurt quiet-mood users most; dampen them for calm/focus/romantic
            if mood_key and mood_key in ('calm', 'focus', 'romantic') and vibe.hype_score > 0.8:
                score *= 0.88

            # Day-of-week context — same place feels different on a Tuesday vs Saturday
            dow = datetime.now().weekday()  # 0=Mon … 6=Sun
            is_weekend = dow >= 5
            if mood_key and mood_key == 'social' and is_weekend:
                score *= 1.12
            elif mood_key and mood_key == 'focus' and not is_weekend:
                score *= 1.08

        results.append((place, vibe, round(score, 4)))
    results.sort(key=lambda x: x[2], reverse=True)
    return results
