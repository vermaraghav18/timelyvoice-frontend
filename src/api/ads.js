// frontend/src/api/ads.js
import axios from "axios";

const API = import.meta.env.VITE_API_BASE || "";

export const listAds = (params = {}) =>
  axios.get(`${API}/api/admin/ads`, { params }).then(r => r.data);

export const createAd = (payload) =>
  axios.post(`${API}/api/admin/ads`, payload).then(r => r.data);

export const updateAd = (id, payload) =>
  axios.patch(`${API}/api/admin/ads/${id}`, payload).then(r => r.data);

export const deleteAd = (id) =>
  axios.delete(`${API}/api/admin/ads/${id}`).then(r => r.data);
