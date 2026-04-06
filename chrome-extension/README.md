# Hirdlogic Chrome extension

## Install (development)

1. Run the API (`backend`) and web app locally so tokens and `/api/linkedin/*` routes work.
2. In Chrome, open `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this `chrome-extension` folder (or `dist-extension` after `npm run build:extension` from the repo root).
5. Pin the extension if you like. Visit LinkedIn and use the navy tab on the right edge to open the panel.

## Connection settings

- Default API base: `http://localhost:5000/api` (matches `VITE_API_URL` when it ends with `/api`).
- Default app origin: `http://localhost:5173` (for Sign in / Job Tracker links).
- Change these in the extension popup under **Save connection settings** (stored in `chrome.storage.local`).

## Syncing your login from the web app

- With the extension installed, open the Hirdlogic app on `http://localhost:5173` and log in.
- The `dashboard-bridge` content script copies `hiredlogics_access_token` from `sessionStorage` into the extension, and `AuthContext` also dispatches `hirdlogic-extension-auth` with the token and user.

## Production

- Add your deployed **app origin** (e.g. `https://app.example.com`) to `manifest.json` under `content_scripts` for `dashboard-bridge.js`, alongside the localhost entries.
- Add your **API host** to `host_permissions` if it is not already covered (e.g. `https://api.example.com/*`).
- Set API base and app origin in the popup (or preload via `chrome.storage.local`).
