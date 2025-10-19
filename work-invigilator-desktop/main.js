const { app, BrowserWindow, ipcMain, desktopCapturer, Tray, Menu } = require('electron');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const activeWin = require('active-win');
const AppUpdater = require('./updater');

let mainWindow;
let tray;
let supabaseClient;
let activityTrackingInterval = null;
let appUpdater = null;

// Supabase configuration
const SUPABASE_CONFIG = {
  url: 'https://qqnmilkgltcooqzytkxy.supabase.co',
  anon_key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbm1pbGtnbHRjb29xenl0a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDYzODcsImV4cCI6MjA3NDE4MjM4N30.Et5msR4pTjO1jZdQ35pUeWYdXAdCbM8mjqSrzzaLAEs'
};

// Backblaze B2 configuration (hardcoded)
const BACKBLAZE_CONFIG = {
  endpoint: 's3.us-east-005.backblazeb2.com',
  region: 'us-east-005',
  keyId: '0057242535e05d00000000001',
  applicationKey: 'K005EdyoXAOL3IEstJchDkKzzM5eE+Y',
  buckets: {
    screenshots: 'workinvigilator-screenshots',
    audioRecordings: 'workinvigilator-audio-recordings'
  },
  enabled: true // Set to false to disable Backblaze and use only Supabase
};

// Initialize Supabase in main process
supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key);

// Initialize Backblaze S3 client
let s3Client = null;
if (BACKBLAZE_CONFIG.enabled && BACKBLAZE_CONFIG.keyId && BACKBLAZE_CONFIG.applicationKey) {
  s3Client = new S3Client({
    endpoint: `https://${BACKBLAZE_CONFIG.endpoint}`,
    region: BACKBLAZE_CONFIG.region,
    credentials: {
      accessKeyId: BACKBLAZE_CONFIG.keyId,
      secretAccessKey: BACKBLAZE_CONFIG.applicationKey
    }
  });
} else {
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 650,
    minWidth: 450,
    minHeight: 550,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: false, // Disabled to allow require() in renderer for WebRTC modules
      nodeIntegration: true,
      enableRemoteModule: false
    },
    icon: path.join(__dirname, 'build', 'icon.png'),
    title: 'Work Invigilator'
  });

  mainWindow.loadFile('index.html');
  
  // Create application menu
  const { Menu } = require('electron');
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Quit',
          accelerator: 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { 
          label: 'Toggle Developer Tools',
          accelerator: 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            if (appUpdater) {
              appUpdater.checkForUpdates();
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox({
              type: 'info',
              title: 'About Work Invigilator',
              message: 'Work Invigilator',
              detail: 'Version 1.0.0\nEmployee Work Session Tracker'
            });
          }
        }
      ]
    }
  ]);
  
  Menu.setApplicationMenu(menu);

  // Allow window to minimize normally
  mainWindow.on('minimize', (event) => {
    // Window minimizes to taskbar
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
  
  // Add keyboard shortcut to toggle DevTools (Ctrl+Shift+I or F12)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
  });
}

function createTray() {
  // Use a default system icon or try multiple paths
  let iconPath;
  
  // Try different icon paths
  const possiblePaths = [
    path.join(__dirname, 'build', 'icon.png'),
    path.join(__dirname, 'icons', 'icon128.png'),
    path.join(__dirname, '..', 'icons', 'icon128.png')
  ];
  
  for (const tryPath of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(tryPath)) {
        iconPath = tryPath;
        break;
      }
    } catch (e) {
      // Continue trying
    }
  }
  
  // Create tray only if icon exists
  if (!iconPath) {
    return;
  }
  
  try {
    tray = new Tray(iconPath);
  } catch (error) {
    return;
  }

  if (tray) {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show App',
        click: () => {
          mainWindow.show();
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('Work Invigilator');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      mainWindow.show();
    });
  }
}

app.whenReady().then(() => {
  createWindow();
  // Disable tray for now - Windows requires specific icon format
  // createTray();

  // Initialize auto-updater
  appUpdater = new AppUpdater(mainWindow);
  appUpdater.checkForUpdatesOnStartup();  // Check 5 seconds after startup

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// IPC Handlers

// Get Supabase configuration
ipcMain.handle('get-supabase-config', () => {
  return SUPABASE_CONFIG;
});

// Get Backblaze configuration
ipcMain.handle('get-backblaze-config', () => {
  return BACKBLAZE_CONFIG;
});

// Capture screenshot
ipcMain.handle('capture-screenshot', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail.toPNG();
      return {
        success: true,
        dataUrl: `data:image/png;base64,${screenshot.toString('base64')}`
      };
    }

    return { success: false, error: 'No screens found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get app version
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// Open external URL
ipcMain.handle('open-external', (event, url) => {
  const { shell } = require('electron');
  shell.openExternal(url);
});

// Store data (using localStorage equivalent)
ipcMain.handle('store-set', async (event, key, value) => {
  try {
    const Store = require('electron-store');
    const store = new Store();
    store.set(key, value);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('store-get', async (event, key) => {
  try {
    const Store = require('electron-store');
    const store = new Store();
    return { success: true, value: store.get(key) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('store-delete', async (event, key) => {
  try {
    const Store = require('electron-store');
    const store = new Store();
    store.delete(key);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Supabase Auth handlers
ipcMain.handle('supabase-auth', async (event, method, params) => {
  try {
    switch (method) {
      case 'signInWithPassword':
        return await supabaseClient.auth.signInWithPassword(params);
      case 'signOut':
        return await supabaseClient.auth.signOut();
      case 'getSession':
        return await supabaseClient.auth.getSession();
      default:
        return { error: { message: 'Unknown auth method' } };
    }
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// Supabase Query handlers
ipcMain.handle('supabase-query', async (event, table, operation, params) => {
  try {
    let query = supabaseClient.from(table);
    
    switch (operation) {
      case 'select':
        query = query.select(params.select || '*');
        if (params.eq) query = query.eq(params.eq.column, params.eq.value);
        if (params.single) return await query.single();
        return await query;
        
      case 'insert':
        query = query.insert(params.data).select();
        if (params.single) {
          return await query.single();
        }
        return await query;
        
      case 'update':
        query = query.update(params.data);
        if (params.eq) query = query.eq(params.eq.column, params.eq.value);
        return await query;
        
      case 'delete':
        query = query.delete();
        if (params.eq) query = query.eq(params.eq.column, params.eq.value);
        return await query;
        
      default:
        return { error: { message: 'Unknown query operation' } };
    }
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// Supabase Storage handlers
ipcMain.handle('supabase-storage', async (event, operation, params) => {
  try {
    // Create a client with user's auth token if provided
    let client = supabaseClient;
    if (params.accessToken) {
      client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anon_key, {
        global: {
          headers: {
            Authorization: `Bearer ${params.accessToken}`
          }
        }
      });
    }

    const storage = client.storage.from(params.bucket);

    switch (operation) {
      case 'upload':
        // Convert ArrayBuffer to Buffer for Supabase
        const buffer = Buffer.from(params.file);
        return await storage.upload(params.path, buffer, {
          contentType: params.path.endsWith('.png') ? 'image/png' : 'audio/webm',
          upsert: false
        });

      case 'getPublicUrl':
        const urlResult = storage.getPublicUrl(params.path);
        return urlResult;

      default:
        return { error: { message: 'Unknown storage operation' } };
    }
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// Backblaze B2 Storage handlers
ipcMain.handle('backblaze-storage', async (event, operation, params) => {
  try {
    if (!s3Client) {
      return { error: { message: 'Backblaze not configured' } };
    }

    switch (operation) {
      case 'upload':
        const buffer = Buffer.from(params.file);
        const contentType = params.path.endsWith('.png') ? 'image/png' : 'audio/webm';

        // Determine which bucket to use based on the Supabase bucket name
        const bucketName = params.bucket === 'screenshots'
          ? BACKBLAZE_CONFIG.buckets.screenshots
          : BACKBLAZE_CONFIG.buckets.audioRecordings;

        const putCommand = new PutObjectCommand({
          Bucket: bucketName,
          Key: params.path,
          Body: buffer,
          ContentType: contentType
        });

        await s3Client.send(putCommand);

        // Generate signed URL (valid for 7 days = 604800 seconds, max allowed by S3 signature v4)
        // For private buckets
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: params.path
        });

        const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 604800 });

        return {
          data: {
            path: params.path,
            publicUrl: signedUrl
          },
          error: null
        };

      default:
        return { error: { message: 'Unknown storage operation' } };
    }
  } catch (error) {
    return { error: { message: error.message } };
  }
});

// Handle app cleanup - called from renderer before app closes
ipcMain.handle('app-cleanup-complete', async () => {
  return { success: true };
});

// Activity tracking handlers

// Get current active window information
ipcMain.handle('get-active-window', async () => {
  try {
    const result = await activeWin();

    if (!result) {
      return { success: false, error: 'No active window detected' };
    }

    // Extract relevant information
    const windowInfo = {
      appName: result.owner.name || 'Unknown',
      windowTitle: result.title || '',
      processPath: result.owner.path || '',
      platform: result.platform || process.platform
    };

    // Extract URL from browser windows
    let url = null;
    let domain = null;

    // Check if it's a browser and try to extract URL from window title
    const browserApps = [
      'Google Chrome', 'Chrome', 'chrome.exe',
      'Mozilla Firefox', 'Firefox', 'firefox.exe',
      'Microsoft Edge', 'Edge', 'msedge.exe',
      'Safari',
      'Opera', 'opera.exe',
      'Brave', 'brave.exe'
    ];

    const isBrowser = browserApps.some(browser =>
      windowInfo.appName.toLowerCase().includes(browser.toLowerCase())
    );

    if (isBrowser && windowInfo.windowTitle) {
      // Try to extract URL from common browser title patterns
      // Most browsers show: "Page Title - URL" or "Page Title"
      const urlMatch = windowInfo.windowTitle.match(/(https?:\/\/[^\s]+)/i);
      if (urlMatch) {
        url = urlMatch[1];
        try {
          const urlObj = new URL(url);
          domain = urlObj.hostname;
        } catch (e) {
          // Invalid URL, ignore
        }
      }
    }

    return {
      success: true,
      data: {
        ...windowInfo,
        url,
        domain,
        isBrowser,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Start activity tracking
ipcMain.handle('start-activity-tracking', async (event, intervalMs = 10000) => {
  try {
    // Clear any existing interval
    if (activityTrackingInterval) {
      clearInterval(activityTrackingInterval);
    }

    // Start tracking at specified interval (default 10 seconds)
    activityTrackingInterval = setInterval(async () => {
      try {
        const result = await activeWin();
        if (result) {
          // Send active window data to renderer
          mainWindow.webContents.send('active-window-changed', {
            appName: result.owner.name || 'Unknown',
            windowTitle: result.title || '',
            processPath: result.owner.path || '',
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        // Ignore errors during periodic checks
      }
    }, intervalMs);

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Stop activity tracking
ipcMain.handle('stop-activity-tracking', async () => {
  try {
    if (activityTrackingInterval) {
      clearInterval(activityTrackingInterval);
      activityTrackingInterval = null;
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Live streaming - Get screen sources for WebRTC
ipcMain.handle('get-screen-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });

    // Return sources with minimal data (just what's needed for WebRTC)
    return {
      success: true,
      sources: sources.map(source => ({
        id: source.id,
        name: source.name,
        display_id: source.display_id
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

