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
    console.log('🚀 Initializing Work Invigilator Desktop...');
    
    // Initialize UI
    this.initializeElements();
    this.bindEvents();
    
    // Initialize Supabase
    await this.initializeSupabase();
    
    // Check authentication
    await this.checkAuthState();
    
    // Check microphone permission
    this.checkMicrophonePermission();
    
    console.log('✅ Work Invigilator Desktop initialized');
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
      
      console.log('✅ Supabase IPC wrapper initialized');
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
          
          console.log('✅ Session restored:', this.currentUser.email);
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
    
    console.log('🔄 Token refresh timer started');
  }
  
  async refreshAuthToken() {
    try {
      console.log('🔄 Refreshing auth token...');
      
      // Get current session
      const { data, error } = await this.supabase.auth.getSession();
      
      if (error) throw error;
      
      if (data.session) {
        // Store new access token
        await window.electronAPI.storeSet('accessToken', data.session.access_token);
        await window.electronAPI.storeSet('refreshToken', data.session.refresh_token);
        
        console.log('✅ Token refreshed successfully');
      } else {
        console.warn('⚠️ No active session found');
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
      
      console.log('✅ Login successful:', email);
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
      
      console.log('✅ Logged out');
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
      console.log('🎯 Starting work session...');
      
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
      console.log('✅ Session created:', this.currentSessionId);
      console.log('Session data:', session);
      
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
      
      console.log('✅ Work session started');
      
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      this.showMessage('Failed to start session: ' + error.message, 'error');
    }
  }
  
  async stopMonitoring() {
    if (!this.isMonitoring) return;
    
    try {
      console.log('🛑 Stopping work session...');
      
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
      
      console.log('✅ Monitoring stopped');
      
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
      
      console.log('✅ Recording started');
      
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
          
          this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
          resolve();
        };
        
        this.mediaRecorder.stop();
      });
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
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkNumber = this.sessionChunks.length + 1;
      const filename = `${this.currentUser.id}/chunk_${chunkNumber}_${timestamp}.webm`;
      
      console.log('💾 Saving chunk:', chunkNumber);
      
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('audio-recordings')
        .upload(filename, arrayBuffer);
      
      if (uploadError) {
        console.error('❌ Chunk upload error:', uploadError);
        return;
      }
      
      const urlData = await this.supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename);
      
      const { error: dbError } = await this.supabase
        .from('recording_chunks')
        .insert([{
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_start_time: this.sessionStartTime.toISOString(),
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration_seconds: chunkDuration,
          chunk_start_time: new Date(this.currentChunkStartTime).toISOString()
        }]);
      
      if (!dbError) {
        this.sessionChunks.push({
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration: chunkDuration
        });
        console.log(`✅ Chunk ${chunkNumber} saved`);
      }
      
    } catch (error) {
      console.error('❌ Save chunk error:', error);
    }
  }
  
  startBreak() {
    if (!this.isMonitoring || this.isOnBreak) return;
    
    console.log('☕ Starting break...');
    this.isOnBreak = true;
    this.breakStartTime = new Date();
    
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
    
    this.updateBreakUI(true);
  }
  
  async endBreak() {
    if (!this.isOnBreak) return;
    
    const breakDuration = Date.now() - this.breakStartTime.getTime();
    this.dailyBreakDuration += breakDuration;
    
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
    
    this.updateBreakUI(false);
  }
  
  startSessionTimer() {
    this.sessionTimerInterval = setInterval(() => {
      if (this.sessionStartTime && !this.isOnBreak) {
        const elapsed = Date.now() - this.sessionStartTime.getTime();
        this.elements.sessionTimer.textContent = this.formatTime(elapsed);
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
        console.log('📸 Screenshot captured');
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
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.currentUser.id}/screenshot_${timestamp}.png`;
      
      const { data: uploadData, error: uploadError } = await this.supabase.storage
        .from('screenshots')
        .upload(filename, arrayBuffer);
      
      if (uploadError) {
        console.error('❌ Screenshot upload error:', uploadError);
        return;
      }
      
      const urlData = await this.supabase.storage
        .from('screenshots')
        .getPublicUrl(filename);
      
      await this.supabase
        .from('screenshots')
        .insert([{
          user_id: this.currentUser.id,
          organization_id: this.organizationId,
          session_id: this.currentSessionId,
          filename: filename,
          file_url: urlData.publicUrl
        }]);
      
      console.log('✅ Screenshot saved');
      
    } catch (error) {
      console.error('❌ Save screenshot error:', error);
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
      
      console.log('🔄 Monitoring state restored');
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

