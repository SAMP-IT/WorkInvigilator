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
    
    // Screenshot
    this.screenshotInterval = null;
    
    // UI Elements
    this.elements = {};
    
    this.init();
  }
  
  async init() {
    // Initialize UI
    this.initializeElements();
    this.bindEvents();
    
    // Initialize Supabase
    await this.initializeSupabase();
    
    // Check authentication
    await this.checkAuthState();
    
    // Check microphone permission
    this.checkMicrophonePermission();
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
                return await window.electronAPI.supabaseQuery(table, 'insert', { data });
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
      console.error('❌ Failed to initialize Supabase:', error);
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
      console.error('❌ Failed to restore session:', error);
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
      console.error('❌ Token refresh failed:', error);
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
      console.error('❌ Login failed:', error);
      this.showMessage(error.message || 'Login failed', 'error');
    }
  }
  
  async logout() {
    try {
      // Stop monitoring if active
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
      
      // Clear state
      this.currentUser = null;
      this.userRole = null;
      this.organizationId = null;
      
      this.showUnauthenticatedView();
      
    } catch (error) {
      console.error('❌ Logout failed:', error);
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
      
      // Create session record in database
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
      
      if (sessionError) throw sessionError;
      
      // Handle array response from Supabase
      const session = Array.isArray(sessionData) ? sessionData[0] : sessionData;
      this.currentSessionId = session?.id;
      
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
      console.error('❌ Failed to start monitoring:', error);
      this.showMessage('Failed to start session: ' + error.message, 'error');
    }
  }
  
  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    try {
      const sessionEndTime = new Date();
      const sessionDuration = Math.floor((sessionEndTime - this.sessionStartTime) / 1000);
      
      // Stop recording
      await this.stopRecording();
      
      // Stop timers
      this.stopSessionTimer();
      this.stopScreenshotCapture();
      
      // Update session record
      if (this.currentSessionId) {
        await this.supabase
          .from('recording_sessions')
          .update({
            session_end_time: sessionEndTime.toISOString(),
            total_duration_seconds: sessionDuration,
            total_chunks: this.sessionChunks.length,
            total_chunk_duration_seconds: this.sessionChunks.reduce((sum, c) => sum + c.duration, 0),
            chunk_files: this.sessionChunks
          })
          .eq('id', this.currentSessionId);
      }
      
      // Clear state
      this.isMonitoring = false;
      this.sessionStartTime = null;
      this.currentSessionId = null;
      
      // Update UI
      this.updateMonitoringUI(false);
      
      // Save state
      await this.saveMonitoringState();
      
    } catch (error) {
      console.error('❌ Failed to stop monitoring:', error);
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

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
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

          resolve();
        };

        this.mediaRecorder.stop();
      });
    }
  }
  
  async saveCurrentChunk() {
    console.log('💾 [AUDIO] saveCurrentChunk called');
    console.log('💾 [AUDIO] Supabase client exists?', !!this.supabase);
    console.log('💾 [AUDIO] Current user exists?', !!this.currentUser);
    console.log('💾 [AUDIO] Audio chunks count:', this.audioChunks.length);

    if (!this.supabase || !this.currentUser || this.audioChunks.length === 0) {
      console.warn('⚠️ [AUDIO] Cannot save chunk - missing prerequisites:', {
        hasSupabase: !!this.supabase,
        hasUser: !!this.currentUser,
        chunksCount: this.audioChunks.length
      });
      return;
    }

    try {
      console.log('💾 [AUDIO] Creating blob from audio chunks...');
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      console.log('💾 [AUDIO] Blob created. Size:', chunkBlob.size, 'bytes', 'Type:', chunkBlob.type);

      const arrayBuffer = await chunkBlob.arrayBuffer();
      console.log('💾 [AUDIO] ArrayBuffer created. Byte length:', arrayBuffer.byteLength);

      const chunkDuration = Math.floor((Date.now() - this.currentChunkStartTime) / 1000);
      const now = new Date();
      const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const chunkNumber = this.sessionChunks.length + 1;
      const userEmail = this.currentUser.email || this.currentUser.id;
      const filename = `${userEmail}/${date}/${time}_chunk_${chunkNumber}.webm`;

      console.log('💾 [AUDIO] Chunk metadata:', {
        chunkNumber,
        duration: chunkDuration + 's',
        filename,
        userEmail,
        organizationId: this.organizationId
      });

      let primaryUrl = null;
      let backupUrl = null;

      // Try Backblaze first (if enabled)
      console.log('☁️ [BACKBLAZE] Enabled?', this.backblazeEnabled);
      if (this.backblazeEnabled) {
        try {
          console.log('☁️ [BACKBLAZE] Starting upload...');
          const { data: backblazeData, error: backblazeError } = await window.electronAPI.backblazeStorage('upload', {
            bucket: 'audio-recordings',
            path: filename,
            file: arrayBuffer
          });

          if (!backblazeError && backblazeData) {
            primaryUrl = backblazeData.publicUrl;
            console.log('✅ [BACKBLAZE] Upload successful. URL:', primaryUrl);
          } else {
            console.error('❌ [BACKBLAZE] Upload failed:', backblazeError);
          }
        } catch (error) {
          console.error('❌ [BACKBLAZE] Upload exception:', {
            message: error.message,
            name: error.name,
            stack: error.stack
          });
        }
      } else {
        console.log('⏭️ [BACKBLAZE] Skipped (disabled)');
      }

      // Always upload to Supabase (as backup or primary)
      console.log('☁️ [SUPABASE] Starting storage upload...');
      let uploadData, uploadError;

      try {
        const uploadResult = await this.supabase.storage
          .from('audio-recordings')
          .upload(filename, arrayBuffer);
        uploadData = uploadResult.data;
        uploadError = uploadResult.error;

        console.log('☁️ [SUPABASE] Upload result:', {
          hasData: !!uploadData,
          hasError: !!uploadError,
          error: uploadError
        });
      } catch (error) {
        uploadError = error;
        console.error('❌ [SUPABASE] Upload exception:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }

      // If token expired, refresh and retry once
      if (uploadError && (uploadError.message?.includes('exp') || uploadError.message?.includes('token'))) {
        console.log('🔄 [SUPABASE] Token expired, refreshing and retrying...');
        await this.refreshAuthToken();

        const retryResult = await this.supabase.storage
          .from('audio-recordings')
          .upload(filename, arrayBuffer);
        uploadData = retryResult.data;
        uploadError = retryResult.error;

        console.log('🔄 [SUPABASE] Retry result:', {
          hasData: !!uploadData,
          hasError: !!uploadError,
          error: uploadError
        });
      }

      if (uploadError) {
        console.error('❌ [SUPABASE] Upload error:', uploadError);
        // If both failed, return
        if (!primaryUrl) {
          console.error('💥 [CRITICAL] Both Backblaze and Supabase failed for chunk', chunkNumber);
          return;
        }
      } else {
        console.log('☁️ [SUPABASE] Getting public URL...');
        const urlData = await this.supabase.storage
          .from('audio-recordings')
          .getPublicUrl(filename);

        backupUrl = urlData.publicUrl;
        console.log('✅ [SUPABASE] Public URL obtained:', backupUrl);

        if (!primaryUrl) {
          // If Backblaze failed/disabled, use Supabase as primary
          primaryUrl = backupUrl;
          console.log('ℹ️ [SUPABASE] Using Supabase as primary storage');
        }
      }

      // Save to database with primary URL and backup URL
      console.log('💾 [DATABASE] Inserting chunk record...');
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
      console.log('💾 [DATABASE] Record to insert:', dbRecord);

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
        console.log('✅ [DATABASE] Chunk record inserted successfully. Total session chunks:', this.sessionChunks.length);
      } else {
        console.error('❌ [DATABASE] Insert failed for chunk', chunkNumber, {
          error: dbError,
          message: dbError.message,
          details: dbError.details,
          hint: dbError.hint
        });
      }

    } catch (error) {
      console.error('💥 [AUDIO] Save chunk error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
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
      console.error('❌ Screenshot capture failed:', error);
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
            console.error('❌ FAILED: Backblaze screenshot upload error:', backblazeError);
          }
        } catch (error) {
          console.error('❌ FAILED: Backblaze screenshot upload exception:', error.message);
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
        console.error('❌ FAILED: Supabase screenshot upload error:', uploadError);
        // If both failed, return
        if (!primaryUrl) {
          console.error('💥 CRITICAL: Both Backblaze and Supabase failed for screenshot');
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
      console.error('💥 Save screenshot error:', error);
    }
  }
  
  async saveMonitoringState() {
    await window.electronAPI.storeSet('isMonitoring', this.isMonitoring);
    await window.electronAPI.storeSet('sessionStartTime', this.sessionStartTime?.getTime());
  }
  
  async loadMonitoringState() {
    const monitoringResult = await window.electronAPI.storeGet('isMonitoring');
    const sessionResult = await window.electronAPI.storeGet('sessionStartTime');
    
    if (monitoringResult.success && monitoringResult.value && this.currentUser) {
      this.isMonitoring = true;
      if (sessionResult.value) {
        this.sessionStartTime = new Date(sessionResult.value);
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

