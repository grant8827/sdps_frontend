# School Drop-off & Pick-up — Website

The React web counterpart to `../mobile_app`. Same roles (Parent /
Teacher / Admin), same screens, same mock data/state/services — ported
1:1 so the two clients behave identically until the real API in
`../backend` exists. React Router replaces React Navigation; plain
CSS (`src/index.css`) replaces the RN `StyleSheet`s.

## Structure

- `src/types`, `src/mocks`, `src/utils` — shared domain shapes and demo data, mirroring `mobile_app/src`.
- `src/services/auth` — mock login + session persistence (`localStorage` here, `EncryptedStorage` on mobile).
- `src/services/realtime`, `src/state/appState.ts` — in-memory pub/sub store standing in for the backend until it's built. Swap the realtime implementation for a Socket.io/Firebase client behind the same interface when ready.
- `src/context` — Auth and Notices React contexts, unchanged from mobile.
- `src/navigation` — layouts + bottom tab bar per role (the web equivalent of the RN tab navigators).
- `src/screens/{auth,parent,teacher,admin}` — one screen per RN screen.

## Develop

```sh
npm install
npm run dev
```

Log in with any password; the mock auth infers role from the email —
try `parent@test.com`, `teacher@test.com`, or `admin@test.com`.

By default `/api/*` is proxied to the Node backend on `:3000` (see
`vite.config.ts`), so run `npm run dev` in `../backend` alongside this
for anything that starts calling real endpoints.

## Build

```sh
npm run build
```

Outputs to `frontend/dist`. `../backend/index.js` serves this folder
directly, so the same Express server backs both the API the mobile
app will call and the built website — `npm start` from the repo root
builds the frontend and starts that server.
