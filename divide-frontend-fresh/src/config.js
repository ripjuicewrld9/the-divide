// src/config.js
// Use VITE_API_URL if set, otherwise use same domain (production)
export const API_BASE = import.meta.env.VITE_API_URL || '';
