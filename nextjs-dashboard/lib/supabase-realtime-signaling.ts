// Supabase Realtime Signaling for WebRTC Live Monitoring
// Replaces Socket.IO with Supabase Realtime Broadcast channels

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface StreamerInfo {
  presenceKey: string; // Unique presence key for this connection (like socket.id)
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  streamActive: boolean;
  connectedAt: string;
}

export interface SignalingMessage {
  type: 'streamer:join' | 'streamer:leave' | 'viewer:join' | 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice-candidate';
  from: string; // presence key (like socket.id)
  fromUserId: string; // actual userId for reference
  to?: string; // target presence key
  toUserId?: string; // target userId for reference
  payload?: any;
  timestamp: string;
}

export class SupabaseRealtimeSignaling {
  private channel: RealtimeChannel | null = null;
  private organizationId: string | null = null;
  private userId: string | null = null;
  private presenceKey: string | null = null; // Store presence key (like socket.id)
  private role: 'streamer' | 'viewer' | null = null;
  private eventHandlers: Map<string, ((...args: any[]) => void)[]> = new Map();

  /**
   * Initialize Supabase Realtime connection
   * @param organizationId - The organization ID for channel scoping
   * @param userId - The current user ID
   * @param role - Either 'streamer' (employee) or 'viewer' (dashboard)
   */
  async initialize(organizationId: string, userId: string, role: 'streamer' | 'viewer') {
    this.organizationId = organizationId;
    this.userId = userId;
    this.role = role;

    // Create organization-specific channel for WebRTC signaling
    const channelName = `live-monitoring:${organizationId}`;

    console.log(`📡 Connecting to Supabase Realtime channel: ${channelName}`);

    // Use compound key with session ID to make each tab/window unique
    // Format: userId:role:sessionId
    const sessionId = Math.random().toString(36).substring(2, 15);
    this.presenceKey = `${userId}:${role}:${sessionId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        broadcast: {
          self: false, // Don't receive our own messages
          ack: false // Don't wait for acknowledgment
        },
        presence: {
          key: this.presenceKey
        },
        private: true // REQUIRED for broadcasts to work properly with RLS
      }
    });

    // Track presence (online/offline status)
    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState();
        console.log('👥 Presence sync:', state);
        this.handlePresenceSync(state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('👤 User joined:', key, newPresences);
        this.handlePresenceJoin(key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('👋 User left:', key, leftPresences);
        this.handlePresenceLeave(key, leftPresences);
      });

    // Listen to broadcast messages
    this.channel
      .on('broadcast', { event: 'signaling' }, ({ payload }) => {
        console.log('📨 DASHBOARD RECEIVED BROADCAST!');
        console.log('📨 Payload:', payload);
        this.handleSignalingMessage(payload);
      });

    // Subscribe to channel
    await this.channel.subscribe(async (status) => {
      console.log(`📡 Channel subscription status: ${status}`);

      if (status === 'SUBSCRIBED') {
        // Track presence
        const presencePayload: any = {
          userId: this.userId,
          role: this.role,
          connectedAt: new Date().toISOString()
        };

        if (this.role === 'streamer') {
          // Get user profile for streamer info
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', this.userId)
            .single();

          presencePayload.userName = profile?.name || 'Unknown';
          presencePayload.userEmail = profile?.email || 'Unknown';
          presencePayload.streamActive = true;
        }

        await this.channel?.track(presencePayload);
        console.log('✅ Presence tracked:', presencePayload);

        this.emit('connected', { organizationId, userId, role });
      }
    });

    return this.channel;
  }

  /**
   * Send WebRTC offer to a specific user
   */
  async sendOffer(targetPresenceKey: string, targetUserId: string, offer: RTCSessionDescriptionInit) {
    const message: SignalingMessage = {
      type: 'webrtc:offer',
      from: this.presenceKey!,
      fromUserId: this.userId!,
      to: targetPresenceKey,
      toUserId: targetUserId,
      payload: { offer },
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending offer to:', targetPresenceKey, '(userId:', targetUserId, ')');
    await this.broadcast(message);
  }

  /**
   * Send WebRTC answer to a specific user
   */
  async sendAnswer(targetPresenceKey: string, targetUserId: string, answer: RTCSessionDescriptionInit) {
    const message: SignalingMessage = {
      type: 'webrtc:answer',
      from: this.presenceKey!,
      fromUserId: this.userId!,
      to: targetPresenceKey,
      toUserId: targetUserId,
      payload: { answer },
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending answer to:', targetPresenceKey, '(userId:', targetUserId, ')');
    await this.broadcast(message);
  }

  /**
   * Send ICE candidate to a specific user
   */
  async sendIceCandidate(targetPresenceKey: string, targetUserId: string, candidate: RTCIceCandidateInit) {
    const message: SignalingMessage = {
      type: 'webrtc:ice-candidate',
      from: this.presenceKey!,
      fromUserId: this.userId!,
      to: targetPresenceKey,
      toUserId: targetUserId,
      payload: { candidate },
      timestamp: new Date().toISOString()
    };

    console.log('🧊 Sending ICE candidate to:', targetPresenceKey, '(userId:', targetUserId, ')');
    await this.broadcast(message);
  }

  /**
   * Broadcast a signaling message to the channel
   */
  private async broadcast(message: SignalingMessage) {
    if (!this.channel) {
      console.error('❌ Channel not initialized');
      return;
    }

    console.log('📡 Broadcasting message:', {
      type: message.type,
      from: message.from,
      to: message.to,
      channelState: this.channel.state,
      channelSubscribed: (this.channel.state as string) === 'joined'
    });

    // Wait for channel to be fully subscribed
    // Use type assertion since TypeScript doesn't recognize 'joined' as a valid state
    const channelState = this.channel.state as string;
    if (channelState !== 'joined') {
      console.warn('⚠️ Channel not joined yet, state:', this.channel.state);
      // Wait up to 5 seconds for channel to join
      let waited = 0;
      while ((this.channel.state as string) !== 'joined' && waited < 5000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waited += 100;
      }
      console.log('📡 Channel state after waiting:', this.channel.state);
    }

    console.log('📡 About to send broadcast...');
    console.log('📡 Channel state:', this.channel.state);
    console.log('📡 Channel topic:', this.channel.topic);

    const result = await this.channel.send({
      type: 'broadcast',
      event: 'signaling',
      payload: message
    });

    console.log('📡 Broadcast result:', result);
    console.log('📡 Message payload:', JSON.stringify(message, null, 2));

    if (result === 'ok') {
      console.log('✅ Broadcast sent successfully');
    } else {
      console.error('❌ Broadcast failed:', result);
    }
  }

  /**
   * Handle incoming signaling messages
   */
  private handleSignalingMessage(message: SignalingMessage) {
    // Ignore messages not meant for us (check presence key, not userId)
    if (message.to && message.to !== this.presenceKey) {
      return;
    }

    console.log('📨 Processing message for presence key:', this.presenceKey);

    switch (message.type) {
      case 'webrtc:offer':
        this.emit('webrtc:offer', {
          fromPresenceKey: message.from,
          fromUserId: message.fromUserId,
          offer: message.payload.offer
        });
        break;

      case 'webrtc:answer':
        this.emit('webrtc:answer', {
          fromPresenceKey: message.from,
          fromUserId: message.fromUserId,
          answer: message.payload.answer
        });
        break;

      case 'webrtc:ice-candidate':
        this.emit('webrtc:ice-candidate', {
          fromPresenceKey: message.from,
          fromUserId: message.fromUserId,
          candidate: message.payload.candidate
        });
        break;
    }
  }

  /**
   * Handle presence sync (get all currently online users)
   */
  private handlePresenceSync(state: any) {
    if (!state) return;

    const streamers: StreamerInfo[] = [];

    Object.keys(state).forEach(presenceKey => {
      const presences = state[presenceKey];
      presences.forEach((presence: any) => {
        if (presence.role === 'streamer') {
          // IMPORTANT: Don't show viewer their own stream
          // Skip if this streamer's userId matches the viewer's userId
          // TEMPORARILY DISABLED FOR TESTING
          // if (this.role === 'viewer' && presence.userId === this.userId) {
          //   console.log('⏭️ Skipping own desktop stream (viewer filtering):', presence.userId);
          //   return;
          // }

          streamers.push({
            presenceKey: presenceKey, // Include presence key for routing
            userId: presence.userId,
            userName: presence.userName || 'Unknown',
            userEmail: presence.userEmail || 'Unknown',
            organizationId: this.organizationId!,
            streamActive: presence.streamActive || true,
            connectedAt: presence.connectedAt
          });
        }
      });
    });

    this.emit('streamers:list', streamers);
  }

  /**
   * Handle user joining presence
   */
  private handlePresenceJoin(presenceKey: string, newPresences: any[]) {
    newPresences.forEach((presence: any) => {
      if (presence.role === 'streamer') {
        // IMPORTANT: Don't show viewer their own stream
        // Skip if this streamer's userId matches the viewer's userId
        if (this.role === 'viewer' && presence.userId === this.userId) {
          console.log('⏭️ Skipping own desktop stream join (viewer filtering):', presence.userId);
          return;
        }

        const streamerInfo: StreamerInfo = {
          presenceKey: presenceKey, // Include presence key for routing
          userId: presence.userId,
          userName: presence.userName || 'Unknown',
          userEmail: presence.userEmail || 'Unknown',
          organizationId: this.organizationId!,
          streamActive: presence.streamActive || true,
          connectedAt: presence.connectedAt
        };

        this.emit('streamer:available', streamerInfo);
      }
    });
  }

  /**
   * Handle user leaving presence
   */
  private handlePresenceLeave(key: string, leftPresences: any[]) {
    leftPresences.forEach((presence: any) => {
      if (presence.role === 'streamer') {
        this.emit('streamer:unavailable', { userId: presence.userId });
      }
    });
  }

  /**
   * Get list of currently online streamers
   */
  getStreamers(): StreamerInfo[] {
    if (!this.channel) return [];

    const state = this.channel.presenceState();
    const streamers: StreamerInfo[] = [];

    Object.keys(state).forEach(presenceKey => {
      const presences = state[presenceKey];
      presences.forEach((presence: any) => {
        if (presence.role === 'streamer') {
          // IMPORTANT: Don't show viewer their own stream
          // Skip if this streamer's userId matches the viewer's userId
          if (this.role === 'viewer' && presence.userId === this.userId) {
            return;
          }

          streamers.push({
            presenceKey: presenceKey, // Include presence key for routing
            userId: presence.userId,
            userName: presence.userName || 'Unknown',
            userEmail: presence.userEmail || 'Unknown',
            organizationId: this.organizationId!,
            streamActive: presence.streamActive || true,
            connectedAt: presence.connectedAt
          });
        }
      });
    });

    return streamers;
  }

  /**
   * Register event handler
   */
  on(event: string, handler: (...args: any[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler: (...args: any[]) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit(event: string, data?: any) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Disconnect from channel
   */
  async disconnect() {
    if (this.channel) {
      console.log('🔌 Disconnecting from Supabase Realtime channel');
      await this.channel.untrack();
      await this.channel.unsubscribe();
      this.channel = null;
    }

    this.eventHandlers.clear();
    this.emit('disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.channel !== null && (this.channel.state as string) === 'joined';
  }
}
