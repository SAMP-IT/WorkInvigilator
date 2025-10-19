const { ipcRenderer } = require('electron');

// With contextIsolation: false, we can directly expose APIs on window
// No need for contextBridge - it only works when contextIsolation: true

window.electronAPI = {
  // Supabase configuration
  getSupabaseConfig: () => ipcRenderer.invoke('get-supabase-config'),

  // Backblaze configuration
  getBackblazeConfig: () => ipcRenderer.invoke('get-backblaze-config'),

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

  // Backblaze operations
  backblazeStorage: (operation, params) => ipcRenderer.invoke('backblaze-storage', operation, params),

  // Activity tracking operations
  getActiveWindow: () => ipcRenderer.invoke('get-active-window'),
  startActivityTracking: (intervalMs) => ipcRenderer.invoke('start-activity-tracking', intervalMs),
  stopActivityTracking: () => ipcRenderer.invoke('stop-activity-tracking'),
  onActiveWindowChanged: (callback) => ipcRenderer.on('active-window-changed', (event, data) => callback(data)),

  // Live streaming - Get screen sources via IPC
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),

  // Platform info
  platform: process.platform,
  isElectron: true
};
