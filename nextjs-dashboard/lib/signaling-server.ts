// WebRTC Signaling Server using Socket.IO
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface StreamerInfo {
  userId: string;
  userName: string;
  userEmail: string;
  socketId: string;
  organizationId: string;
  streamActive: boolean;
  connectedAt: Date;
}

export interface ViewerInfo {
  socketId: string;
  userId: string;
  organizationId: string;
  watchingStreamers: string[]; // Array of streamer userIds
}

class SignalingServer {
  private io: SocketIOServer | null = null;
  private streamers: Map<string, StreamerInfo> = new Map(); // userId -> StreamerInfo
  private viewers: Map<string, ViewerInfo> = new Map(); // socketId -> ViewerInfo

  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3002'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('WebRTC Signaling Server initialized');
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Employee (streamer) joins
      socket.on('streamer:join', (data: {
        userId: string;
        userName: string;
        userEmail: string;
        organizationId: string
      }) => {
        console.log(`Streamer joined: ${data.userName} (${data.userId})`);

        const streamerInfo: StreamerInfo = {
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          socketId: socket.id,
          organizationId: data.organizationId,
          streamActive: true,
          connectedAt: new Date()
        };

        this.streamers.set(data.userId, streamerInfo);

        // Join organization room
        socket.join(`org:${data.organizationId}`);
        socket.join(`streamer:${data.userId}`);

        // Notify all viewers in the same organization
        this.io?.to(`org:${data.organizationId}`).emit('streamer:available', {
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          streamActive: true
        });

        // Send list of all streamers in org to this streamer
        const orgStreamers = this.getStreamersByOrg(data.organizationId);
        socket.emit('streamers:list', orgStreamers);
      });

      // Viewer (dashboard) joins
      socket.on('viewer:join', (data: {
        userId: string;
        organizationId: string
      }) => {
        console.log(`Viewer joined: ${data.userId}`);

        const viewerInfo: ViewerInfo = {
          socketId: socket.id,
          userId: data.userId,
          organizationId: data.organizationId,
          watchingStreamers: []
        };

        this.viewers.set(socket.id, viewerInfo);

        // Join organization room
        socket.join(`org:${data.organizationId}`);

        // Send list of available streamers
        const orgStreamers = this.getStreamersByOrg(data.organizationId);
        socket.emit('streamers:list', orgStreamers);
      });

      // WebRTC Signaling: Offer
      socket.on('webrtc:offer', (data: {
        targetUserId: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        console.log(`Offer sent to ${data.targetUserId}`);
        const targetStreamer = this.streamers.get(data.targetUserId);

        if (targetStreamer) {
          this.io?.to(targetStreamer.socketId).emit('webrtc:offer', {
            fromSocketId: socket.id,
            offer: data.offer
          });
        }
      });

      // WebRTC Signaling: Answer
      socket.on('webrtc:answer', (data: {
        toSocketId: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        console.log(`Answer sent to ${data.toSocketId}`);
        this.io?.to(data.toSocketId).emit('webrtc:answer', {
          fromUserId: this.getStreamerBySocketId(socket.id)?.userId,
          answer: data.answer
        });
      });

      // WebRTC Signaling: ICE Candidate
      socket.on('webrtc:ice-candidate', (data: {
        targetSocketId?: string;
        targetUserId?: string;
        candidate: RTCIceCandidateInit;
      }) => {
        if (data.targetSocketId) {
          this.io?.to(data.targetSocketId).emit('webrtc:ice-candidate', {
            fromSocketId: socket.id,
            candidate: data.candidate
          });
        } else if (data.targetUserId) {
          const targetStreamer = this.streamers.get(data.targetUserId);
          if (targetStreamer) {
            this.io?.to(targetStreamer.socketId).emit('webrtc:ice-candidate', {
              fromSocketId: socket.id,
              candidate: data.candidate
            });
          }
        }
      });

      // Request stream from specific employee
      socket.on('viewer:request-stream', (data: { userId: string }) => {
        const viewer = this.viewers.get(socket.id);
        if (viewer && !viewer.watchingStreamers.includes(data.userId)) {
          viewer.watchingStreamers.push(data.userId);
        }

        const streamer = this.streamers.get(data.userId);
        if (streamer) {
          socket.emit('streamer:available', {
            userId: streamer.userId,
            userName: streamer.userName,
            userEmail: streamer.userEmail,
            socketId: streamer.socketId,
            streamActive: true
          });
        } else {
          socket.emit('streamer:unavailable', { userId: data.userId });
        }
      });

      // Stop watching stream
      socket.on('viewer:stop-stream', (data: { userId: string }) => {
        const viewer = this.viewers.get(socket.id);
        if (viewer) {
          viewer.watchingStreamers = viewer.watchingStreamers.filter(
            id => id !== data.userId
          );
        }
      });

      // Get active streamers list
      socket.on('streamers:get-list', () => {
        const viewer = this.viewers.get(socket.id);
        if (viewer) {
          const orgStreamers = this.getStreamersByOrg(viewer.organizationId);
          socket.emit('streamers:list', orgStreamers);
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Check if it was a streamer
        const streamer = this.getStreamerBySocketId(socket.id);
        if (streamer) {
          console.log(`Streamer disconnected: ${streamer.userName}`);
          this.streamers.delete(streamer.userId);

          // Notify viewers in the same organization
          this.io?.to(`org:${streamer.organizationId}`).emit('streamer:unavailable', {
            userId: streamer.userId
          });
        }

        // Check if it was a viewer
        const viewer = this.viewers.get(socket.id);
        if (viewer) {
          console.log(`Viewer disconnected: ${viewer.userId}`);
          this.viewers.delete(socket.id);
        }
      });
    });
  }

  private getStreamersByOrg(organizationId: string): StreamerInfo[] {
    return Array.from(this.streamers.values()).filter(
      s => s.organizationId === organizationId
    );
  }

  private getStreamerBySocketId(socketId: string): StreamerInfo | undefined {
    return Array.from(this.streamers.values()).find(
      s => s.socketId === socketId
    );
  }

  getStreamers(): StreamerInfo[] {
    return Array.from(this.streamers.values());
  }

  getViewers(): ViewerInfo[] {
    return Array.from(this.viewers.values());
  }

  getIO(): SocketIOServer | null {
    return this.io;
  }
}

export const signalingServer = new SignalingServer();
