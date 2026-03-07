/// <reference types="vite/client" />

interface ElectronAPI {
  getLocalStoragePath: () => Promise<string>
  chooseDataFolder: () => Promise<string | null>
  getPrinters: () => Promise<{ name: string; displayName: string }[]>
  getPrinterSettings: () => Promise<{ printerSmall: string; printerBig: string }>
  setPrinterSettings: (payload: { printerSmall?: string; printerBig?: string }) => Promise<unknown>
  getProducts: () => Promise<unknown[]>
  saveProducts: (products: unknown[]) => Promise<unknown[]>
  addProduct: (product: unknown) => Promise<unknown[]>
  deleteProduct: (id: string) => Promise<unknown[]>
  getGroups: () => Promise<unknown[]>
  saveGroups: (groups: unknown[]) => Promise<unknown[]>
  addGroup: (group: unknown) => Promise<unknown[]>
  deleteGroup: (id: string) => Promise<unknown[]>
  getRecipes: () => Promise<unknown[]>
  saveRecipes: (recipes: unknown[]) => Promise<unknown[]>
  addRecipe: (recipe: unknown) => Promise<unknown[]>
  getCompanies: () => Promise<unknown[]>
  addCompany: (company: unknown) => Promise<unknown[]>
  getMachineId: () => Promise<string>
  licenseGetState: () => Promise<{ licensed?: boolean; trialEndsAt?: string }>
  licenseSetLicensed: () => Promise<{ licensed?: boolean; trialEndsAt?: string }>
  licenseSetTrialEndsAt: (trialEndsAt: string) => Promise<{ licensed?: boolean; trialEndsAt?: string }>
  licenseStartTrial: (machineId: string) => Promise<{ ok: true; trialEndsAt: string } | { ok: false; error: string }>
  licenseCheckTrial: (machineId: string) => Promise<{ ok: true; valid: boolean; trialEndsAt: string } | { ok: false; error: string }>
  licenseActivate: (key: string, machineId: string) => Promise<{ ok: true } | { ok: false; error: string }>
  licenseCheck: (machineId: string) => Promise<boolean>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
