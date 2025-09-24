// Main Audio Recorder Extension - Clean Modular Version
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
      console.log('🔍 Popup initialization complete:');
      console.log('👤 Current user:', this.currentUser?.email);
      console.log('👑 User role:', this.userRole);
      console.log('🔘 Admin button visible:', !document.getElementById('admin-dashboard-btn')?.classList.contains('hidden'));
    }, 1000);
  }

  async toggleMonitoring() {
    console.log('🔄 toggleMonitoring called, isMonitoring:', this.isMonitoring);

    if (this.isMonitoring) {
      console.log('🛑 Stopping monitoring...');
      await this.stopMonitoring();
    } else {
      console.log('▶️ Starting monitoring...');
      await this.startMonitoring();
    }
  }

  toggleBreak() {
    if (!this.isMonitoring) {
      this.ui.updateStatus('Start monitoring first to take breaks');
      return;
    }

    if (this.isOnBreak) {
      this.resumeFromBreak();
    } else {
      this.takeBreak();
    }
  }

  takeBreak() {
    if (this.isOnBreak) return;

    this.isOnBreak = true;
    this.breakStartTime = Date.now();

    this.recording.pauseAudioRecording();
    this.pauseScreenshotRecording();

    this.ui.updateBreakUI('paused');
    this.ui.updateStatus('☕ Break started - Monitoring paused');
    this.ui.updateAudioStatus('Paused (on break)');
    this.ui.updateScreenshotStatus('Paused (on break)');

    this.storage.saveBreakState();
  }

  async resumeFromBreak() {
    if (!this.isOnBreak) return;

    this.isOnBreak = false;
    const breakDuration = Date.now() - this.breakStartTime;

    this.dailyBreakDuration += breakDuration;
    this.breakHistory.push({
      start_time: new Date(this.breakStartTime).toISOString(),
      end_time: new Date().toISOString(),
      duration_ms: breakDuration
    });

    await this.storage.saveBreakSession(breakDuration);

    this.recording.resumeAudioRecording();
    this.resumeScreenshotRecording();

    this.ui.updateBreakUI('off');
    this.ui.updateStatus(`▶️ Break ended (${this.storage.formatDuration(breakDuration)}) - Monitoring resumed`);
    this.ui.updateAudioStatus('Recording...');
    this.ui.updateScreenshotStatus('Active (every 5s)');

    this.breakStartTime = null;
    this.storage.saveBreakState();
  }

  async startMonitoring() {
    console.log('🚀 STARTING MONITORING...');

    try {
      this.isMonitoring = true;
      this.sessionStartTime = Date.now();
      console.log('📊 Session start time set:', new Date(this.sessionStartTime).toLocaleTimeString());

      this.storage.saveMonitoringState();
      console.log('💾 Monitoring state saved');

      this.ui.updateToggleUI('on');
      this.ui.updateStatus('Work Invigilator activated - Monitoring started');
      console.log('🎛️ Toggle UI updated to ON');

      this.startSessionTimer();
      console.log('⏱️ Session timer started');

      console.log('🎤 Starting audio recording...');
      await this.recording.startAudioRecording();
      console.log('✅ Audio recording started successfully');

      console.log('📸 Starting screenshot recording...');
      this.startScreenshotRecording();
      console.log('✅ Screenshot recording started');

      console.log('👁️ Monitoring UI shown');
      console.log('🎉 MONITORING STARTED SUCCESSFULLY!');

    } catch (error) {
      console.error('❌ FAILED TO START MONITORING:', error);
      console.error('Error details:', error.message, error.stack);
      this.ui.updateStatus('Failed to start monitoring: ' + error.message);
      this.isMonitoring = false;
      this.ui.updateToggleUI('off');
      this.storage.saveMonitoringState();
    }
  }

  async stopMonitoring() {
    this.isMonitoring = false;
    this.isOnBreak = false;

    this.storage.saveMonitoringState();
    this.stopSessionTimer();
    this.recording.stopAudioRecording();
    this.stopScreenshotRecording();

    this.ui.updateToggleUI('off');
    this.ui.updateBreakUI('off');
    this.ui.updateStatus('Work Invigilator deactivated - Monitoring stopped');
  }

  startSessionTimer() {
    this.sessionTimerInterval = setInterval(() => {
      const elapsed = Date.now() - this.sessionStartTime;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      const displaySeconds = (seconds % 60).toString().padStart(2, '0');
      const displayMinutes = (minutes % 60).toString().padStart(2, '0');
      const displayHours = hours.toString().padStart(2, '0');

      if (this.ui.sessionTimer) {
        this.ui.sessionTimer.textContent = `${displayHours}:${displayMinutes}:${displaySeconds}`;
      }
    }, 1000);
  }

  stopSessionTimer() {
    if (this.sessionTimerInterval) {
      clearInterval(this.sessionTimerInterval);
      this.sessionTimerInterval = null;
    }
  }

  startScreenshotRecording() {
    if (this.isScreenshotRecording) return;

    this.isScreenshotRecording = true;
    this.captureScreenshot();

    this.screenshotInterval = setInterval(() => {
      this.captureScreenshot();
    }, 5000);

    this.ui.updateScreenshotStatus('Active (every 5s)');
  }

  pauseScreenshotRecording() {
    if (!this.isScreenshotRecording) return;

    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }

  resumeScreenshotRecording() {
    if (!this.isScreenshotRecording) return;

    if (!this.screenshotInterval) {
      this.screenshotInterval = setInterval(() => {
        this.captureScreenshot();
      }, 5000);
    }
  }

  stopScreenshotRecording() {
    if (!this.isScreenshotRecording) return;

    this.isScreenshotRecording = false;
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }

    this.ui.updateScreenshotStatus('Stopped');
  }

  async captureScreenshot() {
    try {
      const screenshotUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 80
      });

      this.saveScreenshot(screenshotUrl);

      console.log('Screenshot captured successfully');

      if (!this.isScreenshotRecording) {
        this.ui.updateStatus('Screenshot captured!');
        setTimeout(() => {
          this.ui.updateStatus('Ready to record');
        }, 2000);
      }

    } catch (error) {
      console.error('Screenshot capture failed:', error);
      this.ui.updateStatus('Screenshot failed: ' + error.message);
    }
  }

  async saveScreenshot(screenshotUrl) {
    if (!this.supabase || !this.currentUser) {
      console.warn('Supabase not initialized or user not logged in');
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.currentUser.id}/screenshot_${timestamp}.png`;

      const response = await fetch(screenshotUrl);
      const screenshotBlob = await response.blob();

      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('screenshots')
        .upload(filename, screenshotBlob);

      if (uploadError) {
        console.error('Screenshot upload error:', uploadError);
        this.ui.showToast('Failed to save screenshot', 'error');
        return;
      }

      const { data: urlData } = this.supabase.storage
        .from('screenshots')
        .getPublicUrl(filename);

      const { error: dbError } = await this.supabase
        .from('screenshots')
        .insert([{
          user_id: this.currentUser.id,
          filename: filename,
          file_url: urlData.publicUrl
        }]);

      if (dbError) {
        console.error('Screenshot database error:', dbError);
        this.ui.showToast('Screenshot uploaded but metadata not saved', 'warning');
      }

      // Screenshot successfully saved to Supabase bucket and database
      console.log('📸 Screenshot saved to Supabase:', filename);

    } catch (error) {
      console.error('Save screenshot error:', error);
      this.ui.showToast('Failed to save screenshot', 'error');
    }
  }

  playLastRecording() {
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || [];
      if (recordings.length > 0) {
        const latestRecording = recordings[0];
        const audio = new Audio(latestRecording.data);
        audio.play();
        this.ui.updateStatus('Playing last recording...');
      } else {
        this.ui.updateStatus('No recordings available');
      }
    });
  }

  async checkMicrophonePermission() {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.ui.updatePermissionStatus('unknown', '❌', 'Microphone API not supported');
        return;
      }

      const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
      this.ui.updatePermissionDisplay(permissionStatus.state);

      permissionStatus.addEventListener('change', () => {
        this.ui.updatePermissionDisplay(permissionStatus.state);
      });

    } catch (error) {
      console.warn('Could not check microphone permission:', error);
      this.ui.updatePermissionStatus('unknown', '❓', 'Permission check failed');
    }
  }

  openAdminDashboard() {
    // Open the Next.js admin dashboard
    // For development: use localhost, for production: use your domain
    const dashboardUrl = 'http://localhost:3002/login'; // Next.js Development URL
    // const dashboardUrl = 'https://your-dashboard-domain.com/login'; // Production URL
    chrome.tabs.create({ url: dashboardUrl });
  }

  hasPermission(permission) {
    if (!this.userRole) return false;

    switch (permission) {
      case 'admin':
        return this.userRole === 'admin';
      case 'monitoring':
        return ['user', 'admin'].includes(this.userRole);
      case 'screenshots':
        return ['user', 'admin'].includes(this.userRole);
      case 'audio':
        return ['user', 'admin'].includes(this.userRole);
      default:
        return false;
    }
  }

  // Add missing methods that are called by other modules
  updateAudioStatus(status) {
    console.log('🎤 Audio status update:', status);
    // You can add UI updates here if needed
  }

  updateStatus(message) {
    console.log('📊 Status update:', message);
    // You can add UI updates here if needed
  }

  updateUI(state) {
    console.log('🔄 UI update:', state);
    // You can add UI updates here if needed
  }

  initializeSupabaseClient() {
    // Create a simple HTTP-based Supabase client for file operations
    if (this.auth.supabaseUrl && this.auth.supabaseKey) {
      this.supabase = {
        storage: {
          from: (bucket) => ({
            upload: async (path, file) => {
              const formData = new FormData();
              formData.append('file', file);

              // Get the user's JWT token from localStorage
              const accessToken = localStorage.getItem('accessToken') || this.auth.supabaseKey;

              const response = await fetch(`${this.auth.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'apikey': this.auth.supabaseKey
                },
                body: formData
              });

              if (!response.ok) {
                const error = await response.json();
                return { data: null, error };
              }

              const data = await response.json();
              return { data, error: null };
            },
            getPublicUrl: (path) => ({
              data: {
                publicUrl: `${this.auth.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
              }
            })
          })
        },
        from: (table) => ({
          insert: async (data) => {
            // Get the user's JWT token
            const accessToken = localStorage.getItem('accessToken') || this.auth.supabaseKey;

            const response = await fetch(`${this.auth.supabaseUrl}/rest/v1/${table}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                'apikey': this.auth.supabaseKey,
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify(data)
            });

            if (!response.ok) {
              const error = await response.json();
              return { data: null, error };
            }

            return { data: {}, error: null };
          }
        })
      };
      console.log('✅ Supabase client initialized for storage operations');
    }
  }
}

// Load modules and initialize
document.addEventListener('DOMContentLoaded', () => {
  // Load module scripts dynamically
  const modules = [
    'js/modules/auth.js',
    'js/modules/recording.js',
    'js/modules/ui.js',
    'js/modules/storage.js'
  ];

  let loadedCount = 0;

  modules.forEach(src => {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(src);
    script.onload = () => {
      loadedCount++;
      if (loadedCount === modules.length) {
        // All modules loaded, initialize the app
        window.audioRecorder = new AudioRecorder();
      }
    };
    script.onerror = () => {
      console.error('Failed to load module:', src);
    };
    document.head.appendChild(script);
  });
});

