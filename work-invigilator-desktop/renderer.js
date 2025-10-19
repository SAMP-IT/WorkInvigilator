// Work Invigilator Desktop - Renderer Process
// Adapted from the Chrome extension sidepanel

class WorkInvigilatorApp {
  constructor() {
    this.supabase = null;
    this.currentUser = null;
    this.userRole = null;
    this.organizationId = null;
    this.isMonitoring = false;
    this.sessionStartTime = null;
    this.currentSessionId = null;
    this.sessionTimerInterval = null;
    this.isOnBreak = false;
    this.breakStartTime = null;
    this.dailyBreakDuration = 0;
    this.breakHistory = [];
    this.breakTimerInterval = null;
    this.totalWorkTime = 0;
    this.totalBreakTime = 0;

    // Recording
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.sessionChunks = [];
    this.currentChunkStartTime = null;
    this.CHUNK_DURATION = 5 * 60 * 1000; // 5 minutes
    this.chunkInterval = null;
    this.isStoppingForChunk = false;

    // Live Streaming
    this.liveStreamManager = null;
    this.isLiveStreaming = false;

    // Microphone mute detection
    this.audioContext = null;
    this.analyser = null;
    this.micMonitorInterval = null;
    this.silenceStartTime = null;
    this.isMuted = false;
    this.currentMuteEventId = null;
    this.SILENCE_THRESHOLD = 0.0001; // Near-zero threshold for complete audio failure (0.0 - 1.0)
    this.SILENCE_DURATION = 15000; // 15 seconds of complete silence triggers mute event (reduced from 60s)
    this.consecutiveZeroReadings = 0; // Count consecutive zero readings
    this.ZERO_READINGS_THRESHOLD = 5; // 5 consecutive zero readings to confirm mute (reduced from 10)
    this.audioDeviceCheckInterval = null;
    
    // Screenshot
    this.screenshotInterval = null;

    // Activity tracking
    this.activityTrackingEnabled = true; // Enable by default
    this.activityBuffer = []; // Buffer to batch activity logs
    this.ACTIVITY_BUFFER_SIZE = 30; // Send every 30 logs (5 minutes at 10s interval)
    this.ACTIVITY_SYNC_INTERVAL = 5 * 60 * 1000; // Sync every 5 minutes regardless
    this.activitySyncInterval = null;

    // Attendance tracking
    this.currentAttendanceId = null;
    this.lastActivityTime = null;
    this.idleCheckInterval = null;
    this.IDLE_THRESHOLD = 3 * 60 * 1000; // 3 minutes of inactivity = idle (DeskTime standard)
    this.currentIdlePeriodId = null;
    this.idleStartTime = null;
    this.isIdle = false; // Track idle state

    // UI Elements
    this.elements = {};

    this.init();
  }
  
  async   init() {
    // Initialize UI
    this.initializeElements();
    this.bindEvents();
    
    // Initialize Supabase
    await this.initializeSupabase();
    
    // Check authentication
    await this.checkAuthState();
    
    // Check microphone permission
    this.checkMicrophonePermission();
    
    // Handle app closing - ensure sessions are properly ended
    window.addEventListener('beforeunload', async (e) => {
      if (this.isMonitoring) {
        e.preventDefault();
        await this.stopMonitoring();
      }
    });
  }
  
  initializeElements() {
    this.elements = {
      // Auth
      authForms: document.getElementById('auth-forms'),
      userInfo: document.getElementById('user-info'),
      loginForm: document.getElementById('login-form'),
      loginEmail: document.getElementById('login-email'),
      loginPassword: document.getElementById('login-password'),
      authMessage: document.getElementById('auth-message'),
      userEmail: document.getElementById('user-email'),
      userRole: document.getElementById('user-role'),
      logoutBtn: document.getElementById('logout-btn'),
      
      // Main interface
      mainInterface: document.getElementById('main-interface'),
      sessionIndicator: document.getElementById('session-indicator'),
      mainToggleBtn: document.getElementById('main-toggle-btn'),
      toggleIcon: document.getElementById('toggle-icon'),
      toggleStatus: document.getElementById('toggle-status'),
      toggleSubtitle: document.getElementById('toggle-subtitle'),
      
      // Monitoring
      monitoringStatus: document.getElementById('monitoring-status'),
      audioStatus: document.getElementById('audio-status'),
      screenshotStatus: document.getElementById('screenshot-status'),
      sessionTimer: document.getElementById('session-timer'),
      statusText: document.getElementById('status-text'),
      
      // Break
      breakToggleBtn: document.getElementById('break-toggle-btn'),
      breakIcon: document.getElementById('break-icon'),
      breakText: document.getElementById('break-text'),
      breakTimerDisplay: document.getElementById('break-timer-display'),
      breakTimer: document.getElementById('break-timer'),

      // Work Stats
      totalWorkTime: document.getElementById('total-work-time'),
      totalBreakTime: document.getElementById('total-break-time'),

      // Other
      permissionStatus: document.getElementById('permission-status'),
      permissionText: document.getElementById('permission-text')
    };
  }
  
  bindEvents() {
    // Login form
    this.elements.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.login();
    });
    
    // Logout button
    if (this.elements.logoutBtn) {
      this.elements.logoutBtn.addEventListener('click', () => {
        this.logout();
      });
    }
    
    // Main toggle button
    this.elements.mainToggleBtn.addEventListener('click', async () => {
      if (this.isMonitoring) {
        await this.stopMonitoring();
      } else {
        await this.startMonitoring();
      }
    });
    
    // Break toggle button
    this.elements.breakToggleBtn.addEventListener('click', () => {
      if (this.isOnBreak) {
        this.endBreak();
      } else {
        this.startBreak();
      }
    });
  }
  
  async initializeSupabase() {
    try {
      // Get Backblaze config
      const backblazeConfig = await window.electronAPI.getBackblazeConfig();
      this.backblazeEnabled = backblazeConfig?.enabled || false;

      // Create a wrapper around IPC calls to Supabase
      this.supabase = {
        auth: {
          signInWithPassword: async (credentials) => {
            return await window.electronAPI.supabaseAuth('signInWithPassword', credentials);
          },
          signOut: async () => {
            return await window.electronAPI.supabaseAuth('signOut');
          },
          getSession: async () => {
            return await window.electronAPI.supabaseAuth('getSession');
          },
          setSession: async (session) => {
            // In main process architecture, we don't need to set session manually
            // Session is managed by the main process
            return { data: { session }, error: null };
          }
        },
        from: (table) => ({
          select: (columns = '*') => ({
            eq: (column, value) => ({
              single: async () => {
                return await window.electronAPI.supabaseQuery(table, 'select', {
                  select: columns,
                  eq: { column, value },
                  single: true
                });
              },
              then: async (resolve) => {
                const result = await window.electronAPI.supabaseQuery(table, 'select', {
                  select: columns,
                  eq: { column, value }
                });
                return resolve(result);
              }
            }),
            then: async (resolve) => {
              const result = await window.electronAPI.supabaseQuery(table, 'select', {
                select: columns
              });
              return resolve(result);
            }
          }),
          insert: (data) => ({
            select: () => ({
              single: async () => {
                return await window.electronAPI.supabaseQuery(table, 'insert', { 
                  data,
                  single: true 
                });
              },
              then: async (resolve) => {
                const result = await window.electronAPI.supabaseQuery(table, 'insert', { data });
                return resolve(result);
              }
            }),
            then: async (resolve) => {
              const result = await window.electronAPI.supabaseQuery(table, 'insert', { data });
              return resolve(result);
            }
          }),
          update: (data) => ({
            eq: (column, value) => ({
              then: async (resolve) => {
                const result = await window.electronAPI.supabaseQuery(table, 'update', {
                  data,
                  eq: { column, value }
                });
                return resolve(result);
              }
            })
          })
        }),
        storage: {
          from: (bucket) => ({
            upload: async (path, file) => {
              // Get access token from storage
              const tokenResult = await window.electronAPI.storeGet('accessToken');
              const accessToken = tokenResult.success ? tokenResult.value : null;
              return await window.electronAPI.supabaseStorage('upload', { bucket, path, file, accessToken });
            },
            getPublicUrl: async (path) => {
              const result = await window.electronAPI.supabaseStorage('getPublicUrl', { bucket, path });
              return result.data; // Returns { publicUrl: 'url' }
            }
          })
        }
      };

    } catch (error) {
      this.showMessage('Failed to initialize database connection', 'error');
    }
  }
  
  async checkAuthState() {
    try {
      // Try to restore session from storage
      const result = await window.electronAPI.storeGet('currentUser');
      
      if (result.success && result.value) {
        const storedUser = result.value;
        const tokenResult = await window.electronAPI.storeGet('accessToken');
        const roleResult = await window.electronAPI.storeGet('userRole');
        const orgResult = await window.electronAPI.storeGet('organizationId');
        
        if (tokenResult.success && tokenResult.value) {
          this.currentUser = storedUser;
          this.userRole = roleResult.value;
          this.organizationId = orgResult.value;
          
          this.showAuthenticatedView();
          
          // Refresh token immediately to ensure it's valid
          await this.refreshAuthToken();
          
          // Start token refresh timer (refresh every 50 minutes)
          this.startTokenRefresh();
          
          // Load monitoring state
          await this.loadMonitoringState();
          
          return;
        }
      }
    } catch (error) {
    }
    
    // Show login form
    this.showUnauthenticatedView();
  }
  
  startTokenRefresh() {
    // Clear any existing refresh timer
    if (this.tokenRefreshTimer) {
      clearInterval(this.tokenRefreshTimer);
    }
    
    // Refresh token every 50 minutes (tokens expire after 60 minutes)
    this.tokenRefreshTimer = setInterval(async () => {
      await this.refreshAuthToken();
    }, 50 * 60 * 1000); // 50 minutes in milliseconds
  }
  
  async refreshAuthToken() {
    try {
      // Get current session
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session) {
        // Store new access token
        await window.electronAPI.storeSet('accessToken', data.session.access_token);
        await window.electronAPI.storeSet('refreshToken', data.session.refresh_token);
      } else {
        // Force logout if no session
        await this.logout();
      }
    } catch (error) {
      // If refresh fails, logout the user
      await this.logout();
    }
  }
  
  async login() {
    const email = this.elements.loginEmail.value.trim();
    const password = this.elements.loginPassword.value;
    
    if (!email || !password) {
      this.showMessage('Please enter email and password', 'error');
      return;
    }
    
    if (!this.supabase) {
      this.showMessage('Database connection not ready. Please wait...', 'error');
      return;
    }
    
    try {
      this.showMessage('Logging in...', 'info');
      
      // Sign in with Supabase
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      // Check if user has a profile
      const { data: profile, error: profileError } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError || !profile) {
        await this.supabase.auth.signOut();
        throw new Error('Access denied. You are not registered as an employee.');
      }
      
      // Store user data
      this.currentUser = data.user;
      this.userRole = profile.role;
      this.organizationId = profile.organization_id;
      
      // Save to storage
      await window.electronAPI.storeSet('currentUser', data.user);
      await window.electronAPI.storeSet('userRole', profile.role);
      await window.electronAPI.storeSet('organizationId', profile.organization_id);
      await window.electronAPI.storeSet('accessToken', data.session.access_token);
      await window.electronAPI.storeSet('refreshToken', data.session.refresh_token);
      
      this.showAuthenticatedView();
      
      // Start token refresh timer
      this.startTokenRefresh();
      
    } catch (error) {
      this.showMessage(error.message || 'Login failed', 'error');
    }
  }
  
  async logout() {
    try {
      
      // Stop monitoring if active - this will properly end the session in DB
      if (this.isMonitoring) {
        await this.stopMonitoring();
      }
      
      // Clear token refresh timer
      if (this.tokenRefreshTimer) {
        clearInterval(this.tokenRefreshTimer);
        this.tokenRefreshTimer = null;
      }
      
      // Sign out from Supabase
      await this.supabase.auth.signOut();
      
      // Clear storage
      await window.electronAPI.storeDelete('currentUser');
      await window.electronAPI.storeDelete('userRole');
      await window.electronAPI.storeDelete('organizationId');
      await window.electronAPI.storeDelete('accessToken');
      await window.electronAPI.storeDelete('refreshToken');
      await window.electronAPI.storeDelete('isMonitoring');
      await window.electronAPI.storeDelete('sessionStartTime');
      await window.electronAPI.storeDelete('currentSessionId');
      
      // Clear state
      this.currentUser = null;
      this.userRole = null;
      this.organizationId = null;
      this.isMonitoring = false;
      this.sessionStartTime = null;
      this.currentSessionId = null;
      
      this.showUnauthenticatedView();
      
      
    } catch (error) {
    }
  }
  
  showAuthenticatedView() {
    if (this.elements.authForms) {
      this.elements.authForms.classList.add('hidden');
    }
    if (this.elements.userInfo) {
      this.elements.userInfo.classList.remove('hidden');
    }
    if (this.elements.mainInterface) {
      this.elements.mainInterface.classList.remove('hidden');
    }
    
    if (this.elements.userEmail) {
      this.elements.userEmail.textContent = this.currentUser.email;
    }
    if (this.elements.userRole) {
      this.elements.userRole.textContent = this.userRole.toUpperCase();
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
  
  showMessage(message, type = 'info') {
    this.elements.authMessage.textContent = message;
    this.elements.authMessage.className = `auth-message ${type}`;
    this.elements.authMessage.style.display = 'block';
    
    setTimeout(() => {
      this.elements.authMessage.style.display = 'none';
    }, 5000);
  }
  
  async startMonitoring() {
    if (this.isMonitoring) return;

    try {
      // Update UI immediately to show "Starting..." state
      this.updateMonitoringUI(true, 'starting');

      this.sessionStartTime = new Date();

      const { data: sessionData, error: sessionError } = await this.supabase
        .from('recording_sessions')
        .insert([{
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_start_time: this.sessionStartTime.toISOString(),
          session_end_time: null,
          total_duration_seconds: 0,
          total_chunks: 0,
          total_chunk_duration_seconds: 0,
          chunk_files: []
        }])
        .select()
        .single();

      if (sessionError) {
        throw sessionError;
      }

      // Extract session ID (handle both array and object responses)
      const session = Array.isArray(sessionData) ? sessionData[0] : sessionData;
      this.currentSessionId = session?.id;

      if (!this.currentSessionId) {
        throw new Error('Failed to get session ID from database');
      }


      // Start recording
      await this.startRecording();

      // Update state
      this.isMonitoring = true;
      this.startSessionTimer();
      this.startScreenshotCapture();

      // Start activity tracking
      if (this.activityTrackingEnabled) {
        await this.startActivityTracking();
      }

      // Auto clock-in for attendance
      await this.autoClockIn();

      // Start idle detection
      this.startIdleDetection();

      // Update UI to active state
      this.updateMonitoringUI(true, 'active');

      // Save state
      await this.saveMonitoringState();

      // Start live streaming in background (non-blocking) - this is slow
      this.initializeLiveStreamInBackground();

    } catch (error) {
      this.showMessage('Failed to start session: ' + error.message, 'error');
      this.updateMonitoringUI(false);
    }
  }

  async initializeLiveStreamInBackground() {
    // Run live streaming initialization in background without blocking UI
    try {
      await this.initializeLiveStream();
      await this.startLiveStreaming();
      console.log('✅ Live streaming initialized in background');
    } catch (error) {
      console.error('Failed to initialize live streaming (non-critical):', error);
      // Don't fail the entire session if live streaming fails
    }
  }
  
  async stopMonitoring() {
    if (!this.isMonitoring) return;

    try {
      // Update UI immediately to show "Stopping..." state
      this.updateMonitoringUI(true, 'stopping');

      const sessionEndTime = new Date();
      const sessionDuration = Math.floor((sessionEndTime - this.sessionStartTime) / 1000);

      // Stop recording first
      await this.stopRecording();

      // Stop timers
      this.stopSessionTimer();
      this.stopScreenshotCapture();

      // Stop activity tracking and sync remaining logs
      if (this.activityTrackingEnabled) {
        await this.stopActivityTracking();
      }

      // Stop idle detection
      this.stopIdleDetection();

      // Auto clock-out for attendance
      await this.autoClockOut();

      // End any active break
      if (this.isOnBreak) {
        await this.endBreak();
      }

      // Update session record in database
      if (this.currentSessionId) {
        const { data: updateData, error: updateError } = await this.supabase
          .from('recording_sessions')
          .update({
            session_end_time: sessionEndTime.toISOString(),
            total_duration_seconds: sessionDuration,
            total_chunks: this.sessionChunks.length,
            total_chunk_duration_seconds: this.sessionChunks.reduce((sum, c) => sum + c.duration, 0),
            chunk_files: this.sessionChunks
          })
          .eq('id', this.currentSessionId);

        if (updateError) {
          this.showMessage('Warning: Session end time was not saved to database', 'warning');
        } else {
        }
      } else {
      }

      // Clear state
      this.isMonitoring = false;
      this.sessionStartTime = null;
      this.currentSessionId = null;
      this.sessionChunks = [];
      this.totalWorkTime = 0;
      this.totalBreakTime = 0;

      // Update UI to stopped state
      this.updateMonitoringUI(false);

      // Save state to storage
      await this.saveMonitoringState();

      // Disconnect from live streaming in background (non-blocking)
      this.disconnectLiveStreamingInBackground();

    } catch (error) {
      this.showMessage('Error stopping session: ' + error.message, 'error');
      this.updateMonitoringUI(false);
    }
  }

  async stopLiveStreamingInBackground() {
    // Run live streaming cleanup in background without blocking UI
    try {
      await this.stopLiveStreaming();
      console.log('✅ Live streaming stopped in background');
    } catch (error) {
      console.error('Failed to stop live streaming (non-critical):', error);
    }
  }

  async disconnectLiveStreamingInBackground() {
    // Run live streaming disconnect in background without blocking UI
    try {
      if (this.liveStreamManager) {
        await this.liveStreamManager.disconnect();
        this.liveStreamManager = null;
        this.isLiveStreaming = false;
        console.log('🔌 Disconnected from Supabase Realtime');
      }
    } catch (error) {
      console.error('Failed to disconnect live streaming (non-critical):', error);
    }
  }
  
  async startRecording() {
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

        // Only clear interval and stop tracks if this is a final stop (not a chunk save)
        if (!this.isStoppingForChunk) {
          if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
          }

          stream.getTracks().forEach(track => track.stop());
        } else {
          // Reset flag and restart recording for next chunk
          this.isStoppingForChunk = false;
          this.audioChunks = [];
          this.currentChunkStartTime = Date.now();

          // Restart recording immediately
          if (this.mediaRecorder) {
            this.mediaRecorder.start();
          }
        }
      };

      // Start recording without timeslice to get complete WebM files
      this.mediaRecorder.start();

      // Auto-save chunks every 5 minutes by stopping and restarting
      this.chunkInterval = setInterval(async () => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          // Set flag to indicate this is a chunk save, not final stop
          this.isStoppingForChunk = true;
          // Stop will trigger onstop which saves the chunk and restarts
          this.mediaRecorder.stop();
        }
      }, this.CHUNK_DURATION);

      // Start microphone mute detection
      await this.startMicrophoneMonitoring(stream);

    } catch (error) {
      throw error;
    }
  }
  
  async stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      return new Promise((resolve) => {
        // Ensure this is treated as a final stop, not a chunk save
        this.isStoppingForChunk = false;

        this.mediaRecorder.onstop = async (event) => {
          if (this.audioChunks.length > 0) {
            await this.saveCurrentChunk();
          }

          if (this.chunkInterval) {
            clearInterval(this.chunkInterval);
            this.chunkInterval = null;
          }

          this.mediaRecorder.stream.getTracks().forEach(track => {
            track.stop();
          });

          // Stop microphone monitoring
          this.stopMicrophoneMonitoring();

          resolve();
        };

        this.mediaRecorder.stop();
      });
    }
  }

  async startMicrophoneMonitoring(stream) {
    try {
      // Create audio context and analyser
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect microphone stream to analyser
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // Perform initial check after a short delay to allow audio context to initialize
      setTimeout(() => {
        this.checkMicrophoneLevel();
      }, 1000);

      // Monitor audio levels every 500ms for faster detection
      this.micMonitorInterval = setInterval(() => {
        this.checkMicrophoneLevel();
      }, 500);

      // Monitor for audio device changes (disconnection)
      this.startAudioDeviceMonitoring();

    } catch (error) {
    }
  }

  startAudioDeviceMonitoring() {
    // Listen for device changes
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', () => {
        this.checkAudioDeviceStatus();
      });
    }

    // Periodically check if audio track is still alive
    this.audioDeviceCheckInterval = setInterval(() => {
      this.checkAudioDeviceStatus();
    }, 5000); // Check every 5 seconds
  }

  async checkAudioDeviceStatus() {
    try {
      const stream = this.mediaRecorder?.stream;
      const audioTrack = stream?.getAudioTracks()[0];

      if (!audioTrack) {
        // No audio track - device disconnected
        if (!this.isMuted) {
          this.isMuted = true;
          this.handleMuteDetected('no_audio_device', 0);
        }
        return;
      }

      // Check if track ended (device unplugged)
      if (audioTrack.readyState === 'ended') {
        if (!this.isMuted) {
          this.isMuted = true;
          this.handleMuteDetected('no_audio_device', 0);
        }
      }
    } catch (error) {
    }
  }

  async stopMicrophoneMonitoring() {
    if (this.micMonitorInterval) {
      clearInterval(this.micMonitorInterval);
      this.micMonitorInterval = null;
    }

    if (this.audioDeviceCheckInterval) {
      clearInterval(this.audioDeviceCheckInterval);
      this.audioDeviceCheckInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.analyser = null;
    this.silenceStartTime = null;
    this.isMuted = false;
    this.consecutiveZeroReadings = 0;

    // If there's an active mute event, end it
    if (this.currentMuteEventId) {
      await this.endMuteEvent();
    } else if (this.currentSessionId) {
      // Fallback: Check for any active mute events for this session and close them
      await this.closeActiveMuteEventsForSession();
    }
  }

  async closeActiveMuteEventsForSession() {
    if (!this.supabase || !this.currentSessionId) return;

    try {
      // Find any active mute events for this session (mute_end_time is null)
      // Note: We'll filter for null values on the client side since .is() is not supported
      const { data: allMutes } = await this.supabase
        .from('mute_events')
        .select('id, mute_start_time, mute_end_time')
        .eq('session_id', this.currentSessionId);

      if (allMutes && allMutes.length > 0) {
        // Filter for active mutes (mute_end_time is null)
        const activeMutes = allMutes.filter(mute => mute.mute_end_time === null);
        
        if (activeMutes.length > 0) {
          const muteEndTime = new Date().toISOString();

          // Close all active mute events
          for (const mute of activeMutes) {
            const durationSeconds = Math.floor(
              (new Date(muteEndTime) - new Date(mute.mute_start_time)) / 1000
            );

            await this.supabase
              .from('mute_events')
              .update({
                mute_end_time: muteEndTime,
                duration_seconds: durationSeconds
              })
              .eq('id', mute.id);
          }
          
        }
      }
    } catch (error) {
    }
  }

  async checkMicrophoneLevel() {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume (0-255 range)
    const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
    const normalizedLevel = average / 255; // Normalize to 0.0 - 1.0

    // Check if microphone track is disabled or muted
    const stream = this.mediaRecorder?.stream;
    const audioTrack = stream?.getAudioTracks()[0];

    if (!audioTrack) {
      // No audio track available - microphone disconnected
      if (!this.isMuted) {
        this.isMuted = true;
        this.handleMuteDetected('no_audio_device', 0);
      }
      return;
    }

    const isTrackEnabled = audioTrack.enabled;
    const isMutedByTrack = audioTrack.muted; // Hardware/OS level mute

    // Detect track disabled (software mute or headset button)
    if (!isTrackEnabled) {
      if (!this.isMuted) {
        this.isMuted = true;
        this.handleMuteDetected('track_disabled', normalizedLevel);
      }
      return;
    }

    // Detect hardware/OS mute
    if (isMutedByTrack) {
      if (!this.isMuted) {
        this.isMuted = true;
        this.handleMuteDetected('hardware_mute', normalizedLevel);
      }
      return;
    }

    // Detect complete audio failure (near-zero audio consistently)
    if (normalizedLevel < this.SILENCE_THRESHOLD) {
      this.consecutiveZeroReadings++;

      // If we have enough consecutive zero readings, start tracking silence duration
      if (this.consecutiveZeroReadings >= this.ZERO_READINGS_THRESHOLD) {
        if (!this.silenceStartTime) {
          this.silenceStartTime = Date.now();
        }

        const silenceDuration = Date.now() - this.silenceStartTime;

        // If complete silence exceeds threshold and not already in mute state
        if (silenceDuration >= this.SILENCE_DURATION && !this.isMuted) {
          this.isMuted = true;
          this.handleMuteDetected('complete_silence', normalizedLevel);
        }
      }
    } else {
      // Audio detected - reset counters
      this.consecutiveZeroReadings = 0;

      if (this.silenceStartTime) {
        this.silenceStartTime = null;
      }

      // If was muted, mark as unmuted and end the event
      if (this.isMuted) {
        this.isMuted = false;
        await this.endMuteEvent();

        // Reset the mute event ID so next mute creates a NEW event
        this.currentMuteEventId = null;
      }
    }
  }

  async handleMuteDetected(detectionType, audioLevel) {
    try {
      
      // Create mute event in database
      const { data: muteEvent, error } = await this.supabase
        .from('mute_events')
        .insert({
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_id: this.currentSessionId,
          mute_start_time: new Date().toISOString(),
          detection_type: detectionType,
          audio_level: audioLevel
        })
        .select()
        .single();

      if (error) {
        return;
      }

      this.currentMuteEventId = muteEvent.id;

      // Note: We don't auto-pause the session anymore, just log the mute event
      // The recording continues, but the mute event is tracked in the database

    } catch (error) {
    }
  }

  async endMuteEvent() {
    if (!this.currentMuteEventId) return;

    try {
      const muteEndTime = new Date().toISOString();

      // Get the mute start time to calculate duration
      const { data: muteEvent } = await this.supabase
        .from('mute_events')
        .select('mute_start_time')
        .eq('id', this.currentMuteEventId)
        .single();

      if (muteEvent) {
        const durationSeconds = Math.floor(
          (new Date(muteEndTime) - new Date(muteEvent.mute_start_time)) / 1000
        );

        // Update mute event with end time
        await this.supabase
          .from('mute_events')
          .update({
            mute_end_time: muteEndTime,
            duration_seconds: durationSeconds
          })
          .eq('id', this.currentMuteEventId);
      }

      this.currentMuteEventId = null;
    } catch (error) {
    }
  }
  
  async saveCurrentChunk() {

    if (!this.supabase || !this.currentUser || this.audioChunks.length === 0) {
      return;
    }

    try {
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

      const arrayBuffer = await chunkBlob.arrayBuffer();

      const chunkDuration = Math.floor((Date.now() - this.currentChunkStartTime) / 1000);
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const chunkNumber = this.sessionChunks.length + 1;
      const userEmail = this.currentUser.email || this.currentUser.id;
      const filename = `${userEmail}/${date}/${time}_chunk_${chunkNumber}.webm`;

      let fileUrl = null;

      // Upload to Backblaze only
      if (this.backblazeEnabled) {
        try {
          const { data: backblazeData, error: backblazeError } = await window.electronAPI.backblazeStorage('upload', {
            bucket: 'audio-recordings',
            path: filename,
            file: arrayBuffer
          });

          if (!backblazeError && backblazeData) {
            fileUrl = backblazeData.publicUrl;
            console.log('✅ Audio chunk uploaded to Backblaze');
          } else {
            console.error('Failed to upload audio chunk to Backblaze:', backblazeError);
            return;
          }
        } catch (error) {
          console.error('Error uploading audio chunk:', error);
          return;
        }
      } else {
        console.warn('⚠️ Backblaze is not enabled. Audio chunk not saved.');
        return;
      }

      // Save to database
      const dbRecord = {
        user_id: this.currentUser.id,
        organization_id: this.organizationId,
        session_start_time: this.sessionStartTime ? this.sessionStartTime.toISOString() : new Date().toISOString(),
        chunk_number: chunkNumber,
        filename: filename,
        file_url: fileUrl,
        backup_file_url: null,
        storage_provider: 'backblaze',
        duration_seconds: chunkDuration,
        chunk_start_time: new Date(this.currentChunkStartTime).toISOString()
      };

      const { error: dbError } = await this.supabase
        .from('recording_chunks')
        .insert([dbRecord]);

      if (!dbError) {
        this.sessionChunks.push({
          chunk_number: chunkNumber,
          filename: filename,
          file_url: fileUrl,
          duration: chunkDuration
        });
      }

    } catch (error) {
      // Error saving chunk
    }
  }
  
  startBreak() {
    if (!this.isMonitoring || this.isOnBreak) return;

    this.isOnBreak = true;
    this.breakStartTime = new Date();

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }

    // Start break timer
    this.startBreakTimer();

    this.updateBreakUI(true);
  }
  
  async endBreak() {
    if (!this.isOnBreak) return;

    const breakDuration = Date.now() - this.breakStartTime.getTime();
    this.dailyBreakDuration += breakDuration;
    this.totalBreakTime += breakDuration;

    // Stop break timer
    this.stopBreakTimer();

    // Save break session
    await this.supabase
      .from('break_sessions')
      .insert([{
        user_id: this.currentUser.id,
        organization_id: this.organizationId,
        break_date: new Date().toISOString().split('T')[0],
        break_start_time: this.breakStartTime.toISOString(),
        break_end_time: new Date().toISOString(),
        break_duration_ms: breakDuration,
        session_type: 'manual'
      }]);

    this.isOnBreak = false;
    this.breakStartTime = null;

    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }

    // Update total break time display
    this.updateWorkStats();

    this.updateBreakUI(false);
  }
  
  startSessionTimer() {
    this.sessionTimerInterval = setInterval(() => {
      if (this.sessionStartTime && !this.isOnBreak) {
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        this.elements.sessionTimer.textContent = this.formatTime(elapsed);

        // Update work stats every second
        this.updateWorkStats();
      }
    }, 1000);
  }
  
  stopSessionTimer() {
    if (this.sessionTimerInterval) {
      clearInterval(this.sessionTimerInterval);
      this.sessionTimerInterval = null;
    }
    this.elements.sessionTimer.textContent = '00:00:00';
  }

  startBreakTimer() {
    // Show break timer display
    if (this.elements.breakTimerDisplay) {
      this.elements.breakTimerDisplay.classList.remove('hidden');
    }

    this.breakTimerInterval = setInterval(() => {
      if (this.breakStartTime && this.isOnBreak) {
        const elapsed = Date.now() - this.breakStartTime.getTime();
        if (this.elements.breakTimer) {
          this.elements.breakTimer.textContent = this.formatTime(elapsed);
        }
      }
    }, 1000);
  }

  stopBreakTimer() {
    if (this.breakTimerInterval) {
      clearInterval(this.breakTimerInterval);
      this.breakTimerInterval = null;
    }

    // Hide break timer display
    if (this.elements.breakTimerDisplay) {
      this.elements.breakTimerDisplay.classList.add('hidden');
    }

    if (this.elements.breakTimer) {
      this.elements.breakTimer.textContent = '00:00:00';
    }
  }

  updateWorkStats() {
    // Calculate total work time (session time - break time)
    if (this.sessionStartTime && !this.isOnBreak) {
      const sessionElapsed = Date.now() - this.sessionStartTime.getTime();
      this.totalWorkTime = sessionElapsed - this.totalBreakTime;

      if (this.elements.totalWorkTime) {
        this.elements.totalWorkTime.textContent = this.formatTime(this.totalWorkTime);
      }
    }

    // Update total break time display
    if (this.elements.totalBreakTime) {
      this.elements.totalBreakTime.textContent = this.formatTime(this.totalBreakTime);
    }
  }

  startScreenshotCapture() {
    this.screenshotInterval = setInterval(async () => {
      if (this.isMonitoring && !this.isOnBreak) {
        await this.captureScreenshot();
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  stopScreenshotCapture() {
    if (this.screenshotInterval) {
      clearInterval(this.screenshotInterval);
      this.screenshotInterval = null;
    }
  }
  
  async captureScreenshot() {
    try {
      const result = await window.electronAPI.captureScreenshot();
      
      if (result.success) {
        await this.saveScreenshot(result.dataUrl);
      }
    } catch (error) {
    }
  }
  
  async saveScreenshot(dataUrl) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const userEmail = this.currentUser.email || this.currentUser.id;
      const filename = `${userEmail}/${date}/${time}_screenshot.png`;

      let fileUrl = null;

      // Upload to Backblaze only
      if (this.backblazeEnabled) {
        try {
          const { data: backblazeData, error: backblazeError} = await window.electronAPI.backblazeStorage('upload', {
            bucket: 'screenshots',
            path: filename,
            file: arrayBuffer
          });

          if (!backblazeError && backblazeData) {
            fileUrl = backblazeData.publicUrl;
            console.log('✅ Screenshot uploaded to Backblaze');
          } else {
            console.error('Failed to upload screenshot to Backblaze:', backblazeError);
            return;
          }
        } catch (error) {
          console.error('Error uploading screenshot:', error);
          return;
        }
      } else {
        console.warn('⚠️ Backblaze is not enabled. Screenshot not saved.');
        return;
      }

      // Save to database
      await this.supabase
        .from('screenshots')
        .insert([{
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_id: this.currentSessionId,
          filename: filename,
          file_url: fileUrl,
          backup_file_url: null,
          storage_provider: 'backblaze'
        }]);

    } catch (error) {
    }
  }
  
  async saveMonitoringState() {
    await window.electronAPI.storeSet('isMonitoring', this.isMonitoring);
    await window.electronAPI.storeSet('sessionStartTime', this.sessionStartTime?.getTime());
    await window.electronAPI.storeSet('currentSessionId', this.currentSessionId);
  }
  
  async loadMonitoringState() {
    const monitoringResult = await window.electronAPI.storeGet('isMonitoring');
    const sessionResult = await window.electronAPI.storeGet('sessionStartTime');
    const sessionIdResult = await window.electronAPI.storeGet('currentSessionId');
    
    if (monitoringResult.success && monitoringResult.value && this.currentUser) {
      
      this.isMonitoring = true;
      if (sessionResult.value) {
        this.sessionStartTime = new Date(sessionResult.value);
      }
      if (sessionIdResult.value) {
        this.currentSessionId = sessionIdResult.value;
      }
      
      await this.startRecording();
      this.startSessionTimer();
      this.startScreenshotCapture();
      this.updateMonitoringUI(true);
      
    }
  }
  
  updateMonitoringUI(isMonitoring, state = 'active') {
    // state can be: 'starting', 'stopping', 'active', or null/undefined for off state

    // Toggle button
    if (this.elements.mainToggleBtn) {
      if (state === 'starting' || state === 'stopping') {
        this.elements.mainToggleBtn.className = state === 'starting' ? 'toggle-btn toggle-on' : 'toggle-btn toggle-off';
        this.elements.mainToggleBtn.disabled = true; // Disable during startup/shutdown
      } else {
        this.elements.mainToggleBtn.className = isMonitoring ? 'toggle-btn toggle-on' : 'toggle-btn toggle-off';
        this.elements.mainToggleBtn.disabled = false;
      }
    }

    if (this.elements.toggleIcon) {
      if (state === 'starting' || state === 'stopping') {
        this.elements.toggleIcon.textContent = '⏳';
      } else {
        this.elements.toggleIcon.textContent = isMonitoring ? '🟢' : '🔴';
      }
    }

    if (this.elements.toggleStatus) {
      if (state === 'starting') {
        this.elements.toggleStatus.textContent = 'Starting...';
      } else if (state === 'stopping') {
        this.elements.toggleStatus.textContent = 'Stopping...';
      } else {
        this.elements.toggleStatus.textContent = isMonitoring ? 'Work Invigilator ON' : 'Work Invigilator OFF';
      }
    }

    if (this.elements.toggleSubtitle) {
      if (state === 'starting' || state === 'stopping') {
        this.elements.toggleSubtitle.textContent = 'Please wait...';
      } else {
        this.elements.toggleSubtitle.textContent = isMonitoring ? 'Click to end session' : 'Click to start session';
      }
    }

    // Monitoring panel
    if (this.elements.monitoringStatus) {
      if (isMonitoring || state === 'starting' || state === 'stopping') {
        this.elements.monitoringStatus.classList.remove('hidden');
      } else {
        this.elements.monitoringStatus.classList.add('hidden');
      }
    }
  }
  
  updateBreakUI(isOnBreak) {
    if (this.elements.breakToggleBtn) {
      this.elements.breakToggleBtn.className = isOnBreak ? 'break-toggle-btn break-on' : 'break-toggle-btn break-off';
    }
    if (this.elements.breakText) {
      this.elements.breakText.textContent = isOnBreak ? 'End Break' : 'Take Break';
    }
  }
  
  async checkMicrophonePermission() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.elements.permissionStatus.classList.add('granted');
      this.elements.permissionText.textContent = 'Microphone access granted';
      
      // Hide after 3 seconds
      setTimeout(() => {
        this.elements.permissionStatus.classList.add('hidden');
      }, 3000);
      
    } catch (error) {
      this.elements.permissionStatus.classList.remove('hidden');
      this.elements.permissionText.textContent = 'Microphone access required';
    }
  }
  
  openAdminDashboard() {
    window.electronAPI.openExternal('http://localhost:3002/login');
  }

  async startActivityTracking() {
    try {
      // Start periodic activity tracking (every 10 seconds)
      await window.electronAPI.startActivityTracking(10000);

      // Listen for activity changes
      window.electronAPI.onActiveWindowChanged(async (windowData) => {
        if (this.isMonitoring && !this.isOnBreak) {
          await this.logActivity(windowData);
        }
      });

      // Periodic sync timer
      this.activitySyncInterval = setInterval(async () => {
        await this.syncActivityLogs();
      }, this.ACTIVITY_SYNC_INTERVAL);

    } catch (error) {
      console.error('Failed to start activity tracking:', error);
    }
  }

  async stopActivityTracking() {
    try {
      // Stop tracking
      await window.electronAPI.stopActivityTracking();

      // Clear sync interval
      if (this.activitySyncInterval) {
        clearInterval(this.activitySyncInterval);
        this.activitySyncInterval = null;
      }

      // Sync remaining buffered logs
      await this.syncActivityLogs();

    } catch (error) {
      console.error('Failed to stop activity tracking:', error);
    }
  }

  async logActivity(windowData) {
    // Get the active window with URL extraction
    const result = await window.electronAPI.getActiveWindow();

    if (result.success && result.data) {
      const activity = {
        appName: result.data.appName,
        windowTitle: result.data.windowTitle,
        url: result.data.url,
        domain: result.data.domain,
        timestamp: result.data.timestamp
      };

      // Add to buffer
      this.activityBuffer.push(activity);

      // Update last activity time for idle detection
      this.lastActivityTime = Date.now();

      // If was idle, end idle period
      if (this.currentIdlePeriodId) {
        await this.endIdlePeriod();
      }

      // Sync if buffer is full
      if (this.activityBuffer.length >= this.ACTIVITY_BUFFER_SIZE) {
        await this.syncActivityLogs();
      }
    }
  }

  async syncActivityLogs() {
    if (this.activityBuffer.length === 0) {
      return;
    }

    try {
      // Get access token
      const tokenResult = await window.electronAPI.storeGet('accessToken');
      if (!tokenResult.success || !tokenResult.value) {
        console.error('No access token available for activity sync');
        return;
      }

      const accessToken = tokenResult.value;

      // Send to API
      const response = await fetch('http://localhost:3002/api/activity-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          activities: this.activityBuffer,
          sessionId: this.currentSessionId
        })
      });

      if (response.ok) {
        // Clear buffer on success
        this.activityBuffer = [];
      } else {
        const error = await response.json();
        console.error('Failed to sync activity logs:', error);

        // If auth error, try to refresh token
        if (response.status === 401) {
          await this.refreshAuthToken();
        }
      }

    } catch (error) {
      console.error('Error syncing activity logs:', error);
      // Keep logs in buffer for next sync attempt
    }
  }

  // Attendance tracking methods

  async autoClockIn() {
    try {
      const tokenResult = await window.electronAPI.storeGet('accessToken');
      if (!tokenResult.success || !tokenResult.value) {
        return;
      }

      const now = new Date();
      const date = now.toISOString().split('T')[0];

      // Call attendance API to clock in
      const response = await fetch('http://localhost:3002/api/attendance/clock-in', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult.value}`
        },
        body: JSON.stringify({
          clockInTime: now.toISOString(),
          date: date
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.currentAttendanceId = data.attendanceId;
        this.lastActivityTime = Date.now();
        console.log('Auto clocked in successfully');
      }
    } catch (error) {
      console.error('Failed to auto clock-in:', error);
    }
  }

  async autoClockOut() {
    try {
      if (!this.currentAttendanceId) {
        return;
      }

      const tokenResult = await window.electronAPI.storeGet('accessToken');
      if (!tokenResult.success || !tokenResult.value) {
        return;
      }

      // End any active idle period first
      if (this.currentIdlePeriodId) {
        await this.endIdlePeriod();
      }

      const now = new Date();

      // Call attendance API to clock out
      const response = await fetch('http://localhost:3002/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult.value}`
        },
        body: JSON.stringify({
          attendanceId: this.currentAttendanceId,
          clockOutTime: now.toISOString()
        })
      });

      if (response.ok) {
        console.log('Auto clocked out successfully');
        this.currentAttendanceId = null;
      }
    } catch (error) {
      console.error('Failed to auto clock-out:', error);
    }
  }

  startIdleDetection() {
    // Update last activity time on user interaction
    this.lastActivityTime = Date.now();

    // Add mouse and keyboard event listeners to detect user activity
    this.setupActivityListeners();

    // Check for idle every 15 seconds (more frequent for better accuracy)
    this.idleCheckInterval = setInterval(() => {
      this.checkIdleStatus();
    }, 15000);
  }

  setupActivityListeners() {
    // Track mouse movement
    const updateActivity = () => {
      const wasIdle = this.isIdle;
      this.lastActivityTime = Date.now();

      // If was idle, mark as active
      if (wasIdle && this.currentIdlePeriodId) {
        this.endIdlePeriod();
      }
    };

    // Mouse events
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('mousedown', updateActivity);
    document.addEventListener('mouseup', updateActivity);
    document.addEventListener('click', updateActivity);
    document.addEventListener('wheel', updateActivity);

    // Keyboard events
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('keyup', updateActivity);

    // Touch events for touchscreen support
    document.addEventListener('touchstart', updateActivity);
    document.addEventListener('touchmove', updateActivity);
    document.addEventListener('touchend', updateActivity);

    // Store event listener reference for cleanup
    this.activityEventListener = updateActivity;
  }

  removeActivityListeners() {
    if (!this.activityEventListener) return;

    document.removeEventListener('mousemove', this.activityEventListener);
    document.removeEventListener('mousedown', this.activityEventListener);
    document.removeEventListener('mouseup', this.activityEventListener);
    document.removeEventListener('click', this.activityEventListener);
    document.removeEventListener('wheel', this.activityEventListener);
    document.removeEventListener('keydown', this.activityEventListener);
    document.removeEventListener('keypress', this.activityEventListener);
    document.removeEventListener('keyup', this.activityEventListener);
    document.removeEventListener('touchstart', this.activityEventListener);
    document.removeEventListener('touchmove', this.activityEventListener);
    document.removeEventListener('touchend', this.activityEventListener);

    this.activityEventListener = null;
  }

  stopIdleDetection() {
    // Clear idle check interval
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }

    // Remove activity event listeners
    this.removeActivityListeners();
  }

  async checkIdleStatus() {
    if (!this.isMonitoring) return;

    const now = Date.now();
    const timeSinceActivity = now - (this.lastActivityTime || now);

    // If idle for more than threshold and not already in idle state
    if (timeSinceActivity > this.IDLE_THRESHOLD && !this.currentIdlePeriodId) {
      this.isIdle = true;
      await this.startIdlePeriod();
      this.updateIdleStatusUI(true);
      console.log(`Idle detected: No activity for ${Math.floor(timeSinceActivity / 1000)}s (threshold: ${this.IDLE_THRESHOLD / 1000}s)`);
    }
    // If was idle but now active again
    else if (timeSinceActivity < this.IDLE_THRESHOLD && this.currentIdlePeriodId) {
      this.isIdle = false;
      await this.endIdlePeriod();
      this.updateIdleStatusUI(false);
      console.log('Activity resumed - idle period ended');
    }
  }

  async startIdlePeriod() {
    try {
      const tokenResult = await window.electronAPI.storeGet('accessToken');
      if (!tokenResult.success || !tokenResult.value) {
        return;
      }

      this.idleStartTime = new Date();

      // Call API to start idle period
      const response = await fetch('http://localhost:3002/api/attendance/start-idle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult.value}`
        },
        body: JSON.stringify({
          attendanceId: this.currentAttendanceId,
          idleStartTime: this.idleStartTime.toISOString()
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.currentIdlePeriodId = data.idlePeriodId;
        console.log('Idle period started');
      }
    } catch (error) {
      console.error('Failed to start idle period:', error);
    }
  }

  async endIdlePeriod() {
    try {
      if (!this.currentIdlePeriodId) {
        return;
      }

      const tokenResult = await window.electronAPI.storeGet('accessToken');
      if (!tokenResult.success || !tokenResult.value) {
        return;
      }

      const now = new Date();

      // Call API to end idle period
      const response = await fetch('http://localhost:3002/api/attendance/end-idle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenResult.value}`
        },
        body: JSON.stringify({
          idlePeriodId: this.currentIdlePeriodId,
          idleEndTime: now.toISOString()
        })
      });

      if (response.ok) {
        console.log('Idle period ended');
        this.currentIdlePeriodId = null;
        this.idleStartTime = null;
        this.lastActivityTime = Date.now();
      }
    } catch (error) {
      console.error('Failed to end idle period:', error);
    }
  }

  updateIdleStatusUI(isIdle) {
    // Update status text
    if (this.elements.statusText) {
      if (isIdle) {
        this.elements.statusText.textContent = '⏸️ IDLE - Timer Paused';
        this.elements.statusText.style.color = '#f59e0b'; // Amber color
      } else {
        this.elements.statusText.textContent = '🟢 ACTIVE - Recording';
        this.elements.statusText.style.color = '#10b981'; // Green color
      }
    }

    // Update session indicator
    if (this.elements.sessionIndicator) {
      if (isIdle) {
        this.elements.sessionIndicator.style.backgroundColor = '#f59e0b';
        this.elements.sessionIndicator.title = 'Idle - No keyboard or mouse activity detected';
      } else {
        this.elements.sessionIndicator.style.backgroundColor = '#10b981';
        this.elements.sessionIndicator.title = 'Active - Recording work session';
      }
    }
  }

  // Live Streaming Methods (runs directly in renderer process)

  async initializeLiveStream() {
    if (!this.liveStreamManager && this.currentUser && this.organizationId) {
      try {
        // Use global LiveStreamManager class (loaded via script tag in index.html)
        if (typeof window.LiveStreamManager === 'undefined') {
          throw new Error('LiveStreamManager not loaded. Ensure livestream-supabase.js is loaded before renderer.js');
        }
        this.liveStreamManager = new window.LiveStreamManager();

        // Get Supabase config for live streaming
        const supabaseConfig = await window.electronAPI.getSupabaseConfig();

        const result = await this.liveStreamManager.initialize(
          this.currentUser,
          this.organizationId,
          supabaseConfig.url,
          supabaseConfig.anon_key
        );

        if (result.success) {
          console.log('✅ Live stream manager initialized with Supabase Realtime');
        } else {
          console.error('Failed to initialize live stream:', result.error);
        }
      } catch (error) {
        console.error('Failed to initialize live stream manager:', error);
      }
    }
  }

  async startLiveStreaming() {
    if (!this.isLiveStreaming && this.liveStreamManager) {
      try {
        const result = await this.liveStreamManager.startStreaming();

        if (result.success) {
          this.isLiveStreaming = true;
          console.log('✅ Live streaming started');
        } else {
          console.error('Failed to start live streaming:', result.error);
        }
      } catch (error) {
        console.error('Error starting live streaming:', error);
      }
    }
  }

  async stopLiveStreaming() {
    if (this.isLiveStreaming && this.liveStreamManager) {
      try {
        this.liveStreamManager.stopStreaming();
        this.isLiveStreaming = false;
        console.log('🛑 Live streaming stopped');
      } catch (error) {
        console.error('Error stopping live streaming:', error);
      }
    }
  }

  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.app = new WorkInvigilatorApp();
});

