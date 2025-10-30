# WebRTC Live Monitoring Integration

## Overview

The backend now supports WebRTC-based live monitoring, allowing admins to view employee screens in real-time.

## Architecture

```
Employee Desktop App ←→ WebSocket Server ←→ Admin Dashboard
         |                    |                    |
         |                    |                    |
    WebRTC Offer          Signaling          WebRTC Answer
    ICE Candidates        Server             ICE Candidates
         |                    |                    |
         └────────────────────┴────────────────────┘
                    Direct P2P Connection
```

## Components

### 1. WebSocket Manager
- Handles WebSocket connections
- Manages active users and admins
- Routes signaling messages between peers

### 2. Live Monitoring Service
- Creates and manages streaming rooms
- Tracks active streams
- Handles viewer join/leave events

### 3. WebRTC Signaling
- Facilitates peer connection establishment
- Exchanges SDP offers/answers
- Handles ICE candidate exchange

## API Endpoints

### WebSocket Endpoint

```
ws://localhost:8000/api/v1/ws/signaling?token=<jwt_token>
```

### REST Endpoints

#### Get Active Users
```
GET /api/v1/live-monitoring/active-users
Authorization: Bearer <admin_token>

Response:
{
  "total": 5,
  "users": [
    {
      "user_id": "uuid",
      "connection_count": 1
    }
  ]
}
```

#### Get Active Streams
```
GET /api/v1/live-monitoring/active-streams
Authorization: Bearer <admin_token>

Response:
{
  "total": 2,
  "streams": [
    {
      "user_id": "uuid",
      "user_name": "John Doe",
      "room_id": "room-uuid",
      "stream_type": "screen",
      "started_at": "2025-10-29T10:00:00",
      "viewer_count": 1
    }
  ]
}
```

#### Request Stream from User
```
POST /api/v1/live-monitoring/request-stream/{user_id}
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "room_id": "",
  "message": "Stream request sent to user"
}
```

#### Get My Stream Status
```
GET /api/v1/live-monitoring/my-stream-status
Authorization: Bearer <user_token>

Response:
{
  "is_streaming": true,
  "room_id": "room-uuid",
  "viewer_count": 1,
  "started_at": "2025-10-29T10:00:00"
}
```

#### Stop My Stream
```
POST /api/v1/live-monitoring/stop-stream
Authorization: Bearer <user_token>

Response:
{
  "success": true,
  "message": "Stream stopped successfully"
}
```

## WebSocket Message Protocol

### Client → Server Messages

#### Start Stream
```json
{
  "type": "start-stream",
  "stream_type": "screen"
}
```

#### Join Stream
```json
{
  "type": "join-stream",
  "room_id": "room-uuid"
}
```

#### Leave Stream
```json
{
  "type": "leave-stream",
  "room_id": "room-uuid"
}
```

#### Stop Stream
```json
{
  "type": "stop-stream"
}
```

#### WebRTC Offer
```json
{
  "type": "offer",
  "target_id": "connection-id",
  "data": {
    "sdp": "v=0\r\no=...",
    "type": "offer"
  }
}
```

#### WebRTC Answer
```json
{
  "type": "answer",
  "target_id": "connection-id",
  "data": {
    "sdp": "v=0\r\no=...",
    "type": "answer"
  }
}
```

#### ICE Candidate
```json
{
  "type": "ice-candidate",
  "target_id": "connection-id",
  "data": {
    "candidate": "candidate:...",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

#### Ping
```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

### Server → Client Messages

#### Stream Started
```json
{
  "type": "stream-started",
  "room_id": "room-uuid"
}
```

#### Joined Stream
```json
{
  "type": "joined-stream",
  "room_id": "room-uuid"
}
```

#### Viewer Joined
```json
{
  "type": "viewer-joined",
  "viewer_id": "connection-id"
}
```

#### Viewer Left
```json
{
  "type": "viewer-left",
  "viewer_id": "connection-id"
}
```

#### Stream Ended
```json
{
  "type": "stream-ended",
  "room_id": "room-uuid"
}
```

#### Stream Request (to employee)
```json
{
  "type": "stream-request",
  "from_admin": "admin-uuid",
  "admin_name": "Admin Name"
}
```

#### New Stream Available (to admins)
```json
{
  "type": "new-stream-available",
  "user_id": "user-uuid",
  "user_name": "John Doe",
  "room_id": "room-uuid"
}
```

#### User Connected/Disconnected (to admins)
```json
{
  "type": "user_connected",
  "user_id": "user-uuid",
  "connection_id": "connection-id",
  "timestamp": "2025-10-29T10:00:00"
}
```

#### Pong
```json
{
  "type": "pong",
  "timestamp": 1234567890
}
```

## Client Implementation Examples

### Employee Desktop App (Screen Sharing)

```javascript
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/signaling?token=${token}`);

let peerConnection;
let localStream;

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'stream-request':
      const userAccepted = confirm(`Admin ${message.admin_name} wants to view your screen. Allow?`);
      if (userAccepted) {
        await startScreenShare();
      }
      break;

    case 'answer':
      await peerConnection.setRemoteDescription(message.data);
      break;

    case 'ice-candidate':
      await peerConnection.addIceCandidate(message.data);
      break;
  }
};

async function startScreenShare() {
  try {
    localStream = await navigator.mediaDevices.getDisplayMedia({
      video: { cursor: 'always' },
      audio: false
    });

    ws.send(JSON.stringify({
      type: 'start-stream',
      stream_type: 'screen'
    }));

    createPeerConnection();

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

  } catch (error) {
    console.error('Error starting screen share:', error);
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        target_id: '<viewer-connection-id>',
        data: event.candidate
      }));
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState);
  };
}

function stopScreenShare() {
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  if (peerConnection) {
    peerConnection.close();
  }
  ws.send(JSON.stringify({ type: 'stop-stream' }));
}
```

### Admin Dashboard (Viewer)

```javascript
const token = localStorage.getItem('access_token');
const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/signaling?token=${token}`);

let peerConnection;

ws.onopen = () => {
  console.log('Admin WebSocket connected');
};

ws.onmessage = async (event) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'new-stream-available':
      displayStreamOption(message);
      break;

    case 'offer':
      await handleOffer(message);
      break;

    case 'ice-candidate':
      await peerConnection.addIceCandidate(message.data);
      break;

    case 'stream-ended':
      handleStreamEnded();
      break;
  }
};

async function joinStream(roomId) {
  ws.send(JSON.stringify({
    type: 'join-stream',
    room_id: roomId
  }));

  createViewerPeerConnection();
}

function createViewerPeerConnection() {
  peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });

  peerConnection.ontrack = (event) => {
    const videoElement = document.getElementById('remote-video');
    videoElement.srcObject = event.streams[0];
  };

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: 'ice-candidate',
        target_id: '<broadcaster-connection-id>',
        data: event.candidate
      }));
    }
  };
}

async function handleOffer(message) {
  await peerConnection.setRemoteDescription(message.data);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  ws.send(JSON.stringify({
    type: 'answer',
    target_id: message.from,
    data: answer
  }));
}

function leaveStream(roomId) {
  ws.send(JSON.stringify({
    type: 'leave-stream',
    room_id: roomId
  }));

  if (peerConnection) {
    peerConnection.close();
  }
}

async function requestStream(userId) {
  const response = await fetch(`/api/v1/live-monitoring/request-stream/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();
  console.log(data.message);
}
```

## React Component Example

```typescript
import { useEffect, useState, useRef } from 'react';

interface Stream {
  user_id: string;
  user_name: string;
  room_id: string;
  viewer_count: number;
}

export function LiveMonitoring() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [currentStream, setCurrentStream] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/signaling?token=${token}`);

    ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'new-stream-available') {
        fetchActiveStreams();
      } else if (message.type === 'offer' && currentStream) {
        await handleOffer(message);
      } else if (message.type === 'ice-candidate' && pcRef.current) {
        await pcRef.current.addIceCandidate(message.data);
      } else if (message.type === 'stream-ended') {
        handleStreamEnded();
      }
    };

    wsRef.current = ws;
    fetchActiveStreams();

    return () => {
      ws.close();
      if (pcRef.current) {
        pcRef.current.close();
      }
    };
  }, []);

  const fetchActiveStreams = async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/v1/live-monitoring/active-streams', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    setStreams(data.streams);
  };

  const joinStream = (roomId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'join-stream',
      room_id: roomId
    }));

    setCurrentStream(roomId);
    createPeerConnection();
  };

  const createPeerConnection = () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    pc.ontrack = (event) => {
      if (videoRef.current) {
        videoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        wsRef.current?.send(JSON.stringify({
          type: 'ice-candidate',
          target_id: '<broadcaster-id>',
          data: event.candidate
        }));
      }
    };

    pcRef.current = pc;
  };

  const handleOffer = async (message: any) => {
    if (!pcRef.current) return;

    await pcRef.current.setRemoteDescription(message.data);
    const answer = await pcRef.current.createAnswer();
    await pcRef.current.setLocalDescription(answer);

    wsRef.current?.send(JSON.stringify({
      type: 'answer',
      target_id: message.from,
      data: answer
    }));
  };

  const handleStreamEnded = () => {
    setCurrentStream(null);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  return (
    <div>
      <h1>Live Monitoring</h1>

      <div>
        <h2>Active Streams</h2>
        {streams.map(stream => (
          <div key={stream.room_id}>
            <span>{stream.user_name}</span>
            <span>{stream.viewer_count} viewers</span>
            <button onClick={() => joinStream(stream.room_id)}>
              View Stream
            </button>
          </div>
        ))}
      </div>

      {currentStream && (
        <div>
          <h2>Live View</h2>
          <video ref={videoRef} autoPlay playsInline />
          <button onClick={() => {
            wsRef.current?.send(JSON.stringify({
              type: 'leave-stream',
              room_id: currentStream
            }));
            handleStreamEnded();
          }}>
            Stop Viewing
          </button>
        </div>
      )}
    </div>
  );
}
```

## Testing

### Test WebSocket Connection

```bash
wscat -c "ws://localhost:8000/api/v1/ws/signaling?token=<your-jwt-token>"
```

### Send Test Messages

```json
{"type": "ping", "timestamp": 1234567890}
```

## Security Considerations

1. JWT token required for WebSocket connection
2. Admin role required for viewing streams
3. User consent required before streaming
4. Room-based isolation for streams
5. Automatic cleanup on disconnect

## Scalability

For production deployment with multiple backend instances:

1. Use Redis pub/sub for WebSocket message broadcasting
2. Implement sticky sessions on load balancer
3. Use TURN servers for NAT traversal
4. Consider using media servers (Janus, Kurento) for large-scale deployments

## Troubleshooting

### Connection Issues
- Check JWT token validity
- Verify WebSocket URL format
- Check CORS settings

### No Video
- Verify getUserMedia permissions
- Check ICE candidate exchange
- Verify STUN/TURN server configuration

### High Latency
- Use TURN servers for better connectivity
- Reduce video resolution
- Enable adaptive bitrate
