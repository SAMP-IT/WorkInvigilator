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
      
      // Update UI
      this.updateMonitoringUI(true);
      
      // Save state
      await this.saveMonitoringState();
      
      
    } catch (error) {
      this.showMessage('Failed to start session: ' + error.message, 'error');
    }
  }
  
  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    try {
      const sessionEndTime = new Date();
      const sessionDuration = Math.floor((sessionEndTime - this.sessionStartTime) / 1000);
      
      // Stop recording first
      await this.stopRecording();
      
      // Stop timers
      this.stopSessionTimer();
      this.stopScreenshotCapture();
      
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
      
      // Update UI
      this.updateMonitoringUI(false);
      
      // Save state to storage
      await this.saveMonitoringState();
      
      
    } catch (error) {
      this.showMessage('Error stopping session: ' + error.message, 'error');
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

      let primaryUrl = null;
      let backupUrl = null;

      // Try Backblaze first (if enabled)
      if (this.backblazeEnabled) {
        try {
          const { data: backblazeData, error: backblazeError } = await window.electronAPI.backblazeStorage('upload', {
            bucket: 'audio-recordings',
            path: filename,
            file: arrayBuffer
          });

          if (!backblazeError && backblazeData) {
            primaryUrl = backblazeData.publicUrl;
          }
        } catch (error) {
          // Backblaze upload failed, will use Supabase
        }
      }

      // Always upload to Supabase (as backup or primary)
      let uploadData, uploadError;

      try {
        const uploadResult = await this.supabase.storage
          .from('audio-recordings')
          .upload(filename, arrayBuffer);
        uploadData = uploadResult.data;
        uploadError = uploadResult.error;
      } catch (error) {
        uploadError = error;
      }

      // If token expired, refresh and retry once
      if (uploadError && (uploadError.message?.includes('exp') || uploadError.message?.includes('token'))) {
        await this.refreshAuthToken();

        const retryResult = await this.supabase.storage
          .from('audio-recordings')
          .upload(filename, arrayBuffer);
        uploadData = retryResult.data;
        uploadError = retryResult.error;
      }

      if (uploadError) {
        // If both failed, return
        if (!primaryUrl) {
          return;
        }
      } else {
        const urlData = await this.supabase.storage
          .from('audio-recordings')
          .getPublicUrl(filename);

        backupUrl = urlData.publicUrl;

        if (!primaryUrl) {
          // If Backblaze failed/disabled, use Supabase as primary
          primaryUrl = backupUrl;
        }
      }

      // Save to database with primary URL and backup URL
      const dbRecord = {
        user_id: this.currentUser.id,
        organization_id: this.organizationId,
        session_start_time: this.sessionStartTime ? this.sessionStartTime.toISOString() : new Date().toISOString(),
        chunk_number: chunkNumber,
        filename: filename,
        file_url: primaryUrl,
        backup_file_url: backupUrl,
        storage_provider: this.backblazeEnabled ? 'backblaze' : 'supabase',
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
          file_url: primaryUrl,
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
    }, 30000); // Every 30 seconds
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

      let primaryUrl = null;
      let backupUrl = null;

      // Try Backblaze first (if enabled)
      if (this.backblazeEnabled) {
        try {
          const { data: backblazeData, error: backblazeError } = await window.electronAPI.backblazeStorage('upload', {
            bucket: 'screenshots',
            path: filename,
            file: arrayBuffer
          });

          if (!backblazeError && backblazeData) {
            primaryUrl = backblazeData.publicUrl;
          } else {
          }
        } catch (error) {
        }
      }

      // Always upload to Supabase (as backup or primary)
      let uploadData, uploadError;
      
      try {
        const uploadResult = await this.supabase.storage
          .from('screenshots')
          .upload(filename, arrayBuffer);
        uploadData = uploadResult.data;
        uploadError = uploadResult.error;
      } catch (error) {
        uploadError = error;
      }

      // If token expired, refresh and retry once
      if (uploadError && (uploadError.message?.includes('exp') || uploadError.message?.includes('token'))) {
        await this.refreshAuthToken();
        
        const retryResult = await this.supabase.storage
          .from('screenshots')
          .upload(filename, arrayBuffer);
        uploadData = retryResult.data;
        uploadError = retryResult.error;
      }

      if (uploadError) {
        // If both failed, return
        if (!primaryUrl) {
          return;
        }
      } else {
        const urlData = await this.supabase.storage
          .from('screenshots')
          .getPublicUrl(filename);

        backupUrl = urlData.publicUrl;

        if (!primaryUrl) {
          // If Backblaze failed/disabled, use Supabase as primary
          primaryUrl = backupUrl;
        }
      }

      // Save to database with primary URL and backup URL
      await this.supabase
        .from('screenshots')
        .insert([{
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_id: this.currentSessionId,
          filename: filename,
          file_url: primaryUrl,
          backup_file_url: backupUrl,
          storage_provider: this.backblazeEnabled ? 'backblaze' : 'supabase'
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
  
  updateMonitoringUI(isMonitoring) {
    // Toggle button
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
      this.elements.toggleSubtitle.textContent = isMonitoring ? 'Click to end session' : 'Click to start session';
    }
    
    // Monitoring panel
    if (this.elements.monitoringStatus) {
      if (isMonitoring) {
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

