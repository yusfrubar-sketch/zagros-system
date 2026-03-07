/// <reference types="vite/client" />

interface ElectronAPI {
  getLocalStoragePath: () => Promise<string>
  getProducts: () => Promise<unknown[]>
  saveProducts: (products: unknown[]) => Promise<unknown[]>
  addProduct: (product: unknown) => Promise<unknown[]>
  deleteProduct: (id: string) => Promise<unknown[]>
  getGroups: () => Promise<unknown[]>
  addGroup: (group: unknown) => Promise<unknown[]>
}

declare global {
  interface Window {
    electron?: ElectronAPI
  }
}
