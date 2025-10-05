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
          const totalSize = this.audioChunks.reduce((sum, c) => sum + c.size, 0);
          console.log(`[${new Date().toISOString()}] 📥 Audio data received:`, {
            chunkSize: (event.data.size / 1024).toFixed(2) + 'KB',
            totalChunks: this.audioChunks.length,
            totalSize: (totalSize / 1024).toFixed(2) + 'KB'
          });
        }
      };

      // Add error handler for MediaRecorder
      this.mediaRecorder.onerror = (event) => {
        console.error(`[${new Date().toISOString()}] ❌ MediaRecorder ERROR:`, {
          error: event.error,
          state: this.mediaRecorder.state,
          chunkCount: this.audioChunks.length,
          elapsedTime: Math.floor((Date.now() - this.audioStartTime) / 1000) + 's'
        });
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
        console.log(`[${new Date().toISOString()}] ⏰ Chunk interval triggered:`, {
          isRecording: this.isRecording,
          chunksReady: this.audioChunks.length,
          sessionChunksSaved: this.sessionChunks.length,
          elapsedSinceLastSave: Math.floor((Date.now() - this.currentChunkStartTime) / 1000) + 's'
        });

        if (this.isRecording && this.audioChunks.length > 0) {
          console.log(`[${new Date().toISOString()}] 💾 Starting chunk save process...`);
          const saveStartTime = Date.now();

          await this.saveCurrentChunk();

          const saveDuration = Date.now() - saveStartTime;
          console.log(`[${new Date().toISOString()}] ✅ Chunk save completed in ${saveDuration}ms`);

          this.audioChunks = [];
          this.currentChunkStartTime = Date.now();
          console.log(`[${new Date().toISOString()}] 🔄 Started new chunk at:`, new Date().toLocaleTimeString());
        } else {
          console.warn(`[${new Date().toISOString()}] ⚠️ Chunk interval skipped:`, {
            isRecording: this.isRecording,
            chunksReady: this.audioChunks.length
          });
        }
      }, CHUNK_DURATION);

      // Add health check logging every 30 seconds
      setInterval(() => {
        if (this.mediaRecorder) {
          console.log(`[${new Date().toISOString()}] 📊 MediaRecorder Health Check:`, {
            state: this.mediaRecorder.state,
            isRecording: this.isRecording,
            chunksInMemory: this.audioChunks.length,
            sessionChunksSaved: this.sessionChunks.length,
            elapsedTime: Math.floor((Date.now() - this.audioStartTime) / 1000) + 's',
            memoryUsage: performance.memory ? Math.floor(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB' : 'N/A'
          });
        }
      }, 30000); // Every 30 seconds

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
    const logPrefix = `[${new Date().toISOString()}] [saveCurrentChunk]`;

    console.log(`${logPrefix} 🚀 Starting chunk save process...`);

    // Validation checks with detailed logging
    if (!this.mainApp.auth.supabaseUrl) {
      console.error(`${logPrefix} ❌ No Supabase URL configured`);
      return;
    }
    if (!this.mainApp.auth.supabaseKey) {
      console.error(`${logPrefix} ❌ No Supabase key configured`);
      return;
    }
    if (!this.mainApp.currentUser) {
      console.error(`${logPrefix} ❌ No current user`);
      return;
    }
    if (this.audioChunks.length === 0) {
      console.warn(`${logPrefix} ⚠️ No audio chunks to save`);
      return;
    }

    try {
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      const chunkDuration = Math.floor((Date.now() - this.currentChunkStartTime) / 1000);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const chunkNumber = this.sessionChunks.length + 1;
      const filename = `${this.mainApp.currentUser.id}/chunk_${chunkNumber}_${timestamp}.webm`;

      console.log(`${logPrefix} 📦 Chunk prepared:`, {
        chunkNumber,
        filename,
        sizeKB: (chunkBlob.size / 1024).toFixed(2),
        durationSeconds: chunkDuration,
        audioChunksCount: this.audioChunks.length
      });

      // Upload to Supabase Storage
      console.log(`${logPrefix} 📤 Uploading to Supabase storage...`);
      const uploadStartTime = Date.now();

      const { data: uploadData, error: uploadError } = await this.mainApp.supabase.storage
        .from('audio-recordings')
        .upload(filename, chunkBlob);

      const uploadDuration = Date.now() - uploadStartTime;

      if (uploadError) {
        console.error(`${logPrefix} ❌ Storage upload FAILED (${uploadDuration}ms):`, {
          error: uploadError,
          errorMessage: uploadError.message,
          errorCode: uploadError.statusCode,
          filename,
          size: chunkBlob.size
        });
        return;
      }

      console.log(`${logPrefix} ✅ Storage upload SUCCESS (${uploadDuration}ms):`, {
        filename,
        uploadData
      });

      // Get public URL
      const { data: urlData } = this.mainApp.supabase.storage
        .from('audio-recordings')
        .getPublicUrl(filename);

      console.log(`${logPrefix} 🔗 Public URL generated:`, urlData.publicUrl);

      // Insert database record
      console.log(`${logPrefix} 💾 Inserting database record...`);
      const dbStartTime = Date.now();

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

      const dbDuration = Date.now() - dbStartTime;

      if (dbError) {
        console.error(`${logPrefix} ❌ Database insert FAILED (${dbDuration}ms):`, {
          error: dbError,
          errorMessage: dbError.message,
          errorCode: dbError.code,
          chunkNumber,
          filename
        });
      } else {
        this.sessionChunks.push({
          chunk_number: chunkNumber,
          filename: filename,
          file_url: urlData.publicUrl,
          duration: chunkDuration
        });

        console.log(`${logPrefix} ✅ Database insert SUCCESS (${dbDuration}ms):`, {
          chunkNumber,
          totalSessionChunks: this.sessionChunks.length,
          chunkDuration
        });
      }

    } catch (error) {
      console.error(`${logPrefix} ❌ EXCEPTION during save:`, {
        error,
        errorName: error.name,
        errorMessage: error.message,
        errorStack: error.stack
      });
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
