// Storage Module
class StorageManager {
  constructor(mainApp) {
    this.mainApp = mainApp;
  }

  saveMonitoringState() {
    const state = {
      isMonitoring: this.mainApp.isMonitoring,
      isOnBreak: this.mainApp.isOnBreak,
      sessionStartTime: this.mainApp.sessionStartTime,
      breakStartTime: this.mainApp.breakStartTime,
      timestamp: Date.now()
    };

    chrome.storage.local.set({ monitoringState: state });
  }

  loadMonitoringState() {
    chrome.storage.local.get(['monitoringState'], (result) => {
      const state = result.monitoringState;
      if (state && state.isMonitoring) {
        this.mainApp.isMonitoring = true;
        this.mainApp.sessionStartTime = state.sessionStartTime;

        if (state.isOnBreak) {
          this.mainApp.isOnBreak = true;
          this.mainApp.breakStartTime = state.breakStartTime;
          this.mainApp.ui.updateBreakUI('paused');
          this.mainApp.ui.updateAudioStatus('Paused (on break)');
          this.mainApp.ui.updateScreenshotStatus('Paused (on break)');
        }

        this.mainApp.ui.updateToggleUI('on');
        this.mainApp.startSessionTimer();

        const statusMsg = this.mainApp.isOnBreak
          ? '✅ Work Invigilator active (on break - restored from previous session)'
          : '✅ Work Invigilator active (restored from previous session)';
        this.mainApp.ui.updateStatus(statusMsg);
      }
    });
  }

  saveBreakState() {
    const breakState = {
      isOnBreak: this.mainApp.isOnBreak,
      breakStartTime: this.mainApp.breakStartTime,
      dailyBreakDuration: this.mainApp.dailyBreakDuration,
      breakHistory: this.mainApp.breakHistory
    };
    chrome.storage.local.set({ breakState: breakState });
  }

  loadBreakState() {
    chrome.storage.local.get(['breakState'], (result) => {
      const state = result.breakState;
      if (state) {
        this.mainApp.isOnBreak = state.isOnBreak || false;
        this.mainApp.breakStartTime = state.breakStartTime || null;
        this.mainApp.dailyBreakDuration = state.dailyBreakDuration || 0;
        this.mainApp.breakHistory = state.breakHistory || [];

        if (this.mainApp.isOnBreak) {
          this.mainApp.ui.updateBreakUI('paused');
          this.mainApp.ui.updateAudioStatus('Paused (on break)');
          this.mainApp.ui.updateScreenshotStatus('Paused (on break)');
        }
      }
    });
  }

  async saveBreakSession(breakDuration) {
    if (!this.mainApp.supabase || !this.mainApp.currentUser) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await this.mainApp.supabase
        .from('break_sessions')
        .insert([{
          user_id: this.mainApp.currentUser.id,
          organization_id: this.mainApp.organizationId,
          break_date: today,
          break_start_time: new Date(this.mainApp.breakStartTime).toISOString(),
          break_end_time: new Date().toISOString(),
          break_duration_ms: breakDuration,
          session_type: 'manual'
        }]);

      if (error) {
        console.error('Break session save error:', error);
      }

    } catch (error) {
      console.error('Save break session error:', error);
    }
  }

  loadRecordings() {
    chrome.storage.local.get(['recordings'], (result) => {
      const recordings = result.recordings || [];
      this.displayRecordings(recordings);
    });
  }

  displayRecordings(recordings) {
    this.mainApp.recordingsList.innerHTML = '';

    if (recordings.length === 0) {
      this.mainApp.recordingsList.innerHTML = '<div style="text-align: center; color: #718096; font-style: italic;">No recordings yet</div>';
      return;
    }

    recordings.forEach((recording, index) => {
      const item = document.createElement('div');
      item.className = 'recording-item';

      const date = new Date(recording.timestamp).toLocaleString();
      const duration = this.formatDuration(recording.duration);

      item.innerHTML = `
        <div class="filename">${recording.filename}</div>
        <div class="actions">
          <button class="play-recording" data-index="${index}">▶️</button>
          <button class="download-recording" data-index="${index}">💾</button>
          <button class="delete-recording" data-index="${index}">🗑️</button>
        </div>
      `;

      const playBtn = item.querySelector('.play-recording');
      const downloadBtn = item.querySelector('.download-recording');
      const deleteBtn = item.querySelector('.delete-recording');

      playBtn.addEventListener('click', () => this.playStoredRecording(recording));
      downloadBtn.addEventListener('click', () => this.downloadRecording(recording));
      deleteBtn.addEventListener('click', () => this.deleteRecording(index));

      this.mainApp.recordingsList.appendChild(item);
    });
  }

  playStoredRecording(recording) {
    const audio = new Audio(recording.data);
    audio.play();
  }

  downloadRecording(recording) {
    const link = document.createElement('a');
    link.href = recording.data;
    link.download = recording.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  deleteRecording(index) {
    if (confirm('Are you sure you want to delete this recording?')) {
      chrome.storage.local.get(['recordings'], (result) => {
        const recordings = result.recordings || [];
        recordings.splice(index, 1);
        chrome.storage.local.set({ recordings: recordings }, () => {
          this.loadRecordings();
        });
      });
    }
  }

  loadScreenshots() {
    chrome.storage.local.get(['screenshots'], (result) => {
      const screenshots = result.screenshots || [];
      this.displayScreenshots(screenshots);
    });
  }

  displayScreenshots(screenshots) {
    const screenshotSection = this.mainApp.recordingsList;
    const audioRecordings = screenshotSection.querySelectorAll('.recording-item');

    let screenshotHeader = document.querySelector('.screenshot-header');
    if (!screenshotHeader) {
      screenshotHeader = document.createElement('h3');
      screenshotHeader.className = 'screenshot-header';
      screenshotHeader.textContent = '📸 Screenshots';
      screenshotSection.parentNode.insertBefore(screenshotHeader, screenshotSection);
    }

    const existingScreenshots = screenshotSection.querySelectorAll('.screenshot-item');
    existingScreenshots.forEach(item => item.remove());

    if (screenshots.length === 0) {
      const noScreenshots = document.createElement('div');
      noScreenshots.className = 'screenshot-item';
      noScreenshots.innerHTML = '<div style="text-align: center; color: #718096; font-style: italic;">No screenshots yet</div>';
      screenshotSection.appendChild(noScreenshots);
      return;
    }

    screenshots.forEach((screenshot, index) => {
      const item = document.createElement('div');
      item.className = 'recording-item screenshot-item';

      const date = new Date(screenshot.timestamp).toLocaleString();

      item.innerHTML = `
        <div class="filename">${screenshot.filename}</div>
        <div class="actions">
          <button class="view-screenshot" data-index="${index}">👁️</button>
          <button class="download-screenshot" data-index="${index}">💾</button>
          <button class="delete-screenshot" data-index="${index}">🗑️</button>
        </div>
      `;

      const viewBtn = item.querySelector('.view-screenshot');
      const downloadBtn = item.querySelector('.download-screenshot');
      const deleteBtn = item.querySelector('.delete-screenshot');

      viewBtn.addEventListener('click', () => this.viewScreenshot(screenshot));
      downloadBtn.addEventListener('click', () => this.downloadScreenshot(screenshot));
      deleteBtn.addEventListener('click', () => this.deleteScreenshot(index));

      screenshotSection.appendChild(item);
    });
  }

  viewScreenshot(screenshot) {
    chrome.tabs.create({ url: screenshot.data });
  }

  downloadScreenshot(screenshot) {
    const link = document.createElement('a');
    link.href = screenshot.data;
    link.download = screenshot.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  deleteScreenshot(index) {
    if (confirm('Are you sure you want to delete this screenshot?')) {
      chrome.storage.local.get(['screenshots'], (result) => {
        const screenshots = result.screenshots || [];
        screenshots.splice(index, 1);
        chrome.storage.local.set({ screenshots: screenshots }, () => {
          this.loadScreenshots();
        });
      });
    }
  }

  formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDuration(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getTodaysBreakSummary() {
    const totalBreakTime = this.formatDuration(this.mainApp.dailyBreakDuration);
    const breakCount = this.mainApp.breakHistory.length;
    return { totalBreakTime, breakCount };
  }

  saveToLocalStorage(type, item) {
    chrome.storage.local.get([type], (result) => {
      const items = result[type] || [];
      items.push(item);
      chrome.storage.local.set({ [type]: items });
    });
  }
}
