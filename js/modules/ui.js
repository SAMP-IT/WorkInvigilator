// UI Module
class UIManager {
  constructor(mainApp) {
    this.mainApp = mainApp;
  }

  initializeElements() {
    // Main toggle elements
    this.mainApp.mainToggleBtn = document.getElementById('main-toggle-btn');
    this.mainApp.toggleIcon = document.getElementById('toggle-icon');
    this.mainApp.toggleStatus = document.getElementById('toggle-status');
    this.mainApp.toggleSubtitle = document.getElementById('toggle-subtitle');
    this.mainApp.monitoringStatus = document.getElementById('monitoring-status');
    this.mainApp.audioStatus = document.getElementById('audio-status');
    this.mainApp.screenshotStatus = document.getElementById('screenshot-status');
    this.mainApp.sessionTimer = document.getElementById('session-timer');

    // Break toggle elements
    this.mainApp.breakToggleBtn = document.getElementById('break-toggle-btn');
    this.mainApp.breakIcon = document.getElementById('break-icon');
    this.mainApp.breakText = document.getElementById('break-text');

    // Quick action elements
    this.mainApp.captureNowBtn = document.getElementById('capture-now-btn');
    this.mainApp.playLastBtn = document.getElementById('play-last-btn');
    this.mainApp.quickActions = document.getElementById('quick-actions');

    // Legacy elements
    this.mainApp.statusText = document.getElementById('status-text');
    this.mainApp.recordingTime = document.getElementById('recording-time');
    this.mainApp.waveformContainer = document.getElementById('waveform-container');
    this.mainApp.recordingsList = document.getElementById('recordings');
    this.mainApp.permissionStatus = document.getElementById('permission-status');
    this.mainApp.permissionText = document.getElementById('permission-text');
    this.mainApp.micIcon = document.getElementById('mic-icon');

    // Auth UI elements
    this.mainApp.authSection = document.getElementById('auth-section');
    this.mainApp.userInfo = document.getElementById('user-info');
    this.mainApp.authForms = document.getElementById('auth-forms');
    this.mainApp.mainInterface = document.getElementById('main-interface');
    this.mainApp.loginTab = document.getElementById('login-tab');
    this.mainApp.loginForm = document.getElementById('login-form');
    this.mainApp.logoutBtn = document.getElementById('logout-btn');
    this.mainApp.userEmail = document.getElementById('user-email');
    this.mainApp.userRoleDisplay = document.getElementById('user-role');
    this.mainApp.authMessage = document.getElementById('auth-message');
  }

  bindEvents() {
    // Main toggle button
    if (this.mainApp.mainToggleBtn) {
      this.mainApp.mainToggleBtn.addEventListener('click', () => {
        console.log('🔘 Main toggle button clicked!');
        this.mainApp.toggleMonitoring();
      });
    }

    // Break toggle button
    if (this.mainApp.breakToggleBtn) {
      this.mainApp.breakToggleBtn.addEventListener('click', () => this.mainApp.toggleBreak());
    }

    // Quick action buttons
    if (this.mainApp.captureNowBtn) {
      this.mainApp.captureNowBtn.addEventListener('click', () => this.mainApp.captureScreenshot());
    }
    if (this.mainApp.playLastBtn) {
      this.mainApp.playLastBtn.addEventListener('click', () => this.mainApp.playLastRecording());
    }

    // Authentication events
    if (this.mainApp.loginTab) {
      this.mainApp.loginTab.addEventListener('click', () => this.switchAuthTab('login'));
    }
    if (this.mainApp.loginForm) {
      this.mainApp.loginForm.addEventListener('submit', (e) => this.mainApp.auth.handleLogin(e));
    }
    if (this.mainApp.logoutBtn) {
      this.mainApp.logoutBtn.addEventListener('click', () => this.mainApp.auth.handleLogout());
    }

    // Admin dashboard button
    const adminDashboardBtn = document.getElementById('admin-dashboard-btn');
    if (adminDashboardBtn) {
      adminDashboardBtn.addEventListener('click', () => this.mainApp.openAdminDashboard());
    }
  }

  updateToggleUI(state) {
    if (state === 'on') {
      this.mainApp.mainToggleBtn.classList.remove('toggle-off');
      this.mainApp.mainToggleBtn.classList.add('toggle-on');
      this.mainApp.toggleIcon.textContent = '🟢';
      this.mainApp.toggleStatus.textContent = 'Work Invigilator ON';
      this.mainApp.toggleSubtitle.textContent = 'Tap to stop monitoring';
    } else {
      this.mainApp.mainToggleBtn.classList.remove('toggle-on');
      this.mainApp.mainToggleBtn.classList.add('toggle-off');
      this.mainApp.toggleIcon.textContent = '🔴';
      this.mainApp.toggleStatus.textContent = 'Work Invigilator OFF';
      this.mainApp.toggleSubtitle.textContent = 'Tap to start monitoring';
    }
  }

  updateBreakUI(state) {
    switch (state) {
      case 'paused':
        this.mainApp.breakToggleBtn.classList.remove('break-off');
        this.mainApp.breakToggleBtn.classList.add('break-paused');
        this.mainApp.breakIcon.textContent = '⏸️';
        this.mainApp.breakText.textContent = 'On Break - Tap to Resume';
        break;
      case 'off':
        this.mainApp.breakToggleBtn.classList.remove('break-paused');
        this.mainApp.breakToggleBtn.classList.add('break-off');
        this.mainApp.breakIcon.textContent = '☕';
        this.mainApp.breakText.textContent = 'Take Break';
        break;
    }
  }

  updateAudioStatus(status) {
    this.mainApp.audioStatus.textContent = `Audio: ${status}`;
  }

  updateScreenshotStatus(status) {
    this.mainApp.screenshotStatus.textContent = `Screenshots: ${status}`;
  }

  updateUI(state) {
    const audioStatus = document.getElementById('audio-status');
    const waveformContainer = document.getElementById('waveform-container');

    if (!audioStatus) return;

    switch (state) {
      case 'recording':
        audioStatus.textContent = '🎤 Recording audio...';
        audioStatus.className = 'status-item recording';
        if (waveformContainer) {
          waveformContainer.classList.add('recording');
        }
        break;

      case 'stopped':
        audioStatus.textContent = '✅ Audio recording saved';
        audioStatus.className = 'status-item completed';
        if (waveformContainer) {
          waveformContainer.classList.remove('recording');
        }
        setTimeout(() => {
          if (audioStatus.textContent.includes('Audio recording saved')) {
            audioStatus.textContent = '🎤 Audio ready';
            audioStatus.className = 'status-item';
          }
        }, 3000);
        break;

      default:
        audioStatus.textContent = '🎤 Audio ready';
        audioStatus.className = 'status-item';
        if (waveformContainer) {
          waveformContainer.classList.remove('recording');
        }
        break;
    }
  }

  updateStatus(message) {
    this.mainApp.statusText.textContent = message;
  }

  updateUserDisplay() {
    console.log('🔄 updateUserDisplay called');
    console.log('👤 Current user:', this.mainApp.currentUser?.email);
    console.log('👑 User role:', this.mainApp.userRole, '(type:', typeof this.mainApp.userRole, ')');

    if (this.mainApp.currentUser) {
      this.mainApp.userEmail.textContent = this.mainApp.currentUser.email;
      this.mainApp.userRoleDisplay.textContent = this.mainApp.userRole.toUpperCase();
      this.mainApp.userRoleDisplay.className = `user-role ${this.mainApp.userRole}`;

      const adminBtn = document.getElementById('admin-dashboard-btn');
      console.log('🔘 Admin button element:', adminBtn);

      const isAdmin = this.mainApp.userRole === 'admin';
      console.log('👑 Is admin check:', this.mainApp.userRole, '=== "admin" =', isAdmin);

      if (isAdmin) {
        console.log('✅ Showing admin dashboard button');
        adminBtn.classList.remove('hidden');
      } else {
        console.log('❌ Hiding admin dashboard button');
        adminBtn.classList.add('hidden');
      }

      console.log('🔘 Admin button classes:', adminBtn.className);
      console.log('👁️ Admin button visibility:', window.getComputedStyle(adminBtn).display);
    } else {
      console.log('❌ No current user in updateUserDisplay');
    }
  }

  showAuthenticatedUI() {
    this.mainApp.authForms.classList.add('hidden');
    this.mainApp.userInfo.classList.remove('hidden');
    this.mainApp.mainInterface.classList.remove('hidden');
    this.clearAuthMessage();
  }

  showUnauthenticatedUI() {
    this.mainApp.userInfo.classList.add('hidden');
    this.mainApp.authForms.classList.remove('hidden');
    this.mainApp.mainInterface.classList.add('hidden');
    this.clearAuthMessage();
  }



  showAuthMessage(message, type) {
    this.mainApp.authMessage.textContent = message;
    this.mainApp.authMessage.className = `auth-message ${type}`;
    this.mainApp.authMessage.style.display = 'block';
  }

  clearAuthMessage() {
    this.mainApp.authMessage.style.display = 'none';
    this.mainApp.authMessage.textContent = '';
  }

  updatePermissionStatus(statusClass, icon, text) {
    this.mainApp.permissionStatus.className = `permission-info ${statusClass}`;
    this.mainApp.micIcon.textContent = icon;
    this.mainApp.permissionText.textContent = text;
    this.mainApp.permissionStatus.classList.remove('hidden');
  }

  updatePermissionDisplay(state) {
    switch (state) {
      case 'granted':
        this.updatePermissionStatus('granted', '✅', 'Microphone: Allowed');
        break;
      case 'denied':
        this.updatePermissionStatus('denied', '❌', 'Microphone: Blocked - Click lock icon to allow');
        break;
      case 'prompt':
      default:
        this.updatePermissionStatus('unknown', '❓', 'Microphone: Click to allow when recording');
        break;
    }
  }

  showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}
