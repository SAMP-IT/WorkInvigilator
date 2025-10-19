// Live Streaming Manager for Desktop App (Renderer Process) - Supabase Realtime Version
// Handles WebRTC connection and screen/audio streaming using Supabase Realtime instead of Socket.IO
// NOTE: This module must be loaded in the renderer process where navigator.mediaDevices is available

const { createClient } = require('@supabase/supabase-js');
const SimplePeer = require('simple-peer');

class LiveStreamManager {
  constructor() {
    this.supabase = null;
    this.channel = null;
    this.presenceKey = null; // Store our presence key (like socket.id)
    this.peers = new Map(); // Map of viewerPresenceKey -> SimplePeer instance
    this.localStream = null;
    this.cameraStream = null;
    this.isStreaming = false;
    this.isCameraActive = false;
    this.currentUser = null;
    this.organizationId = null;
    this.isConnected = false;
  }

  async initialize(user, organizationId, supabaseUrl, supabaseAnonKey) {
    this.currentUser = user;
    this.organizationId = organizationId;

    // Create Supabase client
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });

    console.log('📡 Connecting to Supabase Realtime...');

    // Create organization-specific channel for WebRTC signaling
    const channelName = `live-monitoring:${organizationId}`;

    // Use compound key (userId:role) to allow same user to be both viewer and streamer
    this.presenceKey = `${user.id}:streamer`;

    this.channel = this.supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false // Don't receive our own messages
        },
        presence: {
          key: this.presenceKey
        }
      }
    });

    // Set up channel listeners
    await this.setupChannelListeners();

    // Subscribe to channel
    const subscriptionStatus = await this.channel.subscribe(async (status) => {
      console.log(`📡 Channel subscription status: ${status}`);

      if (status === 'SUBSCRIBED') {
        this.isConnected = true;
        console.log('✅ Connected to Supabase Realtime');

        // Track presence as streamer
        await this.channel.track({
          userId: this.currentUser.id,
          userName: this.currentUser.email,
          userEmail: this.currentUser.email,
          role: 'streamer',
          streamActive: true,
          connectedAt: new Date().toISOString()
        });

        console.log('✅ Registered as streamer');
      }
    });

    return { success: true };
  }

  async setupChannelListeners() {
    // Listen for presence changes
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel.presenceState();
        console.log('👥 Presence sync:', state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👤 User joined:', key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences);
      });

    // Listen for broadcast messages
    this.channel
      .on('broadcast', { event: 'signaling' }, ({ payload }) => {
        console.log('📨 Received broadcast:', payload);
        this.handleSignalingMessage(payload);
      });
  }

  handleSignalingMessage(message) {
    // Ignore messages not meant for us (check presence key, not userId)
    if (message.to && message.to !== this.presenceKey) {
      return;
    }

    console.log('📨 Processing message for presence key:', this.presenceKey);

    switch (message.type) {
      case 'webrtc:offer':
        console.log('📥 Received offer from viewer:', message.from, '(userId:', message.fromUserId, ')');
        this.handleOffer(message.from, message.fromUserId, message.payload.offer);
        break;

      case 'webrtc:ice-candidate':
        console.log('🧊 Received ICE candidate from:', message.from, '(userId:', message.fromUserId, ')');
        const peer = this.peers.get(message.from); // Use presence key
        if (peer) {
          // SimplePeer expects the full signal object
          peer.signal(message.payload.candidate);
        } else {
          console.warn('⚠️ No peer found for presence key:', message.from);
        }
        break;
    }
  }

  async sendAnswer(viewerPresenceKey, viewerUserId, answer) {
    const message = {
      type: 'webrtc:answer',
      from: this.presenceKey, // Our presence key
      fromUserId: this.currentUser.id,
      to: viewerPresenceKey, // Target presence key
      toUserId: viewerUserId,
      payload: { answer },
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending answer to viewer:', viewerPresenceKey, '(userId:', viewerUserId, ')');
    await this.channel.send({
      type: 'broadcast',
      event: 'signaling',
      payload: message
    });
  }

  async sendIceCandidate(viewerPresenceKey, viewerUserId, candidate) {
    const message = {
      type: 'webrtc:ice-candidate',
      from: this.presenceKey, // Our presence key
      fromUserId: this.currentUser.id,
      to: viewerPresenceKey, // Target presence key
      toUserId: viewerUserId,
      payload: { candidate },
      timestamp: new Date().toISOString()
    };

    console.log('🧊 Sending ICE candidate to viewer:', viewerPresenceKey, '(userId:', viewerUserId, ')');
    await this.channel.send({
      type: 'broadcast',
      event: 'signaling',
      payload: message
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
        console.log('📷 Camera track:', {
          label: cameraTrack.label,
          id: cameraTrack.id,
          enabled: cameraTrack.enabled,
          readyState: cameraTrack.readyState,
          width: cameraTrack.getSettings().width,
          height: cameraTrack.getSettings().height
        });
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

      console.log('📹 Combined stream created with tracks:', {
        total: tracks.length,
        screen: videoStream.getVideoTracks().map(t => ({ label: t.label, id: t.id.substring(0, 8), kind: t.kind })),
        audio: audioStream ? audioStream.getAudioTracks().map(t => ({ label: t.label, id: t.id.substring(0, 8), kind: t.kind })) : [],
        camera: cameraStream ? cameraStream.getVideoTracks().map(t => ({ label: t.label, id: t.id.substring(0, 8), kind: t.kind })) : []
      });

      return combinedStream;
    } catch (error) {
      console.error('❌ Error capturing screen and audio:', error);
      throw error;
    }
  }

  async handleOffer(viewerPresenceKey, viewerUserId, offer) {
    try {
      if (!this.localStream) {
        console.error('❌ No local stream available');
        return;
      }

      console.log('🤝 Creating peer connection for viewer:', viewerPresenceKey, '(userId:', viewerUserId, ')');
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
          console.log('📤 Sending answer to viewer:', viewerPresenceKey, '(userId:', viewerUserId, ')');
          this.sendAnswer(viewerPresenceKey, viewerUserId, data);
        } else if (data.candidate) {
          console.log('🧊 Sending ICE candidate to viewer:', viewerPresenceKey, '(userId:', viewerUserId, ')');
          this.sendIceCandidate(viewerPresenceKey, viewerUserId, data);
        }
      });

      peer.on('connect', () => {
        console.log('✅ Connected to viewer:', viewerPresenceKey);
      });

      peer.on('close', () => {
        console.log('❌ Peer connection closed:', viewerPresenceKey);
        this.peers.delete(viewerPresenceKey);
      });

      peer.on('error', (error) => {
        console.error('❌ Peer error:', error);
        this.peers.delete(viewerPresenceKey);
      });

      // Store peer using presence key
      this.peers.set(viewerPresenceKey, peer);

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
    this.peers.forEach((peer, userId) => {
      console.log('Closing peer connection:', userId);
      peer.destroy();
    });
    this.peers.clear();
  }

  async disconnect() {
    this.stopStreaming();

    if (this.channel) {
      console.log('🔌 Disconnecting from Supabase Realtime channel');
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.isConnected = false;
  }

  getStatus() {
    return {
      isStreaming: this.isStreaming,
      isConnected: this.isConnected,
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
