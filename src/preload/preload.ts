import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  getLocalStoragePath: () => ipcRenderer.invoke('get-local-storage-path'),
  getProducts: () => ipcRenderer.invoke('get-products'),
  saveProducts: (products: unknown[]) => ipcRenderer.invoke('save-products', products),
  addProduct: (product: unknown) => ipcRenderer.invoke('add-product', product),
  deleteProduct: (id: string) => ipcRenderer.invoke('delete-product', id),
  getGroups: () => ipcRenderer.invoke('get-groups'),
  addGroup: (group: unknown) => ipcRenderer.invoke('add-group', group),
})
