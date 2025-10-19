# Live Video & Audio Monitoring Implementation Guide

## Overview
This document outlines the implementation of Zoom-like live monitoring for 30 employees in the Work Invigilator system.

## Architecture

### Technology Stack
- **WebRTC** - For real-time peer-to-peer audio/video streaming
- **Socket.IO** - For WebRTC signaling and coordination
- **Simple-Peer** - Simplified WebRTC implementation
- **Next.js Custom Server** - To integrate Socket.IO with Next.js

### Components

#### 1. Signaling Server (`nextjs-dashboard/lib/signaling-server.ts`)
- ✅ **Created** - Handles WebRTC signaling between employees and viewers
- Manages streamer/viewer connections
- Coordinates WebRTC offers, answers, and ICE candidates
- Tracks active streamers per organization

####2. Custom Next.js Server (`nextjs-dashboard/server.js`)
- ✅ **Created** - Integrates Socket.IO with Next.js
- Runs on port 3002 (same as dashboard)
- Handles both HTTP and WebSocket connections

#### 3. Desktop App Live Streaming (`work-invigilator-desktop/livestream.js`)
- ✅ **Created** - Manages screen + audio capture
- Creates WebRTC peer connections for each viewer
- Streams video and audio in real-time
- Auto-reconnects on disconnection

#### 4. Dashboard Live View Page (`nextjs-dashboard/app/live-monitoring/page.tsx`)
- ⏳ **To be created** - Main monitoring interface
- Grid view (1/4/9/16 employees)
- Individual employee stream components
- Stream controls (mute, fullscreen, quality)

#### 5. WebRTC Client Components
- ⏳ **To be created** - React components for viewing streams
- Stream player component
- Grid layout component
- Stream controls

## Implementation Status

### ✅ Completed
1. WebSocket signaling server
2. Custom Next.js server with Socket.IO
3. Desktop app live streaming module
4. Package dependencies installed

### ⏳ In Progress
1. Integration with desktop app renderer
2. Dashboard live monitoring page
3. WebRTC viewer components
4. Grid layout implementation

### 📋 TODO
1. **Desktop App Integration**
   - Add livestream manager to renderer.js
   - Start streaming when monitoring starts
   - Stop streaming when monitoring stops
   - Add UI indicator for live streaming status

2. **Dashboard Live View**
   - Create `/live-monitoring` page
   - Build grid layout (supports 1/4/9/16 employees)
   - Add stream player components
   - Implement stream controls
   - Add employee info overlay

3. **Stream Quality & Optimization**
   - Implement adaptive bitrate
   - Add bandwidth monitoring
   - Optimize for 30 simultaneous streams
   - Add connection quality indicators

4. **Testing**
   - Test with multiple employees
   - Test network resilience
   - Test reconnection scenarios
   - Performance testing

## How It Works

### Employee (Desktop App)
1. Employee logs in and starts monitoring
2. Desktop app connects to signaling server via Socket.IO
3. Captures screen + microphone audio
4. Creates WebRTC peer connection when viewer requests stream
5. Streams video/audio directly to dashboard

### Dashboard (Viewer)
1. Admin opens `/live-monitoring` page
2. Connects to signaling server via Socket.IO
3. Receives list of available employee streams
4. Requests stream from specific employee
5. Establishes WebRTC connection
6. Receives and displays live video/audio

### Signaling Flow
```
Employee Desktop App          Signaling Server          Dashboard Viewer
       |                             |                          |
       |--[streamer:join]----------->|                          |
       |                             |<--[viewer:join]----------|
       |                             |                          |
       |                             |--[streamers:list]------->|
       |                             |                          |
       |                             |<--[webrtc:offer]---------|
       |<--[webrtc:offer]------------|                          |
       |                             |                          |
       |--[webrtc:answer]----------->|                          |
       |                             |--[webrtc:answer]-------->|
       |                             |                          |
       |<--[ICE candidates]<-------->|<--[ICE candidates]------>|
       |                             |                          |
       |========== WebRTC P2P Connection Established ===========|
       |                                                         |
       |------ Video/Audio Stream ----------------------------->|
```

## File Structure

```
workinvigilator-extention/
├── nextjs-dashboard/
│   ├── server.js                          # ✅ Custom server with Socket.IO
│   ├── lib/
│   │   └── signaling-server.ts            # ✅ WebRTC signaling logic
│   ├── app/
│   │   └── live-monitoring/
│   │       └── page.tsx                   # ⏳ Live monitoring page
│   └── components/
│       └── livestream/
│           ├── StreamGrid.tsx             # ⏳ Grid layout
│           ├── StreamPlayer.tsx           # ⏳ Video player
│           └── StreamControls.tsx         # ⏳ Controls
│
└── work-invigilator-desktop/
    ├── livestream.js                      # ✅ Streaming manager
    ├── renderer.js                        # ⏳ Needs integration
    └── main.js                            # ⏳ Needs IPC handlers
```

## Network Requirements

### Bandwidth Per Stream
- **Video**: 1-2 Mbps (720p @ 15-30fps)
- **Audio**: 64 kbps
- **Total per stream**: ~2 Mbps
- **For 30 employees**: ~60 Mbps upload (dashboard), ~2 Mbps upload per employee

### Ports
- **3002**: HTTP/HTTPS + WebSocket (signaling)
- **Dynamic**: WebRTC peer connections (UDP/TCP)

### Firewall Configuration
- Allow WebRTC traffic (STUN/TURN)
- Open port 3002 for WebSocket connections
- Allow UDP traffic for optimal WebRTC performance

## STUN/TURN Servers

Currently using Google's public STUN servers:
```javascript
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' }
]
```

**For production**, consider:
- **Twilio STUN/TURN**: Professional, reliable
- **Xirsys**: WebRTC infrastructure provider
- **Self-hosted TURN**: coturn server

## Security Considerations

1. **Authentication**: Only authenticated users can stream/view
2. **Organization Isolation**: Employees can only be viewed by admins in same organization
3. **Encrypted Streams**: WebRTC uses DTLS-SRTP for encryption
4. **Access Control**: Role-based permissions (only admins can view streams)

## Next Steps

1. Run the dashboard with new server:
   ```bash
   cd nextjs-dashboard
   npm run dev
   ```

2. Complete desktop app integration

3. Build dashboard live monitoring page

4. Test with multiple employees

5. Optimize performance

## Troubleshooting

### Stream Not Connecting
- Check Socket.IO connection in browser console
- Verify firewall allows WebRTC traffic
- Check STUN server accessibility

### Poor Quality
- Reduce video resolution/framerate
- Check available bandwidth
- Implement adaptive bitrate

### High Latency
- Use TURN server for relay if direct connection fails
- Reduce video buffer size
- Optimize encoding settings

## Resources

- [WebRTC Documentation](https://webrtc.org/)
- [Simple-Peer Library](https://github.com/feross/simple-peer)
- [Socket.IO Documentation](https://socket.io/docs/v4/)
