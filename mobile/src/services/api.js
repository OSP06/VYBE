import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
});

// Called once from AuthProvider so the interceptor can trigger logout on 401
let _onUnauthorized = null;
export function setUnauthorizedHandler(fn) {
  _onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && _onUnauthorized) {
      _onUnauthorized();
    }
    return Promise.reject(err);
  },
);

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Public ───────────────────────────────────────────────────────────────────

const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

export const fetchPlaces = async (mood, cityId = 1, limit = 30, neighborhood = null, userLat = null, userLng = null, openNow = false, maxDistanceKm = null, food = null) => {
  let url = `/api/v1/places?city_id=${cityId}&limit=${limit}`;
  if (mood) url += `&mood=${mood}`;
  if (food) url += `&food=${food}`;
  if (neighborhood) url += `&neighborhood=${encodeURIComponent(neighborhood)}`;
  if (openNow) url += `&open_now=true`;
  const lat = userLat ?? SF_LAT;
  const lng = userLng ?? SF_LNG;
  url += `&lat=${lat}&lng=${lng}`;
  if (maxDistanceKm !== null) url += `&max_distance_km=${maxDistanceKm}`;
  const res = await api.get(url);
  return res.data;
};

export const fetchNeighborhoods = async (cityId = 1) => {
  const res = await api.get(`/api/v1/neighborhoods?city_id=${cityId}`);
  return res.data;
};

export const fetchPlace = async (placeId) => {
  const res = await api.get(`/api/v1/places/${placeId}`);
  return res.data;
};

export const fetchCities = async () => {
  const res = await api.get('/api/v1/cities');
  return res.data;
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (email, password) => {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await api.post('/api/v1/auth/login', form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

export const registerUser = async (email, password, displayName) => {
  const res = await api.post('/api/v1/auth/register', {
    email,
    password,
    display_name: displayName || null,
  });
  return res.data;
};

export const fetchMe = async (token) => {
  const res = await api.get('/api/v1/auth/me', authHeader(token));
  return res.data;
};

export const updateMe = async (token, displayName) => {
  const res = await api.patch('/api/v1/auth/me', { display_name: displayName }, authHeader(token));
  return res.data;
};

// ── Protected ─────────────────────────────────────────────────────────────────

export const savePlace = async (token, placeId) => {
  const res = await api.post('/api/v1/save', { place_id: placeId }, authHeader(token));
  return res.data;
};

export const unsavePlace = async (token, placeId) => {
  const res = await api.delete('/api/v1/save', {
    ...authHeader(token),
    data: { place_id: placeId },
  });
  return res.data;
};

export const fetchSaved = async (token) => {
  const res = await api.get('/api/v1/saved', authHeader(token));
  return res.data;
};

export const submitVibeFeedback = async (token, placeId, mood, feltRight) => {
  const res = await api.post(
    '/api/v1/vibe-check',
    { place_id: placeId, mood, felt_right: feltRight },
    authHeader(token),
  );
  return res.data;
};
