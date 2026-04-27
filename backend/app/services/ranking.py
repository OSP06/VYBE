import math
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


def _magnitude(v: dict) -> float:
    return math.sqrt(sum(v.get(k, 0.0) ** 2 for k in DIMS))


def _cosine(mood_vec: dict, place_vec: dict) -> float:
    dot = sum(mood_vec.get(k, 0.0) * place_vec.get(k, 0.0) for k in DIMS)
    denom = _magnitude(mood_vec) * _magnitude(place_vec)
    return dot / (denom + 1e-9)


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
) -> list:
    mood_key = mood.lower().replace(" ", "_")
    mood_vec = MOOD_VECTORS.get(mood_key, MOOD_VECTORS["calm"])
    results = []
    for place, vibe in rows:
        if vibe is None:
            score = 0.0
        else:
            vm = _cosine(mood_vec, vibe.vibe_vector)
            rating_norm = place.rating / 5.0
            price_fit = 1.0 - abs(place.price_range - 2) / 4.0
            score = 0.55 * vm + 0.20 * rating_norm + 0.15 * vibe.hype_score + 0.10 * price_fit
            if user_lat is not None and user_lng is not None:
                dist = _distance_km(user_lat, user_lng, place.lat, place.lng)
                score += 0.10 * (1.0 / (1.0 + dist))
        results.append((place, vibe, round(score, 4)))
    results.sort(key=lambda x: x[2], reverse=True)
    return results
