# Deploy Zagros System to Cloudflare Pages (zagrosexpress.org)

Follow these steps to put your app online so people can open **https://zagrosexpress.org** and use it.

---

## 1. Add your domain to Cloudflare (if not already)

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Click **Add a site** and enter **zagrosexpress.org**.
3. Choose the **Free** plan.
4. Cloudflare will show you **nameservers** (e.g. `xxx.ns.cloudflare.com`).
5. At the place where you bought the domain (registrar), change the domain’s **nameservers** to the ones Cloudflare gave you.
6. Wait until Cloudflare says the site is **Active** (often 5–30 minutes).

If **zagrosexpress.org** is already in Cloudflare, skip to step 2.

---

## 2. Push your code to GitHub

1. Create a new repository on [GitHub](https://github.com/new) (e.g. `zagros-system`).
2. In your project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

   Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

---

## 3. Create a Cloudflare Pages project

1. In Cloudflare Dashboard go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Choose **GitHub** and allow Cloudflare to see your repos.
3. Select the repository that contains this project (e.g. `zagros-system`).
4. Click **Begin setup** and use:

   | Setting              | Value           |
   |----------------------|-----------------|
   | Framework preset     | **None** (important: do not pick "Vite" or "React") |
   | Project name         | `zagros-system` (or any name) |
   | Production branch   | `main`          |
   | Build command       | `npm run build:web` (must have the **colon** in `build:web`) |
   | Build output directory | `dist`     |

5. Click **Save and Deploy**. Wait for the first build to finish.
6. Your app will be live at **https://your-project.pages.dev** (or similar). Open it to confirm it works.

---

## 4. Connect your domain (zagrosexpress.org)

1. In the same **Pages** project, open **Custom domains**.
2. Click **Set up a custom domain**.
3. Enter **zagrosexpress.org** and follow the steps (Cloudflare will add the DNS records).
4. Optionally add **www.zagrosexpress.org** the same way.
5. Wait a few minutes. Then open **https://zagrosexpress.org** in your browser.

---

## 5. (Optional) Add a logo

If you want the default logo on the home screen to show:

- Put your logo file in the **`public`** folder and name it **`zagros-logo.png`**.
- Redeploy (push a new commit or trigger **Retry deployment** in the Pages project).

---

## Build failed? Check this

1. **Build command** must be exactly: `npm run build:web` (with a **colon**, not a space). Not `npm run build` and not `npm run build web`.
2. **Build output directory** must be: `dist`.
3. **Framework preset**: choose **None**. If you picked "Vite" or "React", Cloudflare may override the build command; edit the project → **Settings** → **Builds & deployments** and set the command and output directory as above.
4. **Full error**: In the build log, scroll to the bottom. The real error is usually after "Building application". Use **Download log** and look for lines with `Error` or `failed`.
5. **Node version**: The repo includes a `.nvmrc` file so Cloudflare uses Node 20. Commit and push it if the build still fails on an older Node.

---

## Summary

- **Build command:** `npm run build:web`  
- **Build output directory:** `dist`  
- **Custom domain:** zagrosexpress.org  
- After setup, people can search for your site and use it at **https://zagrosexpress.org**.
