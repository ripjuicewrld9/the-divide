// src/services/api.js
// default to backend at port 3000 when VITE_API_URL is not configured (dev fallback)
const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  }
  // fallback: return text for non-json responses
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  try { return JSON.parse(text); } catch { return text; }
}

export default {
  async get(path) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    try {
      const res = await fetch(API + path, { credentials: "include", headers, signal: controller.signal });
      clearTimeout(timeoutId);
      return parseResponse(res);
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  },
  async post(path, body) {
    console.log('[API] POST', API + path, body);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {});
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    try {
      const res = await fetch(API + path, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log('[API] POST response', res.status, res.statusText);
      return parseResponse(res);
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('[API] POST error', err);
      throw err;
    }
  },
  async patch(path, body) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {});
    const res = await fetch(API + path, {
      method: "PATCH",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  },
  async put(path, body) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {});
    const res = await fetch(API + path, {
      method: "PUT",
      credentials: "include",
      headers,
      body: JSON.stringify(body),
    });
    return parseResponse(res);
  },
  async delete(path) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const res = await fetch(API + path, { 
      method: "DELETE",
      credentials: "include", 
      headers 
    });
    return parseResponse(res);
  },
};