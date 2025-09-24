// Side Panel Audio Recorder Extension - Clean Modular Version
class AudioRecorder {
  constructor() {
    // Initialize modules
    this.auth = new AuthManager(this);
    this.recording = new RecordingManager(this);
    this.ui = new UIManager(this);
    this.storage = new StorageManager(this);

    // Initialize Supabase client
    this.supabase = null;

    // Core properties
    this.currentUser = null;
    this.userRole = null;
    this.isMonitoring = false;
    this.sessionStartTime = null;
    this.sessionTimerInterval = null;
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.dailyBreakDuration = 0;
    this.breakHistory = [];

    // Screenshot properties
    this.screenshotInterval = null;
    this.isScreenshotRecording = false;

    this.initializeApp();
  }

  async initializeApp() {
    console.log('🚀 Initializing Side Panel Application...');
    this.ui.initializeElements();
    this.ui.bindEvents();

    await this.auth.initializeSupabase();

    // Initialize Supabase client for storage operations
    this.initializeSupabaseClient();

    await this.auth.checkAuthState();
    this.checkMicrophonePermission();
    this.storage.loadMonitoringState();
    this.storage.loadBreakState();
    this.storage.loadRecordings();
    this.storage.loadScreenshots();

    // Debug: Check current state after initialization
    setTimeout(() => {
      console.log('🔍 Side Panel initialization complete:');
      console.log('👤 Current user:', this.currentUser?.email);
      console.log('🎯 User role:', this.userRole);
      console.log('📊 Monitoring state:', this.isMonitoring);
    }, 1000);
  }

  initializeSupabaseClient() {
    if (window.supabaseConfig) {
      this.supabase = window.supabase.createClient(
        window.supabaseConfig.url,
        window.supabaseConfig.anon_key
      );
      console.log('✅ Supabase client initialized for side panel');
    } else {
      console.error('❌ Supabase configuration not found');
    }
  }

  async checkMicrophonePermission() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.ui.updatePermissionStatus('granted', 'Microphone access granted');
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      console.warn('⚠️ Microphone permission denied:', error);
      this.ui.updatePermissionStatus('denied', 'Microphone access required');
    }
  }

  // Authentication methods
  async login(email, password) {
    return await this.auth.login(email, password);
  }

  async logout() {
    return await this.auth.logout();
  }

  // Recording control methods
  async startMonitoring() {
    console.log('🎯 Starting monitoring session...');

    if (this.isMonitoring) {
      console.warn('⚠️ Already monitoring');
      return;
    }

    try {
      // Start recording
      await this.recording.startRecording();

      // Update state
      this.isMonitoring = true;
      this.sessionStartTime = new Date();

      // Start session timer
      this.startSessionTimer();

      // Start screenshot capture
      this.startScreenshotCapture();

      // Update UI
      this.ui.updateMonitoringState(true);
      this.ui.updateSessionStatus('online');

      // Save state
      this.storage.saveMonitoringState();

      console.log('✅ Monitoring session started successfully');
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      this.ui.showMessage('Failed to start monitoring: ' + error.message, 'error');
    }
  }

  async stopMonitoring() {
    console.log('🛑 Stopping monitoring session...');

    if (!this.isMonitoring) {
      console.warn('⚠️ Not currently monitoring');
      return;
    }

    try {
      // Stop recording
      await this.recording.stopRecording();

      // Stop timers and intervals
      this.stopSessionTimer();
      this.stopScreenshotCapture();

      // Update state
      this.isMonitoring = false;
      this.sessionStartTime = null;

      // End any active break
      if (this.isOnBreak) {
        this.endBreak();
      }

      // Update UI
      this.ui.updateMonitoringState(false);
      this.ui.updateSessionStatus('offline');

      // Save state
      this.storage.saveMonitoringState();

      console.log('✅ Monitoring session stopped successfully');
    } catch (error) {
      console.error('❌ Failed to stop monitoring:', error);
      this.ui.showMessage('Failed to stop monitoring: ' + error.message, 'error');
    }
  }

  startSessionTimer() {
    this.sessionTimerInterval = setInterval(() => {
      if (this.sessionStartTime && !this.isOnBreak) {
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        this.ui.updateSessionTimer(elapsed);
      }
    }, 1000);
  }

  stopSessionTimer() {
    if (this.sessionTimerInterval) {
      clearInterval(this.sessionTimerInterval);
      this.sessionTimerInterval = null;
    }
  }

  startScreenshotCapture() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
    }

    // Take screenshot every 30 seconds
    this.screenshotInterval = setInterval(() => {
      if (this.isMonitoring && !this.isOnBreak) {
        this.captureScreenshot();
      }
    }, 30000);
  }

  stopScreenshotCapture() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }

  async captureScreenshot() {
    try {
      // Request screenshot from background script
      const response = await chrome.runtime.sendMessage({
        action: 'captureScreenshot'
      });

      if (response && response.dataUrl) {
        await this.storage.saveScreenshot(response.dataUrl);
        this.ui.updateScreenshotStatus('captured');
        console.log('📸 Screenshot captured successfully');
      }
    } catch (error) {
      console.error('❌ Failed to capture screenshot:', error);
      this.ui.updateScreenshotStatus('failed');
    }
  }

  // Break management
  startBreak() {
    if (this.isOnBreak) {
      console.warn('⚠️ Already on break');
      return;
    }

    console.log('☕ Starting break...');
    this.isOnBreak = true;
    this.breakStartTime = new Date();

    // Pause recording but keep monitoring active
    this.recording.pauseRecording();

    // Update UI
    this.ui.updateBreakStatus(true);
    this.ui.updateSessionStatus('break');

    // Save state
    this.storage.saveBreakState();
  }

  endBreak() {
    if (!this.isOnBreak) {
      console.warn('⚠️ Not currently on break');
      return;
    }

    console.log('🔄 Ending break...');

    // Calculate break duration
    const breakDuration = Date.now() - this.breakStartTime.getTime();
    this.dailyBreakDuration += breakDuration;

    // Save break to history
    this.breakHistory.push({
      start: this.breakStartTime,
      end: new Date(),
      duration: breakDuration
    });

    // Reset break state
    this.isOnBreak = false;
    this.breakStartTime = null;

    // Resume recording if monitoring
    if (this.isMonitoring) {
      this.recording.resumeRecording();
    }

    // Update UI
    this.ui.updateBreakStatus(false);
    this.ui.updateSessionStatus(this.isMonitoring ? 'online' : 'offline');

    // Save state
    this.storage.saveBreakState();
  }

  // Utility methods
  openAdminDashboard() {
    const dashboardUrl = chrome.runtime.getURL('nextjs-dashboard/index.html');
    chrome.tabs.create({ url: dashboardUrl });
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Include all the manager classes from popup.js
// (AuthManager, UIManager, RecordingManager, StorageManager)
// For brevity, I'll include a simplified version focusing on UI updates for the side panel

class UIManager {
  constructor(app) {
    this.app = app;
    this.elements = {};
  }

  initializeElements() {
    // Get all UI elements
    this.elements = {
      // Auth elements
      authSection: document.getElementById('auth-section'),
      authForms: document.getElementById('auth-forms'),
      userInfo: document.getElementById('user-info'),
      loginForm: document.getElementById('login-form'),
      loginEmail: document.getElementById('login-email'),
      loginPassword: document.getElementById('login-password'),
      authMessage: document.getElementById('auth-message'),
      userEmail: document.getElementById('user-email'),
      userRole: document.getElementById('user-role'),
      logoutBtn: document.getElementById('logout-btn'),
      adminDashboardBtn: document.getElementById('admin-dashboard-btn'),

      // Main interface elements
      mainInterface: document.getElementById('main-interface'),
      sessionIndicator: document.getElementById('session-indicator'),
      statusText: document.getElementById('status-text'),
      recordingTime: document.getElementById('recording-time'),
      permissionStatus: document.getElementById('permission-status'),
      permissionText: document.getElementById('permission-text'),

      // Control elements
      mainToggleBtn: document.getElementById('main-toggle-btn'),
      toggleIcon: document.getElementById('toggle-icon'),
      toggleStatus: document.getElementById('toggle-status'),
      toggleSubtitle: document.getElementById('toggle-subtitle'),

      // Monitoring status
      monitoringStatus: document.getElementById('monitoring-status'),
      audioStatus: document.getElementById('audio-status'),
      screenshotStatus: document.getElementById('screenshot-status'),
      sessionTimer: document.getElementById('session-timer'),

      // Break control
      breakToggleBtn: document.getElementById('break-toggle-btn'),
      breakIcon: document.getElementById('break-icon'),
      breakText: document.getElementById('break-text'),


      // Recordings
      recordings: document.getElementById('recordings'),
      recordingsCount: document.getElementById('recordings-count'),

      // Waveform
      waveformContainer: document.getElementById('waveform-container')
    };

    console.log('🎨 UI Elements initialized for side panel');
  }

  bindEvents() {
    // Auth events
    if (this.elements.loginForm) {
      this.elements.loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = this.elements.loginEmail.value;
        const password = this.elements.loginPassword.value;
        this.app.login(email, password);
      });
    }

    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => {
        this.app.logout();
      });
    }

    if (this.elements.adminDashboardBtn) {
      this.elements.adminDashboardBtn.addEventListener('click', () => {
        this.app.openAdminDashboard();
      });
    }

    // Main toggle
    if (this.elements.mainToggleBtn) {
      this.elements.mainToggleBtn.addEventListener('click', () => {
        if (this.app.isMonitoring) {
          this.app.stopMonitoring();
        } else {
          this.app.startMonitoring();
        }
      });
    }

    // Break toggle
    if (this.elements.breakToggleBtn) {
      this.elements.breakToggleBtn.addEventListener('click', () => {
        if (this.app.isOnBreak) {
          this.app.endBreak();
        } else {
          this.app.startBreak();
        }
      });
    }


    console.log('🔗 Event listeners bound for side panel');
  }

  showAuthenticatedView(user, role) {
    if (this.elements.authForms) {
      this.elements.authForms.classList.add('hidden');
    }
    if (this.elements.userInfo) {
      this.elements.userInfo.classList.remove('hidden');
    }
    if (this.elements.mainInterface) {
      this.elements.mainInterface.classList.remove('hidden');
    }

    // Update user info
    if (this.elements.userEmail) {
      this.elements.userEmail.textContent = user.email;
    }
    if (this.elements.userRole) {
      this.elements.userRole.textContent = role.toUpperCase();
    }

    // Show admin button for admins
    if (this.elements.adminDashboardBtn && role === 'admin') {
      this.elements.adminDashboardBtn.classList.remove('hidden');
    }
  }

  showUnauthenticatedView() {
    if (this.elements.authForms) {
      this.elements.authForms.classList.remove('hidden');
    }
    if (this.elements.userInfo) {
      this.elements.userInfo.classList.add('hidden');
    }
    if (this.elements.mainInterface) {
      this.elements.mainInterface.classList.add('hidden');
    }
  }

  updateSessionStatus(status) {
    if (!this.elements.sessionIndicator) return;

    this.elements.sessionIndicator.className = `status-indicator ${status}`;

    const statusText = {
      'offline': 'Offline',
      'online': 'Recording',
      'break': 'On Break'
    };

    const indicatorText = this.elements.sessionIndicator.querySelector('.indicator-text');
    if (indicatorText) {
      indicatorText.textContent = statusText[status] || 'Unknown';
    }
  }

  updateMonitoringState(isMonitoring) {
    if (this.elements.mainToggleBtn) {
      this.elements.mainToggleBtn.className = isMonitoring ? 'toggle-btn toggle-on' : 'toggle-btn toggle-off';
    }

    if (this.elements.toggleIcon) {
      this.elements.toggleIcon.textContent = isMonitoring ? '🟢' : '🔴';
    }

    if (this.elements.toggleStatus) {
      this.elements.toggleStatus.textContent = isMonitoring ? 'Work Invigilator ON' : 'Work Invigilator OFF';
    }

    if (this.elements.toggleSubtitle) {
      this.elements.toggleSubtitle.textContent = isMonitoring ? 'Click to stop monitoring' : 'Click to start monitoring session';
    }

    // Show/hide monitoring status
    if (this.elements.monitoringStatus) {
      this.elements.monitoringStatus.classList.toggle('hidden', !isMonitoring);
    }


    // Update waveform
    if (this.elements.waveformContainer) {
      this.elements.waveformContainer.classList.toggle('recording', isMonitoring);
    }
  }

  updateBreakStatus(isOnBreak) {
    if (this.elements.breakToggleBtn) {
      this.elements.breakToggleBtn.className = isOnBreak ? 'break-toggle-btn break-on' : 'break-toggle-btn break-off';
    }

    if (this.elements.breakText) {
      this.elements.breakText.textContent = isOnBreak ? 'End Break' : 'Take Break';
    }
  }

  updateSessionTimer(elapsed) {
    if (this.elements.sessionTimer) {
      this.elements.sessionTimer.textContent = this.app.formatTime(elapsed);
    }
  }

  updatePermissionStatus(status, message) {
    if (!this.elements.permissionStatus) return;

    this.elements.permissionStatus.className = `permission-card ${status}`;

    if (this.elements.permissionText) {
      this.elements.permissionText.textContent = message;
    }

    // Show/hide based on status
    this.elements.permissionStatus.classList.toggle('hidden', status === 'granted');
  }

  updateScreenshotStatus(status) {
    if (this.elements.screenshotStatus) {
      const statusText = {
        'ready': 'Ready',
        'captured': 'Captured',
        'failed': 'Failed'
      };
      this.elements.screenshotStatus.textContent = `Screenshots: ${statusText[status] || status}`;
    }
  }

  updateRecordingsCount(count) {
    if (this.elements.recordingsCount) {
      this.elements.recordingsCount.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    }
  }

  showMessage(message, type = 'info') {
    if (this.elements.authMessage) {
      this.elements.authMessage.textContent = message;
      this.elements.authMessage.className = `auth-message ${type}`;
    }
  }
}

// Simplified versions of other managers for the side panel
class AuthManager {
  constructor(app) {
    this.app = app;
  }

  async initializeSupabase() {
    // Load Supabase configuration
    try {
      const response = await fetch(chrome.runtime.getURL('supabase-config.js'));
      const configScript = await response.text();
      eval(configScript);
      console.log('✅ Supabase configuration loaded for side panel');
    } catch (error) {
      console.error('❌ Failed to load Supabase configuration:', error);
    }
  }

  async login(email, password) {
    // Implement login logic
    console.log('🔐 Attempting login for side panel:', email);
    // Simplified for demo
    this.app.currentUser = { email };
    this.app.userRole = 'employee';
    this.app.ui.showAuthenticatedView(this.app.currentUser, this.app.userRole);
    return true;
  }

  async logout() {
    console.log('🚪 Logging out from side panel');
    this.app.currentUser = null;
    this.app.userRole = null;
    this.app.ui.showUnauthenticatedView();
  }

  async checkAuthState() {
    // Check if user is already authenticated
    console.log('🔍 Checking authentication state for side panel');
  }
}

class RecordingManager {
  constructor(app) {
    this.app = app;
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  async startRecording() {
    console.log('🎤 Starting audio recording in side panel');
    // Implement recording logic
  }

  async stopRecording() {
    console.log('🛑 Stopping audio recording in side panel');
    // Implement stop logic
  }

  pauseRecording() {
    console.log('⏸️ Pausing recording for break');
  }

  resumeRecording() {
    console.log('▶️ Resuming recording after break');
  }
}

class StorageManager {
  constructor(app) {
    this.app = app;
  }

  saveMonitoringState() {
    chrome.storage.local.set({
      isMonitoring: this.app.isMonitoring,
      sessionStartTime: this.app.sessionStartTime?.getTime()
    });
  }

  loadMonitoringState() {
    chrome.storage.local.get(['isMonitoring', 'sessionStartTime'], (result) => {
      if (result.isMonitoring) {
        this.app.isMonitoring = result.isMonitoring;
        if (result.sessionStartTime) {
          this.app.sessionStartTime = new Date(result.sessionStartTime);
        }
        this.app.ui.updateMonitoringState(this.app.isMonitoring);
      }
    });
  }

  saveBreakState() {
    chrome.storage.local.set({
      isOnBreak: this.app.isOnBreak,
      breakStartTime: this.app.breakStartTime?.getTime(),
      dailyBreakDuration: this.app.dailyBreakDuration
    });
  }

  loadBreakState() {
    chrome.storage.local.get(['isOnBreak', 'breakStartTime', 'dailyBreakDuration'], (result) => {
      if (result.isOnBreak) {
        this.app.isOnBreak = result.isOnBreak;
        if (result.breakStartTime) {
          this.app.breakStartTime = new Date(result.breakStartTime);
        }
        this.app.dailyBreakDuration = result.dailyBreakDuration || 0;
        this.app.ui.updateBreakStatus(this.app.isOnBreak);
      }
    });
  }

  async saveScreenshot(dataUrl) {
    // Save screenshot to storage
    console.log('💾 Saving screenshot in side panel');
  }

  loadRecordings() {
    // Load recordings list
    console.log('📁 Loading recordings for side panel');
    this.app.ui.updateRecordingsCount(0);
  }

  loadScreenshots() {
    // Load screenshots
    console.log('🖼️ Loading screenshots for side panel');
  }
}

// Initialize the side panel application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎉 Side Panel DOM loaded, initializing application...');
  window.audioRecorder = new AudioRecorder();
});