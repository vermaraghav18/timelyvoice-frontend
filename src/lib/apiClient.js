// frontend/src/lib/apiClient.js
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || ""; 
// If you already proxy /api in Vite, keep BASE_URL as "".

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: false,
});

/** token helpers */
export function getToken() {
  try {
    return localStorage.getItem("token") || "";
  } catch {
    return "";
  }
}

export function setToken(token) {
  try {
    localStorage.setItem("token", token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem("token");
  } catch {}
}

// Attach Authorization header automatically
api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});
