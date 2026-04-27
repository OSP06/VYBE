import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Public ───────────────────────────────────────────────────────────────────

const SF_LAT = 37.7749;
const SF_LNG = -122.4194;

export const fetchPlaces = async (mood, cityId = 1, limit = 30, neighborhood = null, userLat = null, userLng = null) => {
  let url = `${BASE_URL}/api/v1/places?city_id=${cityId}&mood=${mood}&limit=${limit}&min_score=0.25`;
  if (neighborhood) url += `&neighborhood=${encodeURIComponent(neighborhood)}`;
  const lat = userLat ?? SF_LAT;
  const lng = userLng ?? SF_LNG;
  url += `&lat=${lat}&lng=${lng}`;
  const res = await axios.get(url);
  return res.data;
};

export const fetchNeighborhoods = async (cityId = 1) => {
  const res = await axios.get(`${BASE_URL}/api/v1/neighborhoods?city_id=${cityId}`);
  return res.data;
};

export const fetchPlace = async (placeId) => {
  const res = await axios.get(`${BASE_URL}/api/v1/places/${placeId}`);
  return res.data;
};

export const fetchCities = async () => {
  const res = await axios.get(`${BASE_URL}/api/v1/cities`);
  return res.data;
};

// ── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (email, password) => {
  const form = new URLSearchParams();
  form.append('username', email);
  form.append('password', password);
  const res = await axios.post(`${BASE_URL}/api/v1/auth/login`, form.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
};

export const registerUser = async (email, password, displayName) => {
  const res = await axios.post(`${BASE_URL}/api/v1/auth/register`, {
    email,
    password,
    display_name: displayName || null,
  });
  return res.data;
};

export const fetchMe = async (token) => {
  const res = await axios.get(`${BASE_URL}/api/v1/auth/me`, authHeader(token));
  return res.data;
};

// ── Protected ─────────────────────────────────────────────────────────────────

export const savePlace = async (token, placeId) => {
  const res = await axios.post(`${BASE_URL}/api/v1/save`, { place_id: placeId }, authHeader(token));
  return res.data;
};

export const unsavePlace = async (token, placeId) => {
  const res = await axios.delete(`${BASE_URL}/api/v1/save`, {
    ...authHeader(token),
    data: { place_id: placeId },
  });
  return res.data;
};

export const fetchSaved = async (token) => {
  const res = await axios.get(`${BASE_URL}/api/v1/saved`, authHeader(token));
  return res.data;
};
