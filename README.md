# System Management

Desktop application for **Windows 10 and Windows 11** only.

---

## Sync between Mac and Windows (Git)

**Mac side (already done):** Repo is initialized and first commit is created.

**Next — push to GitHub from Mac:**

1. Create a new repository on [GitHub](https://github.com/new) (e.g. name: `zagros-system`). Do **not** add a README or .gitignore (project already has them).
2. In Terminal on your Mac, from this project folder run:
   ```bash
   cd "/Users/macbookshop/Desktop/system managment"
   git remote add origin https://github.com/YOUR_USERNAME/zagros-system.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` and `zagros-system` with your GitHub username and repo name.

**On Windows:** Clone the repo, then open the folder in Cursor and run `npm install` and `npm run dev`.

**After that:** Use `git add .` → `git commit -m "message"` → `git push` on the machine you edited on; use `git pull` on the other before working.

---

## Target
- **OS:** Windows 10, Windows 11
- **Architecture:** 64-bit (optional 32-bit if needed later)

## When the user opens the system — main parts

1. **Selling** — Point of sale: scan barcode, add to cart, checkout, receipt/label printing.
2. **Warehouse** — Stock/inventory: products, quantities, receive goods, adjust stock, reports.
3. **Settings** — App config: language (Kurdish / Arabic / English), local vs Supabase, printer, etc.

*(Navigation: sidebar or tabs so the user can switch between Selling, Warehouse, and Settings.)*

---

## Planned features (from our discussion)
- System management (e.g. inventory / POS style)
- Modern UI (TypeScript + Electron or Tauri)
- Barcode scanner support
- User choice: **local storage** or **Supabase**
- Label printing / small printer support
- Multi-language: **Kurdish**, **Arabic**, **English** (with RTL support)

---

## Building the Windows installer (for your website)

Build the installer on a **Windows** machine (or use a Windows VM/CI) so users can download and install like normal software.

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Build the Windows installer**
   ```bash
   npm run dist
   ```

3. **Output**
   - The installer is created in the **`release/`** folder.
   - File name is like: **`Zagros System Setup 0.1.0.exe`** (or similar).
   - Upload this `.exe` to your website for users to download.

### What the user sees when installing

- **Install location** — The installer asks where to install (e.g. `C:\Program Files\Zagros System`). The user can change the folder.
- **Desktop shortcut** — After installation, a shortcut is created on the desktop so they can open the app like other software.
- **Start Menu** — A Start Menu shortcut is also created.

### Optional: add an app icon

1. Add a Windows icon file: **`build/icon.ico`** (256×256 or multi-size .ico).
2. In **`package.json`**, under `build.win` add: `"icon": "build/icon.ico"`.
3. Under `build.nsis` you can add: `"installerIcon": "build/icon.ico"`, `"uninstallerIcon": "build/icon.ico"` if you want the installer/uninstaller to use the same icon.

---

*Project folder created for the Windows desktop app.*
