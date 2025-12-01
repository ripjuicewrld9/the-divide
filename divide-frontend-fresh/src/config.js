// src/config.js
// In production (when built), use same domain. In dev, use VITE_API_URL or localhost:3000
export const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? '' : "http://localhost:3000");
