# System Management

Desktop application for **Windows 10 and Windows 11** only.

---

## Sync between Mac and Windows (Git)

Repo: **https://github.com/yusfrubar-sketch/zagros-system**

### On your Mac (when you change code)

1. Save your work, then in Terminal from the project folder:
   ```bash
   cd "/Users/macbookshop/Desktop/system managment/zagros-system"
   git add .
   git commit -m "Your short message"
   git push origin main
   ```
2. That’s it — your changes are on GitHub.

### On your Windows PC (get latest code)

1. **First time only** — clone the repo:
   ```bash
   git clone https://github.com/yusfrubar-sketch/zagros-system.git
   cd zagros-system
   npm install
   ```
2. **Every time before you work** — pull the latest:
   ```bash
   cd zagros-system
   git pull origin main
   ```
   If you added new dependencies on Mac, run `npm install` again after pull.

3. **Create the Windows installer** (on Windows):
   ```bash
   npm run dist
   ```
   The `.exe` will be in the **`release/`** folder.

4. **Run the app (dev):** `npm run dev`  
   **Run the app (built):** `npm run build && npm start`

### Summary

- **Mac:** you edit and push (`git add` → `git commit` → `git push`).
- **Windows:** you pull (`git pull`), then build/run or create the installer.

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
