'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { SupabaseRealtimeSignaling, StreamerInfo } from '@/lib/supabase-realtime-signaling';
import SimplePeer from 'simple-peer';

interface GridSize {
  cols: number;
  rows: number;
  max: number;
}

const GRID_SIZES: Record<string, GridSize> = {
  '1': { cols: 1, rows: 1, max: 1 },
  '4': { cols: 2, rows: 2, max: 4 },
  '9': { cols: 3, rows: 3, max: 9 },
  '16': { cols: 4, rows: 4, max: 16 },
  '25': { cols: 5, rows: 5, max: 25 },
  '36': { cols: 6, rows: 6, max: 36 },
  '49': { cols: 7, rows: 7, max: 49 },
  '64': { cols: 8, rows: 8, max: 64 }
};

export default function LiveMonitoringSupabasePage() {
  const { user, profile } = useAuth();
  const [signaling, setSignaling] = useState<SupabaseRealtimeSignaling | null>(null);
  const [streamers, setStreamers] = useState<StreamerInfo[]>([]);
  const [activeStreams, setActiveStreams] = useState<Set<string>>(new Set());
  const [gridSize, setGridSize] = useState<string>('9');
  const [isConnected, setIsConnected] = useState(false);
  const videoRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const cameraRefsMap = useRef<Map<string, HTMLVideoElement>>(new Map());
  const cameraStreamsMap = useRef<Map<string, MediaStream>>(new Map());
  const peersRef = useRef<Map<string, SimplePeer.Instance>>(new Map());
  const [peers, setPeers] = useState<Map<string, SimplePeer.Instance>>(new Map());
  const [mutedStreams, setMutedStreams] = useState<Set<string>>(new Set());
  const [cameraEnabled, setCameraEnabled] = useState<Set<string>>(new Set());
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);

  useEffect(() => {
    console.log('🔍 Live monitoring effect triggered:', {
      hasUser: !!user,
      hasProfile: !!profile,
      organizationId: profile?.organization_id
    });

    if (!user?.id || !profile?.organization_id) {
      console.log('⏳ Waiting for user authentication or organization ID...');
      return;
    }

    // Prevent reconnection if already connected
    if (signaling?.isConnected()) {
      console.log('Already connected to Supabase Realtime');
      return;
    }

    console.log('🔌 Attempting to connect to Supabase Realtime...');

    // Create signaling instance
    const realtimeSignaling = new SupabaseRealtimeSignaling();

    // Set up event handlers
    realtimeSignaling.on('connected', () => {
      console.log('✅ Connected to Supabase Realtime');
      setIsConnected(true);
    });

    realtimeSignaling.on('disconnected', () => {
      console.log('❌ Disconnected from Supabase Realtime');
      setIsConnected(false);
    });

    // Receive list of available streamers
    realtimeSignaling.on('streamers:list', (streamersData: StreamerInfo[]) => {
      console.log('📋 Received streamers list:', streamersData);
      setStreamers(streamersData);
    });

    // Streamer became available
    realtimeSignaling.on('streamer:available', (streamerInfo: StreamerInfo) => {
      console.log('📹 Streamer available:', streamerInfo);
      setStreamers(prev => {
        const exists = prev.find(s => s.presenceKey === streamerInfo.presenceKey);
        if (exists) {
          return prev.map(s => s.presenceKey === streamerInfo.presenceKey ? streamerInfo : s);
        }
        return [...prev, streamerInfo];
      });
    });

    // Streamer became unavailable
    realtimeSignaling.on('streamer:unavailable', (data: { userId: string }) => {
      console.log('❌ Streamer unavailable:', data.userId);
      setStreamers(prev => prev.filter(s => s.userId !== data.userId));
      setActiveStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });

      // Clean up video element
      const video = videoRefsMap.current.get(data.userId);
      if (video) {
        video.srcObject = null;
        videoRefsMap.current.delete(data.userId);
        console.log('🧹 Cleaned up video ref for:', data.userId);
      }

      // Clean up camera elements and streams
      const cameraVideo = cameraRefsMap.current.get(data.userId);
      if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraRefsMap.current.delete(data.userId);
        console.log('🧹 Cleaned up camera ref for:', data.userId);
      }
      cameraStreamsMap.current.delete(data.userId);
      console.log('🧹 Cleaned up camera stream for:', data.userId);

      // Clean up muted state
      setMutedStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });

      // Clean up camera enabled state
      setCameraEnabled(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });

      // Clean up peer connection
      setPeers(prev => {
        const peer = prev.get(data.userId);
        if (peer) {
          peer.destroy();
          const newPeers = new Map(prev);
          newPeers.delete(data.userId);
          return newPeers;
        }
        return prev;
      });
    });

    // WebRTC Signaling: Answer from streamer
    realtimeSignaling.on('webrtc:answer', async (data: {
      fromPresenceKey: string;
      fromUserId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log('📥 Received answer from streamer:', data.fromPresenceKey, '(userId:', data.fromUserId, ')');
      const peer = peersRef.current.get(data.fromPresenceKey);
      if (peer) {
        try {
          // SimplePeer expects the full signal object
          peer.signal(data.answer);
        } catch (error) {
          console.error('❌ Error signaling answer:', error);
        }
      } else {
        console.warn('⚠️ No peer found for presence key:', data.fromPresenceKey);
      }
    });

    // WebRTC Signaling: ICE Candidate
    realtimeSignaling.on('webrtc:ice-candidate', (data: {
      fromPresenceKey: string;
      fromUserId: string;
      candidate: any;
    }) => {
      console.log('🧊 Received ICE candidate from:', data.fromPresenceKey, '(userId:', data.fromUserId, ')');
      const peer = peersRef.current.get(data.fromPresenceKey);
      if (peer) {
        try {
          // SimplePeer expects the full signal object
          peer.signal(data.candidate);
        } catch (error) {
          console.error('❌ Error signaling ICE candidate:', error);
        }
      } else {
        console.warn('⚠️ No peer found for presence key:', data.fromPresenceKey);
      }
    });

    // Initialize connection
    realtimeSignaling.initialize(profile.organization_id, user.id, 'viewer');

    setSignaling(realtimeSignaling);

    return () => {
      // Clean up all peer connections
      peersRef.current.forEach(peer => peer.destroy());
      peersRef.current.clear();
      setPeers(new Map());
      realtimeSignaling.disconnect();
    };
  }, [user?.id, profile?.organization_id]);

  const createPeerConnection = async (presenceKey: string, targetUserId: string) => {
    // Check if peer connection already exists
    const existingPeer = peersRef.current.get(presenceKey);
    if (existingPeer && !existingPeer.destroyed) {
      console.log('⏭️ Peer connection already exists for:', presenceKey);
      return;
    }

    // Clean up any existing destroyed connection
    if (existingPeer) {
      console.log('🧹 Cleaning up old peer connection for:', presenceKey);
      existingPeer.destroy();
      peersRef.current.delete(presenceKey);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(presenceKey);
        return newPeers;
      });
    }

    console.log('🔗 Creating new peer connection for:', presenceKey, '(userId:', targetUserId, ')');

    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      },
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    console.log('🔧 SimplePeer instance created with offerToReceiveVideo and offerToReceiveAudio');

    // IMPORTANT: SimplePeer's offerToReceiveVideo only receives ONE video track
    // We need to add transceivers to receive multiple video tracks (screen + camera)
    // @ts-ignore - Access internal _pc property
    const pc = peer._pc as RTCPeerConnection;

    if (pc) {
      console.log('🔧 Adding transceivers to receive 2 video tracks (screen + camera)');

      // Add transceivers for receiving multiple video tracks
      // First video track: screen share
      pc.addTransceiver('video', { direction: 'recvonly' });
      // Second video track: camera
      pc.addTransceiver('video', { direction: 'recvonly' });
      // Audio track
      pc.addTransceiver('audio', { direction: 'recvonly' });

      console.log('✅ Transceivers added for 2 video + 1 audio tracks');
    }

    // Handle incoming stream - track all video tracks separately
    let screenTrack: MediaStreamTrack | null = null;
    let cameraTrack: MediaStreamTrack | null = null;
    let trackCount = 0;
    let receivedStream: MediaStream | null = null;

    peer.on('stream', (stream: MediaStream) => {
      console.log('📺 Received stream from:', targetUserId);
      console.log('📺 Stream tracks:', stream.getTracks().map(t => ({
        kind: t.kind,
        label: t.label,
        id: t.id.substring(0, 8),
        enabled: t.enabled,
        readyState: t.readyState
      })));
      receivedStream = stream;

      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      console.log('📺 Video tracks count:', videoTracks.length);
      console.log('📺 Audio tracks count:', audioTracks.length);

      // First video track is screen
      if (videoTracks.length > 0) {
        screenTrack = videoTracks[0];
        const video = videoRefsMap.current.get(targetUserId);
        if (video) {
          const screenStream = new MediaStream([screenTrack]);

          // Add audio tracks to screen video
          audioTracks.forEach(track => screenStream.addTrack(track));

          video.srcObject = screenStream;
          video.muted = false;
          video.volume = 1.0;

          video.play()
            .then(() => {
              console.log('✅ Video playing for:', targetUserId);
              console.log('🎬 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
            })
            .catch(err => console.error('Error playing video:', err));
        }
      }

      // Second video track is camera
      if (videoTracks.length > 1) {
        cameraTrack = videoTracks[1];

        // Auto-enable camera overlay when camera track is detected
        setCameraEnabled(prev => {
          const newSet = new Set(prev);
          newSet.add(targetUserId);
          return newSet;
        });

        // Create and persist the camera stream
        const cameraStream = new MediaStream([cameraTrack]);
        cameraStreamsMap.current.set(targetUserId, cameraStream);
        console.log('💾 Stored camera stream for:', targetUserId);

        const cameraVideo = cameraRefsMap.current.get(targetUserId);
        if (cameraVideo) {
          console.log('📷 Setting camera stream for:', targetUserId);
          cameraVideo.srcObject = cameraStream;
          cameraVideo.play()
            .then(() => console.log('✅ Camera playing'))
            .catch(err => console.error('Error playing camera:', err));
        } else {
          console.log('⏳ Camera video element not ready yet for:', targetUserId);
          // Retry after a short delay when element is ready
          setTimeout(() => {
            const video = cameraRefsMap.current.get(targetUserId);
            if (video) {
              console.log('📷 Retrying camera stream for:', targetUserId);
              const existingStream = cameraStreamsMap.current.get(targetUserId);
              if (existingStream) {
                video.srcObject = existingStream;
                video.play().catch(err => console.error('Error playing camera on retry:', err));
              }
            }
          }, 100);
        }
      }
    });

    // Backup: Handle track event (more reliable in some cases)
    peer.on('track', (track: MediaStreamTrack, stream: MediaStream) => {
      console.log('🎵 Received track:', track.kind, track.label);
      console.log('📺 Track belongs to stream:', stream.id);

      if (!receivedStream) {
        console.log('📺 Processing stream via track event instead of stream event');
        receivedStream = stream;

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        console.log('📺 Stream has', videoTracks.length, 'video tracks and', audioTracks.length, 'audio tracks');

        // First video track is screen
        if (videoTracks.length > 0) {
          screenTrack = videoTracks[0];
          const video = videoRefsMap.current.get(targetUserId);
          if (video) {
            const screenStream = new MediaStream([screenTrack]);
            audioTracks.forEach(track => screenStream.addTrack(track));
            video.srcObject = screenStream;
            video.muted = false;
            video.volume = 1.0;

            video.play()
              .then(() => {
                console.log('✅ Video playing for:', targetUserId);
                console.log('🎬 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
              })
              .catch(err => console.error('Error playing video:', err));
          }
        }

        // Second video track is camera
        if (videoTracks.length > 1) {
          cameraTrack = videoTracks[1];
          setCameraEnabled(prev => {
            const newSet = new Set(prev);
            newSet.add(targetUserId);
            return newSet;
          });
          const cameraStream = new MediaStream([cameraTrack]);
          cameraStreamsMap.current.set(targetUserId, cameraStream);
          console.log('💾 Stored camera stream for:', targetUserId);
          const cameraVideo = cameraRefsMap.current.get(targetUserId);
          if (cameraVideo) {
            console.log('📷 Setting camera stream for:', targetUserId);
            cameraVideo.srcObject = cameraStream;
            cameraVideo.play()
              .then(() => console.log('✅ Camera playing'))
              .catch(err => console.error('Error playing camera:', err));
          } else {
            console.log('⏳ Camera video element not ready yet for:', targetUserId);
            setTimeout(() => {
              const video = cameraRefsMap.current.get(targetUserId);
              if (video) {
                console.log('📷 Retrying camera stream for:', targetUserId);
                const existingStream = cameraStreamsMap.current.get(targetUserId);
                if (existingStream) {
                  video.srcObject = existingStream;
                  video.play().catch(err => console.error('Error playing camera on retry:', err));
                }
              }
            }, 100);
          }
        }
      }
    });

    // Handle signals (offers, answers, ICE candidates)
    peer.on('signal', (data: any) => {
      if (data.type === 'offer') {
        console.log('📤 Sending offer to:', presenceKey, '(userId:', targetUserId, ')');
        signaling?.sendOffer(presenceKey, targetUserId, data);
      } else if (data.candidate) {
        console.log('🧊 Sending ICE candidate to:', presenceKey, '(userId:', targetUserId, ')');
        signaling?.sendIceCandidate(presenceKey, targetUserId, data);
      }
    });

    peer.on('connect', () => {
      console.log('✅ Successfully connected to:', presenceKey);
    });

    peer.on('close', () => {
      console.log('❌ Peer connection closed:', presenceKey);
      peersRef.current.delete(presenceKey);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(presenceKey);
        return newPeers;
      });
    });

    peer.on('error', (error: Error) => {
      console.error('❌ Peer error:', error);
      peersRef.current.delete(presenceKey);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(presenceKey);
        return newPeers;
      });
    });

    // Store peer connection using presence key (both ref and state)
    peersRef.current.set(presenceKey, peer);
    setPeers(prev => new Map(prev).set(presenceKey, peer));
  };

  const toggleMute = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    const video = videoRefsMap.current.get(userId);
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      const audioTracks = stream.getAudioTracks();

      const shouldMute = !mutedStreams.has(userId);

      audioTracks.forEach(track => {
        track.enabled = !shouldMute;
        console.log(`🔊 Audio track ${track.id} enabled:`, track.enabled);
      });

      video.muted = shouldMute;
      console.log(`🔊 Video element muted:`, video.muted);

      setMutedStreams(prev => {
        const newSet = new Set(prev);
        if (shouldMute) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });

      console.log(`🔊 ${shouldMute ? 'Muted' : 'Unmuted'} audio for:`, userId);
    }
  };

  const toggleCamera = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();

    setCameraEnabled(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        console.log('📷 Camera view hidden for:', userId);
      } else {
        newSet.add(userId);
        console.log('📷 Camera view shown for:', userId);
      }
      return newSet;
    });
  };

  const toggleFullscreen = (userId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (fullscreenUserId === userId) {
      setFullscreenUserId(null);
      console.log('🖼️ Exited fullscreen for:', userId);
    } else {
      setFullscreenUserId(userId);
      console.log('🖼️ Entered fullscreen for:', userId);
    }
  };

  const toggleStream = async (userId: string) => {
    if (activeStreams.has(userId)) {
      // Stop watching
      console.log('🛑 Stopping stream for:', userId);

      setActiveStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Clean up video element
      const video = videoRefsMap.current.get(userId);
      if (video) {
        video.srcObject = null;
        videoRefsMap.current.delete(userId);
        console.log('🧹 Cleaned up video ref for:', userId);
      }

      // Clean up camera elements and streams
      const cameraVideo = cameraRefsMap.current.get(userId);
      if (cameraVideo) {
        cameraVideo.srcObject = null;
        cameraRefsMap.current.delete(userId);
        console.log('🧹 Cleaned up camera ref for:', userId);
      }
      cameraStreamsMap.current.delete(userId);
      console.log('🧹 Cleaned up camera stream for:', userId);

      // Clean up muted state
      setMutedStreams(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Clean up camera enabled state
      setCameraEnabled(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      // Close peer connection
      setPeers(prev => {
        const peer = prev.get(userId);
        if (peer) {
          peer.destroy();
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          console.log('🧹 Cleaned up peer connection for:', userId);
          return newPeers;
        }
        return prev;
      });
    } else {
      // Start watching
      const currentSize = GRID_SIZES[gridSize];
      if (activeStreams.size < currentSize.max) {
        setActiveStreams(prev => new Set([...prev, userId]));

        // Find the streamer to get their presence key
        const streamer = streamers.find(s => s.userId === userId);
        if (streamer) {
          // Create WebRTC peer connection using presence key
          await createPeerConnection(streamer.presenceKey, streamer.userId);
        } else {
          console.error('❌ Streamer not found for userId:', userId);
        }
      } else {
        alert(`Maximum ${currentSize.max} streams in current grid size`);
      }
    }
  };

  const gridLayout = GRID_SIZES[gridSize];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <button
              onClick={() => window.history.back()}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg p-2 transition-colors"
              title="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <div>
              <h1 className="text-3xl font-bold mb-2">Live Employee Monitoring</h1>
              <p className="text-gray-400">
                Real-time video and audio monitoring • {streamers.length} employees online
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>

            {/* Grid Size Selector */}
            <div className="flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
              <span className="text-sm text-gray-400">Grid:</span>
              {Object.keys(GRID_SIZES).map(size => (
                <button
                  key={size}
                  onClick={() => setGridSize(size)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    gridSize === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Stream Grid */}
        <div className="col-span-9">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${gridLayout.rows}, minmax(0, 1fr))`
            }}
          >
            {Array.from(activeStreams).map(userId => {
              const streamer = streamers.find(s => s.userId === userId);
              return (
                <div
                  key={userId}
                  className="relative bg-gray-800 rounded-lg overflow-hidden aspect-video"
                >
                  {/* Video Player */}
                  <video
                    ref={(el) => {
                      if (el && !videoRefsMap.current.has(userId)) {
                        console.log('📹 Video element ref set for:', userId);
                        videoRefsMap.current.set(userId, el);
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={false}
                    controls={false}
                    className="w-full h-full object-cover bg-black"
                  />

                  {/* Stream Info Overlay */}
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/70 to-transparent p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{streamer?.userEmail}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                          <span className="text-xs text-gray-300">LIVE</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleStream(userId)}
                        className="bg-red-600 hover:bg-red-700 rounded-full p-2 transition-colors"
                        title="Stop watching"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Camera Overlay (Picture-in-Picture style) */}
                  {cameraEnabled.has(userId) && (
                    <div className="absolute bottom-16 right-3 w-32 h-24 bg-black rounded-lg overflow-hidden border-2 border-blue-500 shadow-lg">
                      <video
                        ref={(el) => {
                          if (el) {
                            const existingRef = cameraRefsMap.current.get(userId);

                            if (!existingRef || existingRef !== el) {
                              console.log('📷 Camera element ref set/updated for:', userId);
                              cameraRefsMap.current.set(userId, el);

                              const existingStream = cameraStreamsMap.current.get(userId);
                              if (existingStream) {
                                console.log('🔄 Reattaching camera stream for:', userId);
                                el.srcObject = existingStream;

                                const handleLoadedMetadata = () => {
                                  el.play()
                                    .then(() => console.log('✅ Camera stream reattached and playing'))
                                    .catch(err => {
                                      if (err.name !== 'AbortError') {
                                        console.error('Error playing reattached camera:', err);
                                      }
                                    });
                                  el.removeEventListener('loadedmetadata', handleLoadedMetadata);
                                };

                                el.addEventListener('loadedmetadata', handleLoadedMetadata);

                                if (el.readyState >= 1) {
                                  handleLoadedMetadata();
                                }
                              } else {
                                console.log('⏳ No persisted camera stream yet for:', userId);
                              }
                            }
                          }
                        }}
                        autoPlay
                        playsInline
                        muted={true}
                        controls={false}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1 bg-blue-600 text-xs px-1 rounded">CAM</div>
                    </div>
                  )}

                  {/* Stream Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={(e) => toggleMute(userId, e)}
                        className="bg-gray-800/80 hover:bg-gray-700 rounded-full p-2 transition-colors"
                        title={mutedStreams.has(userId) ? "Unmute" : "Mute"}
                      >
                        {mutedStreams.has(userId) ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => toggleCamera(userId, e)}
                        className={`${
                          cameraEnabled.has(userId)
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-gray-800/80 hover:bg-gray-700'
                        } rounded-full p-2 transition-colors`}
                        title={cameraEnabled.has(userId) ? "Hide Camera" : "Show Camera"}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => toggleFullscreen(userId, e)}
                        className="bg-gray-800/80 hover:bg-gray-700 rounded-full p-2 transition-colors"
                        title="Fullscreen"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Empty Slots */}
            {Array.from({ length: gridLayout.max - activeStreams.size }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-700 aspect-video flex items-center justify-center"
              >
                <div className="text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Empty Slot</p>
                </div>
              </div>
            ))}
          </div>

          {activeStreams.size === 0 && (
            <div className="text-center py-20 text-gray-400">
              <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-semibold mb-2">No Active Streams</h3>
              <p>Select employees from the sidebar to start monitoring</p>
            </div>
          )}
        </div>

        {/* Sidebar - Available Employees */}
        <div className="col-span-3">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Available Employees ({streamers.length})</h2>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {streamers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="text-sm">No employees online</p>
                </div>
              ) : (
                streamers.map(streamer => (
                  <div
                    key={streamer.userId}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      activeStreams.has(streamer.userId)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                    }`}
                    onClick={() => toggleStream(streamer.userId)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium">
                          {streamer.userName.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{streamer.userEmail}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs opacity-75">Online</span>
                        </div>
                      </div>
                      {activeStreams.has(streamer.userId) && (
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-400">Monitoring Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Active Streams:</span>
                <span className="font-medium">{activeStreams.size}/{gridLayout.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Online Employees:</span>
                <span className="font-medium">{streamers.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Grid Size:</span>
                <span className="font-medium">{gridSize}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenUserId && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Fullscreen Header */}
          <div className="bg-gray-900 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white font-medium">
                {streamers.find(s => s.userId === fullscreenUserId)?.userEmail}
              </span>
              <span className="text-gray-400 text-sm">LIVE - Fullscreen</span>
            </div>
            <button
              onClick={(e) => toggleFullscreen(fullscreenUserId, e)}
              className="bg-gray-800 hover:bg-gray-700 rounded-full p-2 transition-colors"
              title="Exit Fullscreen"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Fullscreen Video Container */}
          <div className="flex-1 relative bg-black">
            <video
              ref={(el) => {
                if (el && videoRefsMap.current.has(fullscreenUserId)) {
                  const originalVideo = videoRefsMap.current.get(fullscreenUserId);
                  if (originalVideo && originalVideo.srcObject) {
                    el.srcObject = originalVideo.srcObject;
                    el.play().catch(err => console.error('Error playing fullscreen video:', err));
                  }
                }
              }}
              autoPlay
              playsInline
              muted={mutedStreams.has(fullscreenUserId)}
              controls={false}
              className="w-full h-full object-contain"
            />

            {/* Fullscreen Camera Overlay */}
            {cameraEnabled.has(fullscreenUserId) && (
              <div className="absolute bottom-24 right-8 w-64 h-48 bg-black rounded-lg overflow-hidden border-2 border-blue-500 shadow-2xl">
                <video
                  ref={(el) => {
                    if (el) {
                      const existingStream = cameraStreamsMap.current.get(fullscreenUserId);
                      if (existingStream) {
                        el.srcObject = existingStream;
                        el.play().catch(err => console.error('Error playing fullscreen camera:', err));
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={true}
                  controls={false}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-blue-600 text-xs px-2 py-1 rounded">CAMERA</div>
              </div>
            )}

            {/* Fullscreen Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-6">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={(e) => toggleMute(fullscreenUserId, e)}
                  className="bg-gray-800/90 hover:bg-gray-700 rounded-full p-4 transition-colors"
                  title={mutedStreams.has(fullscreenUserId) ? "Unmute" : "Mute"}
                >
                  {mutedStreams.has(fullscreenUserId) ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={(e) => toggleCamera(fullscreenUserId, e)}
                  className={`${
                    cameraEnabled.has(fullscreenUserId)
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-800/90 hover:bg-gray-700'
                  } rounded-full p-4 transition-colors`}
                  title={cameraEnabled.has(fullscreenUserId) ? "Hide Camera" : "Show Camera"}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
