// Welcome page for Audio Recorder Extension
// This page pre-requests microphone permission on first install

class WelcomePage {
  constructor() {
    this.grantBtn = document.getElementById('grant-btn');
    this.skipBtn = document.getElementById('skip-btn');
    this.statusDiv = document.getElementById('status');

    this.bindEvents();
  }

  bindEvents() {
    this.grantBtn.addEventListener('click', () => this.requestMicrophonePermission());
    this.skipBtn.addEventListener('click', () => this.skipAndClose());
  }

  async requestMicrophonePermission() {
    try {
      this.showStatus('Requesting microphone access...', 'info');
      this.grantBtn.disabled = true;
      this.grantBtn.textContent = 'Requesting...';

      // Request microphone access with good audio settings
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
          channelCount: 1
        }
      });

      // Success! Stop the stream immediately since we just wanted permission
      stream.getTracks().forEach(track => track.stop());

      this.showStatus('✅ Microphone access granted! You can now use the extension.', 'success');

      // Close the tab after a short delay
      setTimeout(() => {
        this.closeTab();
      }, 2000);

    } catch (error) {
      console.error('Microphone permission error:', error);
      this.handlePermissionError(error);
    }
  }

  handlePermissionError(error) {
    this.grantBtn.disabled = false;
    this.grantBtn.textContent = 'Try Again';

    let message = '';
    let action = '';

    switch (error.name) {
      case 'NotAllowedError':
        message = '❌ Microphone access was denied or dismissed.';
        action = 'Click the lock icon in the address bar to allow microphone access, then try again.';
        break;

      case 'NotFoundError':
        message = '❌ No microphone was found on your device.';
        action = 'Make sure your microphone is connected and try again.';
        break;

      case 'NotReadableError':
        message = '❌ Microphone is being used by another application.';
        action = 'Close other applications using the microphone and try again.';
        break;

      default:
        message = `❌ Error: ${error.message}`;
        action = 'Please try again or check your microphone settings.';
        break;
    }

    this.showStatus(`${message}\n\n${action}`, 'error');
  }

  showStatus(message, type) {
    this.statusDiv.textContent = message;
    this.statusDiv.className = `status ${type}`;
    this.statusDiv.style.display = 'block';
  }

  skipAndClose() {
    this.closeTab();
  }

  closeTab() {
    // Try to close the current tab
    try {
      chrome.tabs.getCurrent((tab) => {
        if (tab) {
          chrome.tabs.remove(tab.id);
        } else {
          // Fallback: close window
          window.close();
        }
      });
    } catch (error) {
      // Fallback: close window
      window.close();
    }
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  new WelcomePage();
});
