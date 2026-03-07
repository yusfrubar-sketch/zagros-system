# Zagros License Admin (HTML website)

Static HTML/JS admin panel to generate license passwords and view users (machine IDs). You can host this on your domain later.

## Setup

1. Copy `config.example.js` to `config.js`.
2. In Supabase Dashboard: **Settings → API** copy your **Project URL** and **service_role** key (not the anon key).
3. In `config.js` set:
   - `window.SUPABASE_URL` = your project URL
   - `window.SUPABASE_SERVICE_ROLE_KEY` = your service_role key

**Important:** Never commit `config.js` or expose the service_role key publicly. When you host this on your domain, protect the page (e.g. login, or restrict by IP).

## Run locally

Open `index.html` in a browser, or serve the folder with any static server:

```bash
npx serve .
# or: python3 -m http.server 8080
```

## Host on your domain

Upload the contents of this folder to your web host (or connect your repo). Ensure `config.js` is created on the server with your Supabase URL and service_role key. Protect the URL (e.g. admin.yourdomain.com) with password or firewall so only you can access it.

## Usage

- **Generate new password:** Creates a license key and stores its hash in Supabase. Copy the shown password and send it to the customer. They enter it in the Zagros app (must be online); the key then locks to their PC.
- **Trials:** Lists machines on 7-day trial (Machine ID = user identifier).
- **Licensed users:** Lists machines that activated a license (Machine ID and activation time).
