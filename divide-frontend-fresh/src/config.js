// src/config.js
// Use VITE_API_URL when provided (dev), otherwise fallback to the debug server port 3000
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";
