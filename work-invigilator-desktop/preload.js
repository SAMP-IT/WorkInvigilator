const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Supabase configuration
  getSupabaseConfig: () => ipcRenderer.invoke('get-supabase-config'),

  // Screenshot capture
  captureScreenshot: () => ipcRenderer.invoke('capture-screenshot'),

  // App version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Open external URL
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Storage operations
  storeSet: (key, value) => ipcRenderer.invoke('store-set', key, value),
  storeGet: (key) => ipcRenderer.invoke('store-get', key),
  storeDelete: (key) => ipcRenderer.invoke('store-delete', key),

  // Supabase operations
  supabaseAuth: (method, params) => ipcRenderer.invoke('supabase-auth', method, params),
  supabaseQuery: (table, operation, params) => ipcRenderer.invoke('supabase-query', table, operation, params),
  supabaseStorage: (operation, params) => ipcRenderer.invoke('supabase-storage', operation, params),

  // Platform info
  platform: process.platform,
  isElectron: true
});

console.log('✅ Preload script loaded');

