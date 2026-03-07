import { app, BrowserWindow, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'

const isDev = process.env.VITE_DEV_SERVER_URL != null

const LOCAL_BUCKET_DIR = 'data'
const PRODUCTS_FILE = 'products.json'
const GROUPS_FILE = 'groups.json'

function getLocalBucketPath(): string {
  const userData = app.getPath('userData')
  const bucketPath = path.join(userData, LOCAL_BUCKET_DIR)
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

function createWindow(): void {
  const preloadPath = path.join(__dirname, '..', 'preload', 'preload.js')

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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
  ipcMain.handle('add-group', (_e, group: unknown) => {
    const current = readGroups()
    writeGroups([...current, group])
    return readGroups()
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
