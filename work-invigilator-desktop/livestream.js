// Live Streaming Manager for Desktop App (Renderer Process)
// Handles WebRTC connection and screen/audio streaming
// NOTE: This module must be loaded in the renderer process where navigator.mediaDevices is available

const io = require('socket.io-client');
const SimplePeer = require('simple-peer');
// desktopCapturer is accessed via IPC from main process (window.electronAPI.getScreenSources)

class LiveStreamManager {
  constructor() {
    this.socket = null;
    this.peers = new Map(); // Map of viewerSocketId -> SimplePeer instance
    this.localStream = null;
    this.cameraStream = null;
    this.isStreaming = false;
    this.isCameraActive = false;
    this.currentUser = null;
    this.organizationId = null;
    this.SIGNALING_SERVER = 'http://localhost:3002';
  }

  async initialize(user, organizationId) {
    this.currentUser = user;
    this.organizationId = organizationId;

    // Connect to signaling server
    this.socket = io(this.SIGNALING_SERVER, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.setupSocketListeners();

    console.log('📡 Connecting to signaling server...');

    return new Promise((resolve) => {
      this.socket.once('connect', () => {
        resolve({ success: true });
      });
    });
  }

  setupSocketListeners() {
    this.socket.on('connect', () => {
      console.log('✅ Connected to signaling server');

      // Register as streamer
      this.socket.emit('streamer:join', {
        userId: this.currentUser.id,
        userName: this.currentUser.email,
        userEmail: this.currentUser.email,
        organizationId: this.organizationId
      });
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected from signaling server');
      this.stopAllPeers();
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });

    // Handle incoming WebRTC offers from viewers
    this.socket.on('webrtc:offer', async (data) => {
      console.log('📥 Received offer from viewer:', data.fromSocketId);
      await this.handleOffer(data.fromSocketId, data.offer);
    });

    // Handle ICE candidates from viewers
    this.socket.on('webrtc:ice-candidate', (data) => {
      console.log('🧊 Received ICE candidate from:', data.fromSocketId);
      const peer = this.peers.get(data.fromSocketId);
      if (peer) {
        peer.signal(data.candidate);
      }
    });

    // Handle camera start/stop requests from dashboard
    this.socket.on('camera:start', async () => {
      console.log('📷 Camera start requested');
      await this.startCamera();
    });

    this.socket.on('camera:stop', () => {
      console.log('📷 Camera stop requested');
      this.stopCamera();
    });
  }

  async startStreaming() {
    if (this.isStreaming) {
      console.log('Already streaming');
      return { success: true };
    }

    try {
      // Capture screen + audio from Electron renderer
      const stream = await this.captureScreenAndAudio();

      if (!stream) {
        throw new Error('Failed to capture screen and audio');
      }

      this.localStream = stream;
      this.isStreaming = true;

      console.log('✅ Started streaming with tracks:', {
        video: stream.getVideoTracks().length,
        audio: stream.getAudioTracks().length
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to start streaming:', error);
      return { success: false, error: error.message };
    }
  }

  async captureScreenAndAudio() {
    try {
      console.log('🎥 Starting screen, audio, and camera capture...');

      // Check if navigator.mediaDevices is available
      if (!navigator || !navigator.mediaDevices) {
        throw new Error('navigator.mediaDevices not available. This must run in renderer process.');
      }

      // Get screen sources via IPC (from main process where desktopCapturer is available)
      console.log('📡 Requesting screen sources from main process...');
      const sourcesResult = await window.electronAPI.getScreenSources();

      if (!sourcesResult.success) {
        throw new Error(`Failed to get screen sources: ${sourcesResult.error}`);
      }

      const sources = sourcesResult.sources;
      console.log(`✅ Received ${sources.length} screen sources from main process`);

      if (sources.length === 0) {
        throw new Error('No screen sources found');
      }

      console.log(`📺 Found ${sources.length} screen sources`);

      // Get primary screen
      const primaryScreen = sources[0];
      console.log('🖥️ Using screen:', primaryScreen.name);

      // Get video stream from screen
      const videoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: primaryScreen.id,
            minWidth: 1280,
            maxWidth: 1920,
            minHeight: 720,
            maxHeight: 1080,
            minFrameRate: 15,
            maxFrameRate: 30
          }
        }
      });

      console.log('✅ Screen capture successful');

      // Get audio stream from microphone
      let audioStream = null;
      try {
        audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000
          },
          video: false
        });
        console.log('✅ Audio capture successful');
      } catch (audioError) {
        console.warn('⚠️ Could not capture audio:', audioError.message);
        console.log('Continuing with video only');
      }

      // Get camera stream from webcam
      let cameraStream = null;
      try {
        console.log('📷 Starting camera capture...');
        cameraStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30 }
          },
          audio: false
        });

        this.cameraStream = cameraStream;
        this.isCameraActive = true;
        console.log('✅ Camera capture successful');

        // Log the camera track label
        const cameraTrack = cameraStream.getVideoTracks()[0];
        console.log('📷 Camera track label:', cameraTrack.label);
      } catch (cameraError) {
        console.warn('⚠️ Could not capture camera:', cameraError.message);
        console.log('Continuing without camera');
      }

      // Combine screen, audio, and camera tracks
      const tracks = [...videoStream.getVideoTracks()];
      if (audioStream) {
        tracks.push(...audioStream.getAudioTracks());
      }
      if (cameraStream) {
        tracks.push(...cameraStream.getVideoTracks());
      }

      const combinedStream = new MediaStream(tracks);

      console.log('📹 Combined stream created:', {
        screenTracks: videoStream.getVideoTracks().length,
        audioTracks: audioStream ? audioStream.getAudioTracks().length : 0,
        cameraTracks: cameraStream ? cameraStream.getVideoTracks().length : 0
      });

      return combinedStream;
    } catch (error) {
      console.error('❌ Error capturing screen and audio:', error);
      throw error;
    }
  }

  async handleOffer(viewerSocketId, offer) {
    try {
      if (!this.localStream) {
        console.error('❌ No local stream available');
        return;
      }

      console.log('🤝 Creating peer connection for viewer:', viewerSocketId);
      console.log('📹 Local stream tracks:', {
        video: this.localStream.getVideoTracks().map(t => `${t.label} (${t.id.substring(0, 8)})`),
        audio: this.localStream.getAudioTracks().map(t => `${t.label} (${t.id.substring(0, 8)})`)
      });

      // Create peer connection for this viewer
      const peer = new SimplePeer({
        initiator: false,
        trickle: true,
        stream: this.localStream,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      // Handle signals (ICE candidates)
      peer.on('signal', (data) => {
        if (data.type === 'answer') {
          console.log('📤 Sending answer to viewer:', viewerSocketId);
          this.socket.emit('webrtc:answer', {
            toSocketId: viewerSocketId,
            answer: data
          });
        } else if (data.candidate) {
          console.log('🧊 Sending ICE candidate to viewer:', viewerSocketId);
          this.socket.emit('webrtc:ice-candidate', {
            targetSocketId: viewerSocketId,
            candidate: data
          });
        }
      });

      peer.on('connect', () => {
        console.log('✅ Connected to viewer:', viewerSocketId);
      });

      peer.on('close', () => {
        console.log('❌ Peer connection closed:', viewerSocketId);
        this.peers.delete(viewerSocketId);
      });

      peer.on('error', (error) => {
        console.error('❌ Peer error:', error);
        this.peers.delete(viewerSocketId);
      });

      // Store peer
      this.peers.set(viewerSocketId, peer);

      // Signal the offer
      peer.signal(offer);

    } catch (error) {
      console.error('❌ Error handling offer:', error);
    }
  }

  async startCamera() {
    if (this.isCameraActive) {
      console.log('Camera already active');
      return;
    }

    try {
      console.log('📷 Starting camera capture...');

      // Capture webcam video
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      this.isCameraActive = true;
      console.log('✅ Camera capture successful');

      // Combine camera with existing screen/audio stream
      const cameraTrack = this.cameraStream.getVideoTracks()[0];
      cameraTrack.contentHint = 'detail'; // Mark as camera track

      // Add label to identify it as camera
      Object.defineProperty(cameraTrack, 'label', {
        value: 'webcam-camera',
        writable: false
      });

      this.localStream.addTrack(cameraTrack);
      console.log('📷 Added camera track to local stream');

      // Notify dashboard that camera is ready
      this.socket.emit('camera:ready', {
        userId: this.currentUser.id
      });

    } catch (error) {
      console.error('❌ Error starting camera:', error);
    }
  }

  stopCamera() {
    if (!this.isCameraActive) return;

    console.log('📷 Stopping camera');

    // Remove camera track from local stream
    if (this.cameraStream && this.localStream) {
      const cameraTrack = this.cameraStream.getVideoTracks()[0];
      this.localStream.removeTrack(cameraTrack);
      console.log('📷 Removed camera track from local stream');

      // Stop camera stream
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }

    this.isCameraActive = false;

    // Notify dashboard that camera is stopped
    this.socket.emit('camera:stopped', {
      userId: this.currentUser.id
    });
  }

  stopStreaming() {
    if (!this.isStreaming) return;

    console.log('🛑 Stopping live stream');

    // Stop camera if active
    this.stopCamera();

    // Stop all peer connections
    this.stopAllPeers();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }

    this.isStreaming = false;
  }

  stopAllPeers() {
    this.peers.forEach((peer, socketId) => {
      console.log('Closing peer connection:', socketId);
      peer.destroy();
    });
    this.peers.clear();
  }

  disconnect() {
    this.stopStreaming();

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      isConnected: this.socket?.connected || false,
      activePeers: this.peers.size,
      hasStream: !!this.localStream
    };
  }
}

// Export for use in renderer process
// When loaded as script tag with nodeIntegration: true, expose globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveStreamManager;
}

// Also expose globally for script tag loading
if (typeof window !== 'undefined') {
  window.LiveStreamManager = LiveStreamManager;
}
