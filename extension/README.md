# HiredLogics Capture Extension

Chrome extension for BDs to capture job details from job boards and send them to the HiredLogics API. Jobs are stored in the `jobs` table and linked to the BD via `job_assignments`, so they appear in **Your leads** in the BD dashboard and everywhere else that uses that data.

## Setup

1. **Load the extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `jobland/extension` folder

2. **Get your API key (BD only)**
   - Log in to the app as a BD (or admin)
   - Go to **BD Portal** (sidebar)
   - In the sidebar, click **Copy Capture API key** (key is copied to clipboard)

3. **Configure the extension**
   - Right‑click the extension icon → **Options** (or open the popup and click "Settings")
   - **API Base URL**: your backend base URL, e.g. `https://your-api.hiredlogics.com` or `http://localhost:5000` (no trailing slash)
   - **API Key**: paste the Capture API key you copied from the BD dashboard
   - Click **Save**

## Usage

- On a job listing page (LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, etc.), click the extension icon and choose **Open on this page**, or use the floating button if it appears.
- The popup is pre-filled with Job Title, Company, and Job URL. Optionally set **Tech / Platform**.
- Click **Save to HiredLogics**. The job is created (or reused by URL) and a lead is created for you; it shows under **Your leads** in the BD dashboard and in admin/user dashboards as applicable.

## Backend

- **POST /api/extension/jobs** — accepts `title`, `company_name`, `job_url`, and optional `platform`, `location`, `description`. Auth: `Authorization: Bearer <oneclick_api_key>`.
- **GET /api/bd/oneclick-token** — (JWT) returns or creates the BD’s Capture API key for use in the extension.
