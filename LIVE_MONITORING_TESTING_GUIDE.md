# Live Video & Audio Monitoring - Testing Guide

## Overview
This guide explains how to test the newly implemented live video and audio monitoring feature that allows real-time monitoring of all employees through the dashboard, similar to Zoom.

## Architecture Fixed
The implementation had an architecture issue where WebRTC APIs were being called from the Node.js main process, but `navigator.mediaDevices.getUserMedia()` only exists in the browser/renderer process.

### Fix Applied:
- ✅ Removed IPC handlers from [main.js:584-625](work-invigilator-desktop/main.js#L584-L625)
- ✅ Removed IPC methods from [preload.js:40-43](work-invigilator-desktop/preload.js#L40-L43)
- ✅ Updated [livestream.js](work-invigilator-desktop/livestream.js) to run in renderer process with proper error handling
- ✅ Updated [renderer.js:1860-1912](work-invigilator-desktop/renderer.js#L1860-L1912) to load LiveStreamManager directly using `require()`
- ✅ Dashboard server running on localhost:3002 with WebRTC signaling server

## Components

### 1. Desktop App (work-invigilator-desktop)
- **livestream.js**: Manages WebRTC connections, screen capture, and audio streaming
- **renderer.js**: Integrates live streaming into the monitoring workflow
- Automatically starts streaming when monitoring begins
- Automatically stops streaming when monitoring ends

### 2. Dashboard (nextjs-dashboard)
- **Server**: Custom Next.js server with Socket.IO signaling on port 3002
- **Signaling Server**: [lib/signaling-server.ts](nextjs-dashboard/lib/signaling-server.ts) coordinates WebRTC connections
- **Live Monitoring Page**: [app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx) displays employee streams
- **Navigation**: Added "🎥 Live Monitoring" link to sidebar

## Testing Steps

### Step 1: Verify Dashboard Server
1. Dashboard server should already be running on http://localhost:3002
2. Check console output for:
   ```
   ✅ WebRTC Signaling Server initialized
   > Ready on http://localhost:3002
   > WebRTC Signaling Server ready on ws://localhost:3002
   ```

### Step 2: Restart Desktop App
1. **IMPORTANT**: Close the desktop app completely if it's currently running
2. Restart the desktop app to load the new code changes
3. Login with your employee credentials

### Step 3: Start Monitoring
1. Click the main toggle button to start monitoring
2. Watch the console for these messages:
   ```
   ✅ Live stream manager initialized
   📡 Connecting to signaling server...
   ✅ Connected to signaling server
   🎥 Starting screen and audio capture...
   📺 Found [N] screen sources
   🖥️ Using screen: [screen name]
   ✅ Screen capture successful
   ✅ Audio capture successful
   📹 Combined stream created
   ✅ Started streaming with tracks: { video: 1, audio: 1 }
   ✅ Live streaming started
   ```

### Step 4: Open Live Monitoring Dashboard
1. Open your browser to http://localhost:3002/live-monitoring
2. Login if not already authenticated
3. You should see:
   - **Grid Size Selector**: Choose 1x1, 2x2, 3x3, or 4x4 grid
   - **Available Employees Sidebar**: List of online employees
   - **Stream Grid**: Empty placeholders for streams

### Step 5: View Employee Stream
1. Check if your employee appears in the "Available Employees" list
2. Click on the employee card to initiate the stream
3. Watch the console for WebRTC connection establishment:
   ```
   📥 Received offer from viewer: [socketId]
   🤝 Creating peer connection for viewer: [socketId]
   📤 Sending answer to viewer: [socketId]
   🧊 Sending ICE candidate to viewer: [socketId]
   ✅ Connected to viewer: [socketId]
   ```

### Step 6: Verify Stream Display
1. The employee's screen should appear in the grid
2. You should see live video of their screen
3. Audio should be streaming (if they have a microphone)
4. Stream controls should appear on hover:
   - Mute/Unmute audio
   - Fullscreen
   - Stop stream

### Step 7: Test Multiple Employees
1. If you have multiple employees online:
   - Click multiple employee cards
   - Verify each stream appears in the grid
   - Test grid size changes (1x1, 2x2, 3x3, 4x4)

### Step 8: Stop Monitoring
1. Click the main toggle button to stop monitoring
2. Console should show:
   ```
   🛑 Stopping live stream
   Closing peer connection: [socketId]
   🛑 Live streaming stopped
   ```
3. Dashboard should show employee as offline

## Expected Console Output (Desktop App)

### Successful Initialization:
```
✅ Live stream manager initialized
📡 Connecting to signaling server...
✅ Connected to signaling server
```

### Successful Streaming Start:
```
🎥 Starting screen and audio capture...
📺 Found 1 screen sources
🖥️ Using screen: Entire Screen
✅ Screen capture successful
✅ Audio capture successful
📹 Combined stream created: { videoTracks: 1, audioTracks: 1 }
✅ Started streaming with tracks: { video: 1, audio: 1 }
✅ Live streaming started
```

### When Dashboard Viewer Connects:
```
📥 Received offer from viewer: abc123def456
🤝 Creating peer connection for viewer: abc123def456
📤 Sending answer to viewer: abc123def456
🧊 Sending ICE candidate to viewer: abc123def456
✅ Connected to viewer: abc123def456
```

### Successful Streaming Stop:
```
🛑 Stopping live stream
Closing peer connection: abc123def456
🛑 Live streaming stopped
```

## Troubleshooting

### Error: "navigator.mediaDevices not available"
**Cause**: livestream.js is being loaded in main process instead of renderer process
**Fix**: Already fixed - ensure you've restarted the desktop app

### Error: "Failed to capture screen and audio"
**Possible Causes**:
1. Screen recording permission not granted (macOS)
2. No microphone connected
3. Microphone permission not granted

**Solution**:
- Grant screen recording permission in System Preferences (macOS)
- Connect a microphone
- Grant microphone permission when prompted

### Error: "Failed to start live streaming: Cannot read properties of undefined"
**Cause**: Old code still running
**Solution**: Completely close and restart the desktop app

### Employee Not Appearing in Dashboard
**Possible Causes**:
1. Desktop app not started monitoring
2. WebSocket connection failed
3. Organization ID mismatch

**Debug Steps**:
1. Check desktop app console for "✅ Connected to signaling server"
2. Check network tab in dashboard for WebSocket connection
3. Verify same organization ID in both desktop app and dashboard

### WebRTC Connection Fails
**Possible Causes**:
1. STUN servers unreachable
2. Firewall blocking ICE candidates
3. Both devices behind symmetric NAT (rare)

**Debug Steps**:
1. Check console for ICE candidate exchange messages
2. Verify no firewall blocking WebRTC ports
3. Try from same network first

## Technical Details

### WebRTC Flow:
1. **Employee (Streamer)**:
   - Captures screen using `desktopCapturer.getSources()`
   - Captures audio using `navigator.mediaDevices.getUserMedia()`
   - Combines tracks into single MediaStream
   - Connects to signaling server via Socket.IO
   - Registers as streamer with organization ID

2. **Dashboard (Viewer)**:
   - Connects to signaling server via Socket.IO
   - Registers as viewer with organization ID
   - Receives list of available streamers
   - Initiates WebRTC connection by sending offer
   - Receives answer and ICE candidates
   - Establishes P2P connection
   - Displays remote stream in video element

3. **Signaling Server**:
   - Manages streamer and viewer lists per organization
   - Routes WebRTC offers/answers between peers
   - Handles ICE candidate exchange
   - Notifies viewers when streamers join/leave

### STUN Servers Used:
```javascript
stun:stun.l.google.com:19302
stun:stun1.l.google.com:19302
stun:stun2.l.google.com:19302
```

### Ports:
- Dashboard: 3002 (HTTP + WebSocket)
- WebRTC: Dynamic ports for ICE candidates

## Next Steps (Optional Enhancements)

### For Production:
1. Add TURN server for NAT traversal in complex networks
2. Implement SFU (Selective Forwarding Unit) with Mediasoup for 30+ employees
3. Add recording capability to save streams
4. Add stream quality controls (resolution, framerate, bitrate)
5. Add privacy controls (blur/mask sensitive areas)
6. Add session recording for audit trail

### For Better UX:
1. Add employee status indicators (online/offline/streaming)
2. Add stream statistics (bitrate, latency, packet loss)
3. Add search/filter for employees
4. Add layout presets (grid, list, focus view)
5. Add keyboard shortcuts for navigation

## Performance Notes

### Current Implementation:
- **Scalability**: P2P WebRTC works well for ~10-15 concurrent viewers per employee
- **Bandwidth**: Each P2P connection uses ~2-5 Mbps (depends on screen resolution and activity)
- **Latency**: Expected 200-500ms delay (Zoom-like)

### For 30+ Employees:
- Recommend implementing SFU (Selective Forwarding Unit) with Mediasoup
- SFU allows one upload per employee, multiple downloads on dashboard
- Reduces bandwidth usage on employee devices
- Improves scalability to 100+ employees

## Files Modified

### Desktop App:
- [work-invigilator-desktop/livestream.js](work-invigilator-desktop/livestream.js) - WebRTC stream manager
- [work-invigilator-desktop/renderer.js:1860-1912](work-invigilator-desktop/renderer.js#L1860-L1912) - Integration methods
- [work-invigilator-desktop/main.js:584-586](work-invigilator-desktop/main.js#L584-L586) - Comment explaining no IPC needed
- [work-invigilator-desktop/preload.js:40](work-invigilator-desktop/preload.js#L40) - Comment about renderer process
- [work-invigilator-desktop/index.html](work-invigilator-desktop/index.html) - CSP updated for localhost:3002

### Dashboard:
- [nextjs-dashboard/lib/signaling-server.ts](nextjs-dashboard/lib/signaling-server.ts) - WebRTC signaling server
- [nextjs-dashboard/server.js](nextjs-dashboard/server.js) - Custom Next.js server
- [nextjs-dashboard/app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx) - Live monitoring UI
- [nextjs-dashboard/components/layout/Sidebar.tsx](nextjs-dashboard/components/layout/Sidebar.tsx) - Navigation link
- [nextjs-dashboard/package.json](nextjs-dashboard/package.json) - Updated scripts

### Dependencies Installed:
```json
{
  "socket.io": "^4.8.1",
  "socket.io-client": "^4.8.1",
  "simple-peer": "^9.11.1",
  "mediasoup": "^3.19.4"
}
```

## Support

If you encounter any issues:
1. Check this testing guide first
2. Review console logs for error messages
3. Verify all steps were followed in order
4. Restart both desktop app and dashboard server
5. Check that no other processes are using port 3002
