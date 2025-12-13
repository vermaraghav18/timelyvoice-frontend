export function getToken() {
  return localStorage.getItem("token") || "";
}

export function setToken(t) {
  const v = String(t || "");
  localStorage.setItem("token", v);
  localStorage.setItem("adminToken", v); // for compatibility
}

export function clearToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("adminToken");
  localStorage.removeItem("user");
}

export function getPreviewCountry() {
  return localStorage.getItem("previewCountry") || "";
}

export function setPreviewCountry(val) {
  localStorage.setItem("previewCountry", String(val || ""));
}
