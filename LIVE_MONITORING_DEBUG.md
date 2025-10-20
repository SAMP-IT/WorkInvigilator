# Live Monitoring Stream Debugging Guide

## Problem Summary
Desktop apps are online but video streams are not showing in the dashboard despite Supabase Realtime connection being established.

## Root Cause Analysis

### Primary Issue: Media Stream Not Captured or WebRTC Signaling Failure

The live monitoring system requires 3 components to work:
1. **Desktop app connects to Supabase Realtime** (presence) ✅ WORKING
2. **Desktop app captures screen/audio/camera** (media stream) ❓ UNKNOWN
3. **Dashboard sends WebRTC offers → Desktop responds with answers** ❓ UNKNOWN

### Code Flow

```
Desktop App Startup:
1. startMonitoring() is called
2. initializeLiveStreamInBackground() runs asynchronously
   - initializeLiveStream() → creates LiveStreamManager + connects to Supabase
   - startLiveStreaming() → captures screen/audio/camera via getUserMedia
3. Desktop tracks presence with role: 'streamer'

Dashboard:
1. Connects to Supabase Realtime as viewer
2. Receives presence sync → sees desktop app as streamer
3. Auto-creates peer connection for each streamer
4. Sends WebRTC offer to streamer's presence key
5. Waits for answer from streamer

Desktop App (receives offer):
1. handleSignalingMessage() checks if message.to === this.presenceKey
2. If match → handleOffer() creates peer with localStream
3. Sends answer back to viewer
4. WebRTC connection established → video flows
```

## Diagnostic Steps

### Step 1: Check Desktop App Console (Electron DevTools)

Open desktop app DevTools: `Ctrl+Shift+I` (or View → Toggle Developer Tools)

**Look for these log patterns:**

#### ✅ GOOD - Live streaming initialized successfully:
```
🚀 ========================================
🚀 Starting live streaming initialization in background...
🚀 ========================================
🔧 Step 1: Initialize live stream manager...
📡 Connecting to Supabase Realtime...
📡 Channel name: live-monitoring:org_abc123
📡 Organization ID: org_abc123
📡 User ID: user_xyz789
📡 User email: manoj@gmail.com
📡 My presence key will be: user_xyz789:streamer:abc123def456
📡 Channel subscription status: SUBSCRIBED
✅ Connected to Supabase Realtime
✅ Registered as streamer with presence data: {userId: "user_xyz789", ...}
✅ My presence key for receiving offers: user_xyz789:streamer:abc123def456
✅ Step 1 complete: Live stream manager initialized
🔧 Step 2: Start live streaming (capture media)...
🎥 Starting media capture...
🎥 Starting screen, audio, and camera capture...
📡 Requesting screen sources from main process...
✅ Received X screen sources from main process
✅ Screen capture successful: 1920x1080
✅ Audio capture successful
✅ Camera capture successful: {label: "...", resolution: "640x480"}
✅ Started streaming with tracks: {video: 2, audio: 1}
✅ Desktop app is NOW READY to receive viewer connections
✅ Viewers can connect to presence key: user_xyz789:streamer:abc123def456
✅ Step 2 complete: Live streaming started
🚀 ========================================
✅ Live streaming fully initialized and ready
✅ Desktop app is broadcasting presence to viewers
🚀 ========================================
```

#### ❌ BAD - Live streaming failed:
```
❌ ========================================
❌ Failed to initialize live streaming (non-critical): Error: ...
❌ Error message: Failed to capture screen and audio
❌ Error stack: ...
❌ ========================================
```

**Common failure reasons:**
- Screen capture permission denied
- No microphone/camera access
- DesktopCapturer API failed
- Supabase authentication failed (no JWT token)

### Step 2: Check for WebRTC Offer Reception

**After dashboard connects, look for:**

#### ✅ GOOD - Offer received and processed:
```
📨 RAW BROADCAST RECEIVED!
📨 Full data: {...}
📨 Payload: {type: "webrtc:offer", ...}
📨 ========================================
📨 RAW MESSAGE HANDLER CALLED
📨 Message type: webrtc:offer
📨 Message from (viewer presence key): user_abc:viewer:xyz123
📨 Message to (target presence key): user_xyz789:streamer:abc123def456
📨 My presence key: user_xyz789:streamer:abc123def456
📨 Presence keys match: true
📨 ========================================
✅ Processing message for presence key: user_xyz789:streamer:abc123def456
📥 Received offer from viewer: user_abc:viewer:xyz123 (userId: user_abc)
🤝 Creating peer connection for viewer: user_abc:viewer:xyz123
📹 Local stream tracks: {...}
📤 Sending answer to viewer: user_abc:viewer:xyz123
```

#### ❌ BAD - Offer not received or rejected:
```
📨 RAW BROADCAST RECEIVED!
📨 ========================================
📨 RAW MESSAGE HANDLER CALLED
📨 Message type: webrtc:offer
📨 Message from (viewer presence key): user_abc:viewer:xyz123
📨 Message to (target presence key): user_xyz789:streamer:WRONG_SESSION
📨 My presence key: user_xyz789:streamer:abc123def456
📨 Presence keys match: false
📨 ========================================
⏭️ Skipping message - not for us (presence key mismatch)
⏭️ Expected: user_xyz789:streamer:abc123def456
⏭️ Received: user_xyz789:streamer:WRONG_SESSION
```

**This means:** Dashboard is targeting the wrong presence key (stale presence data)

### Step 3: Check Dashboard Console (Browser DevTools)

Open browser DevTools: `F12`

**Look for these patterns:**

#### ✅ GOOD - Streamer detected and offer sent:
```
📋 Received streamers list: [{presenceKey: "user_xyz789:streamer:abc123def456", ...}]
🎬 Auto-starting stream for: manoj@gmail.com
🔗 Creating new peer connection for: user_xyz789:streamer:abc123def456
🔧 SimplePeer instance created with offerToReceiveVideo and offerToReceiveAudio
🔧 Adding transceivers to receive 2 video tracks (screen + camera)
✅ Transceivers added for 2 video + 1 audio tracks
🔔 PEER SIGNAL EVENT! offer
📤 Sending offer to: user_xyz789:streamer:abc123def456 (userId: user_xyz789)
📤 Signaling ref exists? true
📤 sendOffer function exists? true
📡 Broadcasting message: {type: "webrtc:offer", from: "...", to: "user_xyz789:streamer:abc123def456"}
📡 Broadcast result: ok
✅ Broadcast sent successfully
```

#### ❌ BAD - No streamers found:
```
📋 Received streamers list: []
```

**This means:**
- Desktop app is not tracking presence
- Self-filtering is removing the streamer (viewer userId === streamer userId)
- RLS policies blocking presence visibility

#### ❌ BAD - Answer not received:
```
📤 Sending offer to: user_xyz789:streamer:abc123def456
(... wait 15 seconds ...)
⏱️ Connection timeout for: user_xyz789:streamer:abc123def456
🔄 Retrying after timeout...
```

**This means:** Desktop app is not responding to offers (likely not receiving them)

### Step 4: Verify Presence Key Consistency

**In Desktop Console:**
```javascript
// Find the line that says:
📡 My presence key will be: user_xyz789:streamer:abc123def456
```

**In Dashboard Console:**
```javascript
// Find the line that says:
📋 Received streamers list: [{presenceKey: "user_xyz789:streamer:abc123def456", ...}]
```

**These MUST match exactly!**

If they don't match, the dashboard is sending offers to the wrong presence key.

### Step 5: Check Self-Filtering (Common Issue)

**Dashboard console - look for:**
```
⏭️ Skipping own desktop stream (viewer filtering): user_xyz789
```

**This happens when:**
- User is logged into BOTH desktop app AND dashboard with the SAME account
- The dashboard filters out the streamer because `streamer.userId === viewer.userId`

**Solution:** Use TWO different user accounts:
- Desktop app: `manoj@gmail.com`
- Dashboard viewer: `admin@company.com` (different user)

## Common Issues and Solutions

### Issue 1: Media Capture Failure

**Symptoms:**
```
❌ Failed to start streaming: Error: Failed to capture screen and audio
```

**Solutions:**
1. Grant screen recording permission on Windows
2. Check if microphone/camera is accessible
3. Restart desktop app
4. Check if another app is using screen capture

### Issue 2: Presence Key Mismatch

**Symptoms:**
- Desktop sees offers but skips them
- Logs show: `Presence keys match: false`

**Solutions:**
1. Restart desktop app (generates new presence key)
2. Refresh dashboard page (gets new presence sync)
3. Check that dashboard is getting latest presence state

### Issue 3: Self-Filtering (Same User)

**Symptoms:**
- Dashboard shows "1 employees online"
- But streamers list is empty
- Console shows: "Skipping own desktop stream"

**Solution:**
- Use different user account for dashboard viewing
- OR temporarily comment out self-filtering in `supabase-realtime-signaling.ts` lines 285-288 and 313-317

### Issue 4: Broadcast Not Received

**Symptoms:**
- Dashboard sends offer successfully (`Broadcast result: ok`)
- Desktop never logs "RAW BROADCAST RECEIVED!"

**Solutions:**
1. Check Supabase Realtime channel subscription status
2. Verify private channel is configured correctly
3. Check JWT token is valid on desktop app
4. Restart both desktop app and dashboard

### Issue 5: Async Timing Issue

**Symptoms:**
- Dashboard auto-starts connection before desktop finishes `startStreaming()`
- Desktop has no `localStream` when `handleOffer()` is called

**Current mitigation:**
- Desktop logs clearly show when ready: "Desktop app is NOW READY to receive viewer connections"
- If dashboard connects before this log, it's too early

**Future fix:**
- Desktop should update presence with `streamReady: true` AFTER `startStreaming()` completes
- Dashboard should only send offers when `streamReady === true`

## Testing Checklist

### Desktop App
- [ ] Desktop app starts monitoring session
- [ ] Console shows "Live streaming fully initialized and ready"
- [ ] Presence key is logged
- [ ] Media capture successful (screen, audio, camera)
- [ ] Local stream has 2-3 tracks (screen video, camera video, audio)

### Dashboard
- [ ] Dashboard connects to Supabase Realtime
- [ ] Console shows "Connected to Supabase Realtime"
- [ ] Streamers list includes desktop app user
- [ ] Presence key matches desktop app's presence key
- [ ] Offer is sent successfully
- [ ] Answer is received from desktop app
- [ ] ICE candidates are exchanged
- [ ] Video element shows stream

### WebRTC Connection
- [ ] Desktop receives offer
- [ ] Desktop creates peer with local stream
- [ ] Desktop sends answer
- [ ] ICE connection state becomes "connected" or "completed"
- [ ] Dashboard peer emits "stream" event
- [ ] Video element srcObject is set
- [ ] Video plays automatically

## Quick Debug Commands

### In Desktop App Console:
```javascript
// Check if live stream manager exists
console.log('LiveStreamManager:', window.app.liveStreamManager);

// Check streaming status
console.log('Status:', window.app.liveStreamManager?.getStatus());

// Check local stream
console.log('Local Stream:', window.app.liveStreamManager?.localStream);
console.log('Tracks:', window.app.liveStreamManager?.localStream?.getTracks());
```

### In Dashboard Console:
```javascript
// Check signaling connection
console.log('Is Connected:', window.signalingRef?.current?.isConnected());

// Check streamers
console.log('Streamers:', window.signalingRef?.current?.getStreamers());

// Check peers
console.log('Peers:', Array.from(window.peersRef?.current?.entries() || []));
```

## Expected Timeline

1. **T+0s**: Desktop app starts monitoring
2. **T+1s**: Desktop connects to Supabase Realtime
3. **T+2s**: Desktop tracks presence as streamer
4. **T+3-10s**: Desktop captures screen/audio/camera (SLOW - this is the bottleneck)
5. **T+10s**: Desktop ready to receive connections
6. **T+0s** (Dashboard): Dashboard connects to Supabase Realtime
7. **T+1s** (Dashboard): Dashboard receives presence sync
8. **T+2s** (Dashboard): Dashboard auto-starts peer connection
9. **T+3s** (Dashboard): Dashboard sends WebRTC offer
10. **T+4s**: Desktop receives offer, creates peer, sends answer
11. **T+5-10s**: ICE candidates exchanged
12. **T+10-15s**: WebRTC connection established
13. **T+15s**: Video streams start flowing

**Total time to first stream: 15-25 seconds**

## Next Steps

1. **Check desktop app console** - verify media capture succeeded
2. **Check dashboard console** - verify offer was sent
3. **Check desktop app console** - verify offer was received
4. **Check presence keys match** - both sides must use same key
5. **Verify different user accounts** - desktop and dashboard must be different users
6. **Monitor WebRTC state** - ICE connection should reach "connected"

## Enhanced Logging Applied

The following files have been updated with enhanced logging:
- `work-invigilator-desktop/livestream-supabase.js`
  - Added user ID and email logging during initialization
  - Added presence data logging when tracking
  - Added detailed presence key logging for offer reception
  - Added media capture progress logging
  - Added stream readiness confirmation logs

- `work-invigilator-desktop/renderer.js`
  - Added bracketed section markers for initialization flow
  - Added step completion confirmations
  - Added detailed error logging with stack traces

These logs will make it MUCH easier to diagnose where the flow is breaking.

## File Locations

- Desktop app code: `work-invigilator-desktop/livestream-supabase.js`
- Desktop app renderer: `work-invigilator-desktop/renderer.js`
- Dashboard viewer: `nextjs-dashboard/app/live-monitoring/page.tsx`
- Signaling class: `nextjs-dashboard/lib/supabase-realtime-signaling.ts`
