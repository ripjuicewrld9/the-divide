
always review entire project for consistency when implementing changes

## Quick context for AI coding agents

This repo is a small full-stack app: an Express + Socket.IO + MongoDB backend and a React/Vite frontend in `divide-frontend-fresh`.

- Backend entry: `server.js` (root). Key responsibilities: REST API, real-time socket events, auth (JWT), and DB models in `models/` (e.g. `Divide.js`, `Jackpot.js`).
- Frontend: `divide-frontend-fresh/` (Vite + React). Important dirs: `src/components/`, `src/context/AuthContext.jsx`, `src/hooks/useSocket.js`, and `src/services/api.js`.

## Why this structure
- Single backend that can serve static files and also powers a separate local dev frontend.
- Socket.IO is used for real-time updates (`voteUpdate`, `newDivide`, `divideEnded`). See `server.js` for events emitted.
- Auth pattern: JWT tokens returned by `/login` and `/register`. Frontend stores token in `localStorage` and `AuthContext` attaches it to requests to protected endpoints.

## Environment & runtime
- Required env variables (backend): `MONGODB_URI`, `JWT_SECRET`. Optional: `ADMIN_CODE` for creating admin users. PORT defaults to 3000.
- CORS / dev origin: server expects the React dev server at `http://localhost:5173` (see Socket.IO `cors.origin`).

## How to run locally (developer flows)
- Backend (root):
  - Install: `cd "c:\Users\gotta\OneDrive\Desktop\The Divide" ; npm install`
  - Start: `npm start` (runs `node server.js`, default port 3000)
- Frontend (dev):
  - Install: `cd divide-frontend-fresh ; npm install`
  - Dev server: `npm run dev` (Vite, default port 5173)
  - Build: `npm run build`
  - Lint: `npm run lint`

Run both in parallel during development. Backend serves API and sockets on port 3000; Vite runs on 5173 and connects to backend via `VITE_API_URL` or hardcoded `http://localhost:3000` in some client code.

## API & client conventions (concrete examples)
- Auth: endpoints `/register` and `/login` return `{ token, userId, balance, role }`. Frontend `AuthContext` stores token in localStorage and calls `/api/me` to refresh user info (`AuthContext.jsx`).
- Divides endpoints: `GET /Divides` (note capital D), `POST /Divides` (admin-only). The repo historically used both `/divides/*` and `/Divides/*` for vote and end endpoints; recent updates add aliases so the server accepts both. Prefer using `/Divides` (capital D) in new client code and update both server and client together if you remove aliases.
- Socket events: server emits `voteUpdate`, `newDivide`, `divideEnded`. Frontend uses `src/hooks/useSocket.js` which creates a socket with `import.meta.env.VITE_API_URL || ""`.
- Client HTTP helper: `src/services/api.js` uses `import.meta.env.VITE_API_URL` as the base URL; however some client code calls hardcoded `http://localhost:3000`. Prefer standardizing on `VITE_API_URL` when adding new code.

## Patterns & gotchas for contributors
- Auth token placement: `AuthContext` sets `Authorization: Bearer ${token}` for protected fetches. Align new fetch helpers with this pattern.
- Realtime + REST: vote flows usually both update DB (REST) and emit socket events for live UI updates. Keep both in sync and emit events from server when state changes.
- Casing inconsistency: watch for `/Divides` vs `/divides` endpoints and `/api/...` vs top-level routes; these inconsistencies exist and have caused bugs — replicate existing endpoints rather than renaming unless updating both server and clients.
- Models are authoritative: modify schema files in `models/` when changing persisted fields.

## Files to inspect for context when changing features
- `server.js` — the canonical server flow, middleware (auth, adminOnly), socket setup, and endpoints.
- `models/Divide.js`, `models/Jackpot.js` — DB schemas and persisted fields.
- `divide-frontend-fresh/src/context/AuthContext.jsx` — token handling, login/register flows, and helper functions (e.g. `deductForVote`).
- `divide-frontend-fresh/src/hooks/useSocket.js` — socket setup and join/leave semantics.
- `divide-frontend-fresh/src/services/api.js` — client HTTP wrapper and `VITE_API_URL` usage.
- `divide-frontend-fresh/src/components/DivideCard.jsx` and `Divides.jsx` — examples of consuming live updates and rendering votes/pot/timer.

## Changes an AI should be careful about
- Don't casually rename endpoints or change casing; update both server and client in one PR.
- When touching auth or token handling, keep token persistence in `localStorage` and the `AuthContext` update logic in sync.
- Socket event names are used by multiple components; avoid renaming events unless you update all listeners and tests.

## If you add or update scripts
- Update the appropriate `package.json` (`/` for server, `/divide-frontend-fresh` for frontend). Frontend has `dev`, `build`, and `lint` scripts.

always review entire project for consistency when implementing changes

---
If anything here is unclear or you'd like more detail (e.g., exact env example, sample curl commands, or a migration plan to standardize endpoints), tell me what to include and I'll iterate.
