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

    // First load config, then initialize client
    await this.auth.initializeSupabase();
    await this.initializeSupabaseClient();

    // Restore access token if user was logged in
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken && this.supabase) {
      this.supabase.setAccessToken(storedToken);
      console.log('🔑 Access token restored from localStorage');
    }

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
      console.log('🔌 Supabase initialized:', !!this.supabase);
    }, 1000);
  }

  async initializeSupabaseClient() {
    // Wait for supabase-browser.js to load
    let attempts = 0;
    while (!window.supabase && attempts < 10) {
      console.log('⏳ Waiting for Supabase library to load...');
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.supabase) {
      console.error('❌ Supabase library not loaded');
      return;
    }

    const manifest = chrome.runtime.getManifest();
    if (manifest.supabase_config) {
      this.supabase = window.supabase.createClient(
        manifest.supabase_config.url,
        manifest.supabase_config.anon_key
      );
      console.log('✅ Supabase client initialized for side panel');
      console.log('✅ Storage API available:', typeof this.supabase.storage === 'function');
    } else {
      console.error('❌ Supabase configuration not found in manifest');
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
      // Stop timers and intervals first
      this.stopSessionTimer();
      this.stopScreenshotCapture();

      // End any active break
      if (this.isOnBreak) {
        this.endBreak();
      }

      // Stop recording - this will trigger saveCurrentChunk and saveSessionSummary
      // IMPORTANT: Don't clear sessionStartTime until after recording stops
      await this.recording.stopRecording();

      // Now clear the session state
      this.isMonitoring = false;
      this.sessionStartTime = null;

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

    // Take first screenshot immediately
    this.captureScreenshot();

    // Then take screenshot every 30 seconds
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

    // Save break session to database
    this.storage.saveBreakSession(breakDuration);

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
      this.elements.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = this.elements.loginEmail.value;
        const password = this.elements.loginPassword.value;

        try {
          await this.app.login(email, password);
        } catch (error) {
          // Show error message to user
          this.showMessage(error.message, 'error');
        }
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
    // Load Supabase configuration directly from manifest
    try {
      const manifest = chrome.runtime.getManifest();
      if (manifest.supabase_config) {
        // Create global configuration object
        window.supabaseConfig = {
          url: manifest.supabase_config.url,
          anon_key: manifest.supabase_config.anon_key
        };
        console.log('✅ Supabase configuration loaded for side panel');
      } else {
        throw new Error('Supabase configuration not found in manifest');
      }
    } catch (error) {
      console.error('❌ Failed to load Supabase configuration:', error);
    }
  }

  async login(email, password) {
    console.log('🔐 Attempting login for side panel:', email);

    if (!this.app.supabase) {
      throw new Error('Supabase not initialized');
    }

    try {
      // Authenticate with Supabase
      const manifest = chrome.runtime.getManifest();
      const supabaseUrl = manifest.supabase_config.url;
      const supabaseKey = manifest.supabase_config.anon_key;

      const loginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const authData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(authData.msg || authData.error_description || 'Login failed');
      }

      // Check if user has a profile (employee check)
      const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authData.user.id}&select=*`, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const profiles = await profileResponse.json();
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;

      // SECURITY CHECK: Block login if no employee profile exists
      if (!profile) {
        console.warn('⚠️ Login blocked: No employee profile found for', authData.user.email);
        // Sign out the user from Supabase Auth
        await fetch(`${supabaseUrl}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        throw new Error('Access denied. You are not registered as an employee. Please contact your administrator.');
      }

      // Set user data
      this.app.currentUser = authData.user;
      this.app.userRole = profile.role;

      // IMPORTANT: Set access token in Supabase client for authenticated requests
      if (this.app.supabase) {
        this.app.supabase.setAccessToken(authData.access_token);
        console.log('🔑 Access token set in Supabase client');
      }

      // Save to localStorage
      localStorage.setItem('currentUser', JSON.stringify(authData.user));
      localStorage.setItem('userRole', profile.role);
      localStorage.setItem('accessToken', authData.access_token);

      console.log('✅ Side panel login successful:', authData.user.email, 'Role:', profile.role);

      this.app.ui.showAuthenticatedView(this.app.currentUser, this.app.userRole);
      return true;

    } catch (error) {
      console.error('❌ Side panel login failed:', error);
      throw error;
    }
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
    this.isRecording = false;
    this.sessionChunks = [];
    this.currentChunkStartTime = null;
    this.CHUNK_DURATION = 5 * 60 * 1000; // 5 minutes
    this.chunkInterval = null;
  }

  async startRecording() {
    console.log('🎤 Starting audio recording in side panel');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      this.sessionChunks = [];
      this.currentChunkStartTime = Date.now();
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = async () => {
        if (this.audioChunks.length > 0) {
          await this.saveCurrentChunk();
        }

        if (this.chunkInterval) {
          clearInterval(this.chunkInterval);
          this.chunkInterval = null;
        }

        stream.getTracks().forEach(track => track.stop());
        await this.saveSessionSummary();
      };

      this.mediaRecorder.start(1000);
      this.isRecording = true;

      // Auto-save chunks every 5 minutes
      this.chunkInterval = setInterval(async () => {
        if (this.isRecording && this.audioChunks.length > 0) {
          await this.saveCurrentChunk();
          this.audioChunks = [];
          this.currentChunkStartTime = Date.now();
        }
      }, this.CHUNK_DURATION);

      console.log('✅ Recording started successfully');

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    console.log('🛑 Stopping audio recording in side panel');

    if (this.mediaRecorder && this.isRecording) {
      this.isRecording = false;

      // Return a promise that resolves when the onstop event completes
      return new Promise((resolve) => {
        const originalOnStop = this.mediaRecorder.onstop;
        this.mediaRecorder.onstop = async (event) => {
          await originalOnStop.call(this.mediaRecorder, event);
          resolve();
        };
        this.mediaRecorder.stop();
      });
    }
  }

  pauseRecording() {
    console.log('⏸️ Pausing recording for break');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.pause();
    }
  }

  resumeRecording() {
    console.log('▶️ Resuming recording after break');
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.resume();
    }
  }

  async saveCurrentChunk() {
    if (!this.app.supabase || !this.app.currentUser || this.audioChunks.length === 0) {
      console.warn('⚠️ Cannot save chunk:', {
        hasSupabase: !!this.app.supabase,
        hasUser: !!this.app.currentUser,
        chunksLength: this.audioChunks.length
      });
      return;
    }

    try {
      console.log('💾 Saving audio chunk...');

      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const chunkDuration = Math.floor((Date.now() - this.currentChunkStartTime) / 1000);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkNumber = this.sessionChunks.length + 1;
      const filename = `${this.app.currentUser.id}/chunk_${chunkNumber}_${timestamp}.webm`;

      console.log('📤 Uploading to Supabase:', filename, 'Size:', chunkBlob.size, 'bytes');

      const { data: uploadData, error: uploadError } = await this.app.supabase.storage()
        .from('audio-recordings')
        .upload(filename, chunkBlob);

      if (uploadError) {
        console.error('❌ Chunk upload error:', uploadError);
        return;
      }

      const { data: urlData } = this.app.supabase.storage()
        .from('audio-recordings')
        .getPublicUrl(filename);

      const { error: dbError } = await this.app.supabase
        .from('recording_chunks')
        .insert([{
          user_id: this.app.currentUser.id,
          organization_id: this.app.organizationId,
          session_start_time: new Date(this.app.sessionStartTime).toISOString(),
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration_seconds: chunkDuration,
          chunk_start_time: new Date(this.currentChunkStartTime).toISOString()
        }]);

      if (dbError) {
        console.error('❌ Chunk database error:', dbError);
      } else {
        this.sessionChunks.push({
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration: chunkDuration
        });
        console.log(`✅ Chunk ${chunkNumber} saved: ${chunkDuration}s`);
      }

    } catch (error) {
      console.error('❌ Save chunk error:', error);
    }
  }

  async saveSessionSummary() {
    if (!this.app.supabase || !this.app.currentUser || this.sessionChunks.length === 0) {
      console.warn('⚠️ No chunks to save or user not logged in');
      return;
    }

    if (!this.app.sessionStartTime) {
      console.warn('⚠️ Session start time not available');
      return;
    }

    try {
      const sessionStartTimeMs = this.app.sessionStartTime instanceof Date
        ? this.app.sessionStartTime.getTime()
        : new Date(this.app.sessionStartTime).getTime();

      const sessionDuration = Math.floor((Date.now() - sessionStartTimeMs) / 1000);
      const totalChunks = this.sessionChunks.length;
      const totalChunkDuration = this.sessionChunks.reduce((sum, chunk) => sum + chunk.duration, 0);

      const sessionStartISO = this.app.sessionStartTime instanceof Date
        ? this.app.sessionStartTime.toISOString()
        : new Date(this.app.sessionStartTime).toISOString();

      const { error } = await this.app.supabase
        .from('recording_sessions')
        .insert([{
          user_id: this.app.currentUser.id,
          session_start_time: sessionStartISO,
          session_end_time: new Date().toISOString(),
          total_duration_seconds: sessionDuration,
          total_chunks: totalChunks,
          total_chunk_duration_seconds: totalChunkDuration,
          chunk_files: this.sessionChunks
        }]);

      if (error) {
        console.error('❌ Session summary error:', error);
      } else {
        console.log(`✅ Session saved: ${totalChunks} chunks, ${totalChunkDuration}s audio`);
      }

    } catch (error) {
      console.error('❌ Save session summary error:', error);
    }
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
    if (!this.app.supabase || !this.app.currentUser || !dataUrl) {
      console.warn('⚠️ Cannot save screenshot: missing data');
      return;
    }

    try {
      console.log('💾 Saving screenshot to Supabase...');

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.app.currentUser.id}/screenshot_${timestamp}.png`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await this.app.supabase.storage()
        .from('screenshots')
        .upload(filename, blob, {
          contentType: 'image/png'
        });

      if (uploadError) {
        console.error('❌ Screenshot upload error:', uploadError);
        return;
      }

      // Get public URL
      const { data: urlData } = this.app.supabase.storage()
        .from('screenshots')
        .getPublicUrl(filename);

      // Get current session ID
      let sessionId = null;
      if (this.app.sessionStartTime) {
        const { data: sessions } = await this.app.supabase
          .from('recording_sessions')
          .select('id')
          .eq('user_id', this.app.currentUser.id)
          .eq('session_start_time', this.app.sessionStartTime.toISOString())
          .single();

        sessionId = sessions?.id || null;
      }

      // Save to database
      const { error: dbError } = await this.app.supabase
        .from('screenshots')
        .insert([{
          user_id: this.app.currentUser.id,
          organization_id: this.app.organizationId,
          session_id: sessionId,
          filename: filename,
          file_url: urlData.publicUrl
        }]);

      if (dbError) {
        console.error('❌ Screenshot database error:', dbError);
      } else {
        console.log('✅ Screenshot saved successfully');
      }

    } catch (error) {
      console.error('❌ Save screenshot error:', error);
    }
  }

  async loadRecordings() {
    if (!this.app.supabase || !this.app.currentUser) {
      this.app.ui.updateRecordingsCount(0);
      return;
    }

    try {
      const { data: sessions, error } = await this.app.supabase
        .from('recording_sessions')
        .select('*')
        .eq('user_id', this.app.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('❌ Load recordings error:', error);
        this.app.ui.updateRecordingsCount(0);
      } else {
        this.app.ui.updateRecordingsCount(sessions?.length || 0);
        console.log(`📁 Loaded ${sessions?.length || 0} recording sessions`);
      }

    } catch (error) {
      console.error('❌ Load recordings error:', error);
      this.app.ui.updateRecordingsCount(0);
    }
  }

  async loadScreenshots() {
    if (!this.app.supabase || !this.app.currentUser) {
      return;
    }

    try {
      const { data: screenshots, error } = await this.app.supabase
        .from('screenshots')
        .select('*')
        .eq('user_id', this.app.currentUser.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('❌ Load screenshots error:', error);
      } else {
        console.log(`🖼️ Loaded ${screenshots?.length || 0} screenshots`);
      }

    } catch (error) {
      console.error('❌ Load screenshots error:', error);
    }
  }

  async saveBreakSession(breakDuration) {
    if (!this.app.supabase || !this.app.currentUser) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await this.app.supabase
        .from('break_sessions')
        .insert([{
          user_id: this.app.currentUser.id,
          organization_id: this.app.organizationId,
          break_date: today,
          break_start_time: new Date(this.app.breakStartTime).toISOString(),
          break_end_time: new Date().toISOString(),
          break_duration_ms: breakDuration,
          session_type: 'manual'
        }]);

      if (error) {
        console.error('❌ Break session save error:', error);
      } else {
        console.log('✅ Break session saved');
      }

    } catch (error) {
      console.error('❌ Save break session error:', error);
    }
  }
}

// Initialize the side panel application
document.addEventListener('DOMContentLoaded', () => {
  console.log('🎉 Side Panel DOM loaded, initializing application...');
  window.audioRecorder = new AudioRecorder();
});