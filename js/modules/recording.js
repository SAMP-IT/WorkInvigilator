// Recording Module
class RecordingManager {
  constructor(mainApp) {
    this.mainApp = mainApp;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.audioBlob = null;
    this.audioUrl = null;
    this.isRecording = false;
    this.audioStartTime = null;
    this.audioTimerInterval = null;
    this.sessionChunks = [];
    this.chunkInterval = null;
    this.CHUNK_DURATION = 5 * 60 * 1000; // 5 minutes
  }

  async startAudioRecording() {
    console.log('🎤 Requesting microphone access...');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      console.log('✅ Microphone access granted, stream obtained');

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      console.log('📼 MediaRecorder created with MIME type:', this.mediaRecorder.mimeType);

      this.sessionChunks = [];
      this.currentChunkStartTime = Date.now();
      this.audioStartTime = Date.now();
      console.log('🔄 Chunking variables reset, start time:', new Date(this.audioStartTime).toLocaleTimeString());

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

        this.mainApp.updateUI('stopped');
      };

      console.log('▶️ Starting MediaRecorder...');
      this.mediaRecorder.start(1000);
      this.isRecording = true;
      console.log('✅ MediaRecorder started, collecting data every 1000ms');

      const CHUNK_DURATION = 5 * 60 * 1000;
      console.log(`⏰ Setting up chunking interval: ${CHUNK_DURATION/1000}s`);
      this.chunkInterval = setInterval(async () => {
        if (this.isRecording && this.audioChunks.length > 0) {
          console.log('💾 Saving current chunk...');
          await this.saveCurrentChunk();
          this.audioChunks = [];
          this.currentChunkStartTime = Date.now();
          console.log('🔄 Started new chunk at:', new Date(this.currentChunkStartTime).toLocaleTimeString());
        }
      }, CHUNK_DURATION);

      this.mainApp.updateAudioStatus('Recording...');
      this.startAudioTimer();

    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      this.handleRecordingError(error);
    }
  }

  stopAudioRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.stopAudioTimer();
      this.mainApp.updateAudioStatus('Stopped');
    }
  }

  pauseAudioRecording() {
    if (this.mediaRecorder && this.isRecording && !this.mediaRecorder.paused) {
      this.mediaRecorder.pause();
      this.stopAudioTimer();
    }
  }

  resumeAudioRecording() {
    if (this.mediaRecorder && this.isRecording && this.mediaRecorder.paused) {
      this.mediaRecorder.resume();
      this.startAudioTimer();
    }
  }

  startAudioTimer() {
    this.audioTimerInterval = setInterval(() => {
      if (this.audioStartTime) {
        const elapsed = Date.now() - this.audioStartTime;
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const displaySeconds = (seconds % 60).toString().padStart(2, '0');
        const displayMinutes = (minutes % 60).toString().padStart(2, '0');
        const displayHours = hours.toString().padStart(2, '0');

        this.mainApp.updateAudioStatus(`Recording (${displayHours}:${displayMinutes}:${displaySeconds})`);
      }
    }, 1000);
  }

  stopAudioTimer() {
    if (this.audioTimerInterval) {
      clearInterval(this.audioTimerInterval);
      this.audioTimerInterval = null;
    }
  }

  async saveCurrentChunk() {
    if (!this.mainApp.auth.supabaseUrl || !this.mainApp.auth.supabaseKey || !this.mainApp.currentUser || this.audioChunks.length === 0) {
      return;
    }

    try {
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const chunkDuration = Math.floor((Date.now() - this.currentChunkStartTime) / 1000);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkNumber = this.sessionChunks.length + 1;
      const filename = `${this.mainApp.currentUser.id}/chunk_${chunkNumber}_${timestamp}.webm`;

      const { data: uploadData, error: uploadError } = await this.mainApp.supabase.storage
        .from('audio-recordings')
        .upload(filename, chunkBlob);

      if (uploadError) {
        console.error('Chunk upload error:', uploadError);
        return;
      }

      const { data: urlData } = this.mainApp.supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename);

      const { error: dbError } = await this.mainApp.supabase
        .from('recording_chunks')
        .insert([{
          user_id: this.mainApp.currentUser.id,
          organization_id: this.mainApp.organizationId,
          session_start_time: new Date(this.audioStartTime).toISOString(),
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration_seconds: chunkDuration,
          chunk_start_time: new Date(this.currentChunkStartTime).toISOString()
        }]);

      if (dbError) {
        console.error('Chunk database error:', dbError);
      } else {
        this.sessionChunks.push({
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration: chunkDuration
        });
      }

    } catch (error) {
      console.error('Save chunk error:', error);
    }
  }

  async saveSessionSummary() {
    if (!this.mainApp.supabase || !this.mainApp.currentUser || this.sessionChunks.length === 0) {
      return;
    }

    try {
      const sessionDuration = Math.floor((Date.now() - this.audioStartTime) / 1000);
      const totalChunks = this.sessionChunks.length;
      const totalChunkDuration = this.sessionChunks.reduce((sum, chunk) => sum + chunk.duration, 0);

      const { error } = await this.mainApp.supabase
        .from('recording_sessions')
        .insert([{
          user_id: this.mainApp.currentUser.id,
          organization_id: this.mainApp.organizationId,
          session_start_time: new Date(this.audioStartTime).toISOString(),
          session_end_time: new Date().toISOString(),
          total_duration_seconds: sessionDuration,
          total_chunks: totalChunks,
          total_chunk_duration_seconds: totalChunkDuration,
          chunk_files: this.sessionChunks.map(chunk => ({
            chunk_number: chunk.chunk_number,
            filename: chunk.filename,
            file_url: chunk.file_url,
            duration: chunk.duration
          }))
        }]);

      if (error) {
        console.error('Session summary error:', error);
      } else {
        console.log(`Session saved: ${totalChunks} chunks, ${totalChunkDuration}s audio`);
      }

    } catch (error) {
      console.error('Save session summary error:', error);
    }
  }

  async saveRecording() {
    if (!this.mainApp.supabase || !this.mainApp.currentUser) {
      console.warn('Supabase not initialized or user not logged in');
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${this.mainApp.currentUser.id}/recording_${timestamp}.webm`;
      const duration = this.audioStartTime ? Math.floor((Date.now() - this.audioStartTime) / 1000) : 0;

      const { data: uploadData, error: uploadError } = await this.mainApp.supabase.storage
        .from('audio-recordings')
        .upload(filename, this.audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        this.mainApp.showToast('Failed to save recording', 'error');
        return;
      }

      const { data: urlData } = this.mainApp.supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename);

      const { error: dbError } = await this.mainApp.supabase
        .from('recordings')
        .insert([{
          user_id: this.mainApp.currentUser.id,
          filename: filename,
          duration: duration,
          file_url: urlData.publicUrl
        }]);

      if (dbError) {
        console.error('Database error:', dbError);
        this.mainApp.showToast('Recording uploaded but metadata not saved', 'warning');
      } else {
        this.mainApp.showToast('Recording saved successfully', 'success');
      }

      // Audio chunk successfully saved to Supabase bucket and database
      console.log('🎤 Audio chunk saved to Supabase:', filename);

    } catch (error) {
      console.error('Save recording error:', error);
      this.mainApp.showToast('Failed to save recording', 'error');
    }
  }

  saveToLocalStorage(type, item) {
    chrome.storage.local.get([type], (result) => {
      const items = result[type] || [];
      items.unshift(item);

      const maxItems = type === 'recordings' ? 5 : 10;
      if (items.length > maxItems) {
        items.splice(maxItems);
      }

      chrome.storage.local.set({ [type]: items });
    });
  }

  handleRecordingError(error) {
    let title = 'Recording Error';
    let message = '';
    let action = '';

    switch (error.name) {
      case 'NotAllowedError':
        title = 'Microphone Permission Denied';
        message = 'You denied microphone access or dismissed the permission prompt.';
        action = 'Click the lock icon in the address bar and allow microphone access, then try recording again.';
        break;

      case 'NotFoundError':
        title = 'No Microphone Found';
        message = 'No microphone was found on your device.';
        action = 'Make sure your microphone is connected and try again.';
        break;

      case 'NotReadableError':
        title = 'Microphone Already in Use';
        message = 'Your microphone is being used by another application.';
        action = 'Close other applications using the microphone and try again.';
        break;

      case 'OverconstrainedError':
        title = 'Microphone Constraints Error';
        message = 'The requested microphone settings are not supported.';
        action = 'Try using different microphone settings.';
        break;

      case 'SecurityError':
        title = 'Security Error';
        message = 'Microphone access is blocked due to security restrictions.';
        action = 'Make sure you\'re using HTTPS or localhost.';
        break;

      default:
        title = 'Recording Error';
        message = `An unexpected error occurred: ${error.message}`;
        action = 'Please try again or check your microphone settings.';
        break;
    }

    this.mainApp.updateStatus(`${title}: ${message}`);

    alert(`${title}\n\n${message}\n\n${action}`);

    if (error.name === 'NotAllowedError') {
      this.mainApp.updatePermissionStatus('denied', '❌', 'Microphone: Permission denied - Click lock icon to allow');
      setTimeout(() => {
        if (confirm('Would you like to try recording again?')) {
          this.startAudioRecording();
        }
      }, 1000);
    }
  }
}
