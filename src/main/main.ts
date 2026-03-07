require('dotenv').config()
import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { activateLicense, checkLicense, checkTrial, getMachineId, startTrial } from './license'

const isDev = process.env.VITE_DEV_SERVER_URL != null
const LICENSE_FILE = 'license.json'

const LOCAL_BUCKET_DIR = 'data'
const CONFIG_FILE = 'config.json'
const PRODUCTS_FILE = 'products.json'
const GROUPS_FILE = 'groups.json'
const RECIPES_FILE = 'buying-recipes.json'
const COMPANIES_FILE = 'companies.json'

const DATA_FILES = [PRODUCTS_FILE, GROUPS_FILE, RECIPES_FILE, COMPANIES_FILE] as const

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE)
}

function getLicensePath(): string {
  return path.join(app.getPath('userData'), LICENSE_FILE)
}

type LicenseState = { licensed?: boolean; trialEndsAt?: string }

function getLicenseState(): LicenseState {
  try {
    const p = getLicensePath()
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf-8')
      const parsed = JSON.parse(data) as LicenseState
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
  } catch {
    // ignore
  }
  return {}
}

function setLicenseState(updates: LicenseState): void {
  const p = getLicensePath()
  const dir = path.dirname(p)
  fs.mkdirSync(dir, { recursive: true })
  const next = { ...getLicenseState(), ...updates }
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
}

type Config = { dataPath?: string; printerSmall?: string; printerBig?: string }

function getConfig(): Config {
  try {
    const p = getConfigPath()
    if (fs.existsSync(p)) {
      const data = fs.readFileSync(p, 'utf-8')
      const parsed = JSON.parse(data) as Config
      return parsed && typeof parsed === 'object' ? parsed : {}
    }
  } catch {
    // ignore
  }
  return {}
}

function setConfig(updates: Partial<Config & { dataPath: string | null }>): void {
  const p = getConfigPath()
  const dir = path.dirname(p)
  fs.mkdirSync(dir, { recursive: true })
  const current = getConfig()
  const next: Config = { ...current }
  if (updates.dataPath !== undefined) next.dataPath = updates.dataPath ?? undefined
  if (updates.printerSmall !== undefined) next.printerSmall = updates.printerSmall
  if (updates.printerBig !== undefined) next.printerBig = updates.printerBig
  fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf-8')
}

function getDefaultBucketPath(): string {
  const userData = app.getPath('userData')
  return path.join(userData, LOCAL_BUCKET_DIR)
}

function getLocalBucketPath(): string {
  const config = getConfig()
  if (config.dataPath && fs.existsSync(config.dataPath)) {
    fs.mkdirSync(config.dataPath, { recursive: true })
    return config.dataPath
  }
  const bucketPath = getDefaultBucketPath()
  fs.mkdirSync(bucketPath, { recursive: true })
  return bucketPath
}

function getProductsPath(): string {
  return path.join(getLocalBucketPath(), PRODUCTS_FILE)
}

function readProducts(): unknown[] {
  try {
    const data = fs.readFileSync(getProductsPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeProducts(products: unknown[]): void {
  fs.writeFileSync(getProductsPath(), JSON.stringify(products, null, 2), 'utf-8')
}

function getGroupsPath(): string {
  return path.join(getLocalBucketPath(), GROUPS_FILE)
}

function readGroups(): unknown[] {
  try {
    const data = fs.readFileSync(getGroupsPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeGroups(groups: unknown[]): void {
  fs.writeFileSync(getGroupsPath(), JSON.stringify(groups, null, 2), 'utf-8')
}

function getRecipesPath(): string {
  return path.join(getLocalBucketPath(), RECIPES_FILE)
}

function readRecipes(): unknown[] {
  try {
    const data = fs.readFileSync(getRecipesPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeRecipes(recipes: unknown[]): void {
  fs.writeFileSync(getRecipesPath(), JSON.stringify(recipes, null, 2), 'utf-8')
}

function getCompaniesPath(): string {
  return path.join(getLocalBucketPath(), COMPANIES_FILE)
}

function readCompanies(): unknown[] {
  try {
    const data = fs.readFileSync(getCompaniesPath(), 'utf-8')
    const parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCompanies(companies: unknown[]): void {
  fs.writeFileSync(getCompaniesPath(), JSON.stringify(companies, null, 2), 'utf-8')
}

function createWindow(): void {
  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js')

  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  })

  if (isDev) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL!)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('get-local-storage-path', () => getLocalBucketPath())
  ipcMain.handle('choose-data-folder', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const opts: Electron.OpenDialogOptions = {
      title: 'Choose data folder',
      buttonLabel: 'Select folder',
      properties: ['openDirectory', 'createDirectory'],
    }
    const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    const newPath = result.filePaths[0]
    const currentPath = getLocalBucketPath()
    fs.mkdirSync(newPath, { recursive: true })
    for (const file of DATA_FILES) {
      const src = path.join(currentPath, file)
      const dest = path.join(newPath, file)
      if (fs.existsSync(src)) {
        try {
          fs.copyFileSync(src, dest)
        } catch {
          // ignore per-file errors
        }
      }
    }
    setConfig({ dataPath: newPath })
    return getLocalBucketPath()
  })
  ipcMain.handle('get-printers', async () => {
    try {
      const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
      if (!win?.webContents) return []
      const wc = win.webContents as { getPrintersAsync?: () => Promise<{ name: string; displayName?: string }[]>; getPrinters?: () => { name: string; displayName?: string }[] }
      let list: { name: string; displayName?: string }[] = []
      if (typeof wc.getPrintersAsync === 'function') {
        list = await wc.getPrintersAsync()
      } else if (typeof wc.getPrinters === 'function') {
        list = wc.getPrinters()
      }
      return Array.isArray(list) ? list.map((p) => ({ name: p.name, displayName: p.displayName ?? p.name })) : []
    } catch {
      return []
    }
  })
  ipcMain.handle('get-printer-settings', () => {
    const c = getConfig()
    return { printerSmall: c.printerSmall ?? '', printerBig: c.printerBig ?? '' }
  })
  ipcMain.handle('set-printer-settings', (_e, payload: { printerSmall?: string; printerBig?: string }) => {
    setConfig({ printerSmall: payload.printerSmall, printerBig: payload.printerBig })
    return getConfig()
  })
  ipcMain.handle('get-products', () => readProducts())
  ipcMain.handle('save-products', (_e, products: unknown[]) => {
    writeProducts(products)
    return readProducts()
  })
  /** Append one product to file (read current, append, write). Stays correct when renderer state is empty. */
  ipcMain.handle('add-product', (_e, product: unknown) => {
    const current = readProducts()
    writeProducts([...current, product])
    return readProducts()
  })
  /** Remove product by id; returns updated list. */
  ipcMain.handle('delete-product', (_e, id: string) => {
    const current = readProducts()
    const filtered = current.filter((p: unknown) => (p as { id?: string }).id !== id)
    writeProducts(filtered)
    return readProducts()
  })
  ipcMain.handle('get-groups', () => readGroups())
  ipcMain.handle('save-groups', (_e, groups: unknown[]) => {
    writeGroups(Array.isArray(groups) ? groups : [])
    return readGroups()
  })
  ipcMain.handle('add-group', (_e, group: unknown) => {
    const current = readGroups()
    writeGroups([...current, group])
    return readGroups()
  })
  ipcMain.handle('delete-group', (_e, id: string) => {
    const current = readGroups()
    const filtered = current.filter((g: unknown) => (g as { id?: string }).id !== id)
    writeGroups(filtered)
    return readGroups()
  })
  ipcMain.handle('get-recipes', () => readRecipes())
  ipcMain.handle('save-recipes', (_e, recipes: unknown[]) => {
    writeRecipes(Array.isArray(recipes) ? recipes : [])
    return readRecipes()
  })
  ipcMain.handle('add-recipe', (_e, recipe: unknown) => {
    const current = readRecipes()
    writeRecipes([...current, recipe])
    return readRecipes()
  })
  ipcMain.handle('get-companies', () => readCompanies())
  ipcMain.handle('add-company', (_e, company: unknown) => {
    const current = readCompanies()
    writeCompanies([...current, company])
    return readCompanies()
  })
  // License & trial (credentials stay in main process only)
  ipcMain.handle('get-machine-id', () => getMachineId())
  ipcMain.handle('license-get-state', () => getLicenseState())
  ipcMain.handle('license-set-licensed', () => {
    setLicenseState({ licensed: true })
    return getLicenseState()
  })
  ipcMain.handle('license-set-trial-ends-at', (_e, trialEndsAt: string) => {
    setLicenseState({ trialEndsAt })
    return getLicenseState()
  })
  ipcMain.handle('license-start-trial', (_e, machineId: string) => startTrial(machineId))
  ipcMain.handle('license-check-trial', (_e, machineId: string) => checkTrial(machineId))
  ipcMain.handle('license-activate', async (_e, key: string, machineId: string) => {
    const result = await activateLicense(key, machineId)
    if (result.ok) setLicenseState({ licensed: true })
    return result
  })
  ipcMain.handle('license-check', (_e, machineId: string) => checkLicense(machineId))
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
