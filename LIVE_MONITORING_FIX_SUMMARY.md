# Live Monitoring Stream Fix Summary

## Problem Description
Desktop apps show as "online" (1 employees online) but video streams are not visible in the dashboard. The connection to Supabase Realtime is established but no video appears in the video grid.

## Root Cause Identification

After analyzing the code flow, I identified the following potential issues:

### 1. Silent Errors in Media Capture
The desktop app runs `initializeLiveStreamInBackground()` asynchronously, which catches errors but doesn't surface them to the user. If media capture fails, the desktop app appears "online" via presence but has no stream to send.

**Code Location:** `work-invigilator-desktop/renderer.js` lines 557-583

### 2. Presence Key Routing
The WebRTC signaling system uses presence keys (e.g., `user_123:streamer:abc456`) to route messages between dashboard and desktop. If these keys don't match exactly, offers won't be received.

**Code Location:** `work-invigilator-desktop/livestream-supabase.js` lines 126-145

### 3. Self-Filtering Logic
If the same user account is logged into both desktop app AND dashboard, the dashboard filters out that user's stream to prevent viewing their own desktop.

**Code Location:** `nextjs-dashboard/lib/supabase-realtime-signaling.ts` lines 285-288, 313-317

### 4. Timing Issue
The dashboard auto-starts peer connections when it detects a streamer in presence. However, the desktop app might not have completed media capture yet. The desktop tracks presence at ~2s but media capture can take 3-10s.

**Code Location:** `nextjs-dashboard/app/live-monitoring/page.tsx` lines 86-99

## Solution Applied

I've added comprehensive logging to diagnose the exact failure point:

### Changes Made

#### 1. Enhanced Desktop App Logging (`livestream-supabase.js`)

**Added logs during initialization:**
- User ID and email
- Presence key generation
- Presence data when tracking
- Media capture progress
- Stream readiness confirmation

**Added logs during message handling:**
- Clear separation with `========================================` markers
- Presence key comparison (expected vs received)
- Detailed mismatch reasons

**Added logs during streaming:**
- Media capture start
- Each capture step (screen, audio, camera)
- Success confirmation with track counts
- Ready state announcement

#### 2. Enhanced Renderer Logging (`renderer.js`)

**Added initialization flow markers:**
- Clear section boundaries with `========================================`
- Step-by-step completion confirmations
- Detailed error messages with stack traces

#### 3. Created Debugging Guide (`LIVE_MONITORING_DEBUG.md`)

Comprehensive guide covering:
- Code flow explanation
- Diagnostic steps with expected log patterns
- Common issues and solutions
- Testing checklist
- Quick debug commands

## How to Diagnose the Issue

### Step 1: Open Desktop App Console
- Windows: `Ctrl+Shift+I` or View → Toggle Developer Tools
- Look for the initialization sequence (starts with `🚀 ========================================`)

### Step 2: Verify Media Capture
Look for this confirmation:
```
✅ Started streaming with tracks: {video: 2, audio: 1}
✅ Desktop app is NOW READY to receive viewer connections
```

If you see an error instead:
```
❌ Failed to initialize live streaming (non-critical): Error: ...
```

This is the problem - media capture failed.

### Step 3: Check Offer Reception
After dashboard connects, look for:
```
📨 RAW BROADCAST RECEIVED!
📨 Message type: webrtc:offer
📨 Presence keys match: true
✅ Processing message for presence key: ...
```

If you see:
```
📨 Presence keys match: false
⏭️ Skipping message - not for us
```

This means presence key mismatch.

### Step 4: Check Dashboard Console
- Browser: Press `F12`
- Look for streamers list:
```
📋 Received streamers list: [{presenceKey: "...", userEmail: "manoj@gmail.com"}]
```

If the list is empty, the issue is:
- Desktop app not tracking presence
- Self-filtering (same user logged in)
- RLS policy blocking

## Common Issues and Quick Fixes

### Issue 1: Same User on Desktop and Dashboard
**Symptom:** Dashboard shows "1 employees online" but streamers list is empty

**Solution:** Use different accounts:
- Desktop: `manoj@gmail.com`
- Dashboard: `admin@company.com`

### Issue 2: Media Capture Permission Denied
**Symptom:** Desktop console shows error during media capture

**Solution:**
1. Check Windows screen recording permissions
2. Grant microphone/camera access
3. Restart desktop app

### Issue 3: Presence Key Mismatch
**Symptom:** Desktop receives offers but skips them

**Solution:**
1. Restart desktop app (generates new presence key)
2. Refresh dashboard page (syncs new presence)

### Issue 4: Async Timing
**Symptom:** Dashboard connects before desktop finishes media capture

**Solution:** Wait 10-15 seconds after desktop shows "online" before expecting video

## Verification Steps

Follow these steps in order:

1. **Start Desktop App**
   - Click "Start Session"
   - Open DevTools (`Ctrl+Shift+I`)
   - Wait for "✅ Live streaming fully initialized and ready"

2. **Copy Presence Key**
   - Find line: `✅ My presence key for receiving offers: user_xxx:streamer:xxx`
   - Copy this key

3. **Open Dashboard**
   - Go to Live Monitoring page
   - Open DevTools (`F12`)
   - Wait for "📋 Received streamers list: [...]"
   - Verify the presenceKey in the list matches what you copied

4. **Check Video Grid**
   - If presence keys match, video should appear within 10-15 seconds
   - Look for auto-start logs: `🎬 Auto-starting stream for: manoj@gmail.com`

5. **Monitor WebRTC**
   - Dashboard should log: `📤 Sending offer to: ...`
   - Desktop should log: `📥 Received offer from viewer: ...`
   - Desktop should log: `📤 Sending answer to viewer: ...`
   - Dashboard should log: `📺 Received stream from: ...`

## Files Modified

1. `work-invigilator-desktop/livestream-supabase.js`
   - Enhanced initialization logging (lines 24-87)
   - Enhanced message handler logging (lines 126-145)
   - Enhanced streaming logging (lines 204-237)

2. `work-invigilator-desktop/renderer.js`
   - Enhanced background initialization logging (lines 557-583)

3. `LIVE_MONITORING_DEBUG.md`
   - New comprehensive debugging guide

## Next Steps

1. **Test with the enhanced logging**
   - Start desktop app
   - Check console for any errors in the initialization sequence
   - Share the logs if issues persist

2. **Verify account setup**
   - Ensure desktop and dashboard use different user accounts
   - Check that both users belong to the same organization

3. **Check browser compatibility**
   - Use Chrome/Edge for best WebRTC support
   - Ensure browser has camera/microphone permissions (for viewer side)

4. **Test network conditions**
   - WebRTC requires open network (not blocked by firewall)
   - STUN servers need to be reachable
   - Consider adding TURN server if behind restrictive NAT

## Expected Behavior

**After fix:**

1. Desktop app starts session
2. Within 10 seconds: Console shows "✅ Live streaming fully initialized and ready"
3. Desktop app tracks presence with streamActive: true
4. Dashboard detects streamer in presence
5. Dashboard auto-creates peer connection
6. Dashboard sends WebRTC offer
7. Desktop receives offer (logs show presence key match)
8. Desktop creates peer with local stream
9. Desktop sends answer back
10. ICE candidates exchanged
11. WebRTC connection established
12. Video appears in dashboard grid
13. Total time: 15-25 seconds from desktop start to video playing

## Prevention Strategies

### For Future Deployments:

1. **Add UI feedback for live streaming status**
   - Show "Initializing live stream..." in desktop app
   - Show "Ready to stream" when complete
   - Show error badge if media capture fails

2. **Add presence field: `streamReady`**
   - Desktop updates presence to `streamReady: true` after `startStreaming()` completes
   - Dashboard only sends offers when `streamReady === true`
   - Prevents timing issues

3. **Add reconnection logic**
   - If WebRTC connection fails, auto-retry
   - Show connection status in dashboard

4. **Add admin override for self-viewing**
   - Allow admin to view their own desktop stream (disable self-filtering)
   - Useful for testing with single account

## Contact

If issues persist after following this guide, provide:
1. Desktop app console logs (full initialization sequence)
2. Dashboard console logs (streamers list + offer sending)
3. User account emails (desktop and dashboard)
4. Organization ID
5. Browser and OS versions
