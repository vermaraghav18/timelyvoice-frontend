export const API_MAX_LIMIT = 100; // keep in sync with backend cap on Render
export const clampLimit = (n) => Math.min(Math.max(Number(n) || 0, 1), API_MAX_LIMIT);
