const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true; // Install when app quits

// Set update feed URL (customize based on your hosting)
// For GitHub releases, this is automatic
// For custom server, set: autoUpdater.setFeedURL('https://your-update-server.com/updates')

class AppUpdater {
  constructor(mainWindow) {
    this.mainWindow = mainWindow;
    this.setupListeners();
  }

  setupListeners() {
    // Check for updates when app starts
    autoUpdater.on('checking-for-update', () => {
      console.log('🔍 Checking for updates...');
      this.sendStatusToRenderer('Checking for updates...');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      console.log('✅ Update available:', info.version);

      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available!`,
        detail: 'Would you like to download and install it now? The app will restart after installation.',
        buttons: ['Download Update', 'Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // User clicked "Download Update"
          autoUpdater.downloadUpdate();
          this.sendStatusToRenderer('Downloading update...');
        }
      });
    });

    // No update available
    autoUpdater.on('update-not-available', (info) => {
      console.log('✅ App is up to date');
      this.sendStatusToRenderer('App is up to date');
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      console.log(`📥 Downloading update: ${percent}%`);
      this.sendStatusToRenderer(`Downloading update: ${percent}%`, percent);
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      console.log('✅ Update downloaded');

      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Update Ready',
        message: 'Update has been downloaded!',
        detail: 'The application will restart to install the update.',
        buttons: ['Restart Now', 'Restart Later'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          // User clicked "Restart Now"
          autoUpdater.quitAndInstall(false, true);
        }
      });
    });

    // Update error
    autoUpdater.on('error', (err) => {
      console.error('❌ Update error:', err);
      dialog.showMessageBox(this.mainWindow, {
        type: 'error',
        title: 'Update Error',
        message: 'Error checking for updates',
        detail: err.message
      });
    });
  }

  // Send status to renderer process (for UI display)
  sendStatusToRenderer(message, progress = null) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update-status', { message, progress });
    }
  }

  // Manually check for updates (call from menu or button)
  checkForUpdates() {
    autoUpdater.checkForUpdates();
  }

  // Check for updates on app start (with delay)
  checkForUpdatesOnStartup() {
    // Wait 5 seconds after app starts to check for updates
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000);
  }
}

module.exports = AppUpdater;
