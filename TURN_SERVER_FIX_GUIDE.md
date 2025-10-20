# TURN Server Fix - Deployment and Testing Guide

## Problem Summary

**Issue**: Live monitoring shows 2x2 placeholder video instead of actual screen share.

**Root Cause**: ICE candidates only included "host" and "srflx" (STUN) types, missing "relay" (TURN) types. OpenRelay TURN servers were configured but not working (likely overloaded/down).

**Solution**: Added Twilio TURN servers as primary, kept OpenRelay as fallback for redundancy.

## Files Modified

1. `nextjs-dashboard/app/live-monitoring/page.tsx`
   - Lines 329-368: Updated iceServers config
   - Lines 726-741: Enhanced ICE candidate type logging

2. `work-invigilator-desktop/livestream-supabase.js`
   - Lines 453-495: Updated iceServers config
   - Lines 531-546: Enhanced ICE candidate type logging

## What Changed

### TURN Servers Added (Twilio - High Reliability)

```javascript
{
  urls: 'turn:global.turn.twilio.com:3478?transport=udp',
  username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
  credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
},
{
  urls: 'turn:global.turn.twilio.com:3478?transport=tcp',
  username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
  credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
},
{
  urls: 'turn:global.turn.twilio.com:443?transport=tcp',
  username: 'f4b4035eaa76f4a55de5f4351567653ee4ff6fa97b50b6b334fcc1be4e8d8f71',
  credential: 'w1uxM55V9yVoqyVFjt+mxDBV0F87AUCemaYVQGxsPLw='
}
```

### Enhanced Logging

Both dashboard and desktop app now log:
- ICE candidate type: `HOST (local)`, `SRFLX (STUN)`, or `RELAY (TURN)`
- Green success message when TURN relay candidates are found

## Deployment Steps

### 1. Rebuild Desktop App

```bash
# Navigate to desktop app directory
cd work-invigilator-desktop

# Install dependencies (if needed)
npm install

# Build the Electron app
npm run build

# OR for development testing
npm start
```

### 2. Restart/Rebuild Dashboard

#### Option A: Development Mode
```bash
# Navigate to dashboard directory
cd nextjs-dashboard

# Install dependencies (if needed)
npm install

# Start dev server
npm run dev
```

#### Option B: Production Deployment (Vercel/Netlify)
```bash
# Commit changes
git add .
git commit -m "fix: Replace OpenRelay with Twilio TURN servers for better reliability"
git push

# Vercel will auto-deploy, or manually deploy:
vercel --prod
```

### 3. Test TURN Connectivity BEFORE Full Test

**IMPORTANT**: Run this test FIRST to verify TURN servers are reachable!

#### Dashboard Test (Browser Console)
1. Open dashboard at `http://localhost:3000/live-monitoring` (or production URL)
2. Open DevTools (F12)
3. Copy-paste contents of `test-turn-connectivity.js` into console
4. Press Enter
5. Wait 10 seconds

**Expected Output:**
```
ICE Candidate: candidate:... typ host
  -> Type: HOST (local network)
ICE Candidate: candidate:... typ srflx
  -> Type: SRFLX (STUN - public IP)
ICE Candidate: candidate:... typ relay ← MUST SEE THIS!
  -> Type: RELAY (TURN - relayed connection) *** THIS IS GOOD! ***

SUCCESS! TURN servers are working!
```

**If NO relay candidates appear:**
- TURN servers might be blocked by firewall/corporate network
- Try testing from different network (mobile hotspot)
- Check browser console for TURN server errors

#### Desktop App Test (Electron Console)
1. Open desktop app
2. Press `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac) to open DevTools
3. Run same `test-turn-connectivity.js` script
4. Verify relay candidates appear

### 4. Full End-to-End Test

**Prerequisites:**
- Desktop app running and showing "streaming" status
- Dashboard open to `/live-monitoring` page
- Employee user logged in on desktop app
- Manager/viewer user logged in on dashboard

**Test Steps:**

1. **Start Desktop Stream**
   - Employee: Launch desktop app
   - Employee: Log in with credentials
   - Employee: App should auto-start streaming
   - Employee: Check console for: `"🧊 [Desktop] Candidate type: RELAY (TURN)"`

2. **Connect from Dashboard**
   - Manager: Navigate to `/live-monitoring`
   - Manager: Employee should appear in the list
   - Manager: Click employee's row to view stream
   - Manager: Check console for: `"🧊 Candidate type: RELAY (TURN)"`

3. **Verify Connection**
   - Look for: `"🧊 ICE connection state: connected"`
   - Screen video should show real dimensions (e.g., "🎬 Video dimensions: 1920 x 1080")
   - NOT the 2x2 placeholder!

4. **Verify Video Quality**
   - Screen share should display employee's actual screen
   - Video should be smooth (not frozen)
   - Camera feed should also appear (if enabled)

### 5. Console Logs to Watch For

#### SUCCESS Indicators:
```
🧊 Candidate type: RELAY (TURN)
✅ TURN server working! Relay candidate found.
🧊 ICE connection state: connected
🎬 Video dimensions: 1920 x 1080 (or actual screen size)
✅ Screen video playing
```

#### FAILURE Indicators:
```
⏱ Connection timeout (30 seconds) ← BAD
❌ Peer connection closed ← BAD
🎬 Video dimensions: 2 x 2 ← STILL BROKEN!
🧊 ICE connection state: failed ← BAD
```

## Troubleshooting

### Issue 1: Still No Relay Candidates

**Symptoms:**
- Test script shows 0 relay candidates
- Only HOST and SRFLX candidates appear

**Solutions:**

1. **Network Blocking TURN Ports**
   - Corporate firewall might block ports 80, 443, 3478
   - Test from different network (mobile hotspot)
   - Contact IT to whitelist:
     - `global.turn.twilio.com` (ports 80, 443, 3478)
     - `openrelay.metered.ca` (ports 80, 443)

2. **Browser/Electron Restrictions**
   - Some browsers block TURN on localhost
   - Test on HTTPS domain instead
   - Check browser console for TURN errors

3. **TURN Credentials Expired**
   - Twilio test credentials might expire
   - Get new credentials from: https://www.twilio.com/stun-turn
   - Or set up your own TURN server: https://github.com/coturn/coturn

### Issue 2: Connection Still Times Out

**Symptoms:**
- Relay candidates ARE found
- But connection still fails after 30 seconds

**Solutions:**

1. **Check Signaling**
   - Verify Supabase realtime channel is working
   - Look for: `"📤 Sending offer to..."` and `"📥 Received answer from..."`
   - Check Supabase dashboard for connection errors

2. **Check Both Sides**
   - Desktop app must send relay candidates too
   - Verify BOTH dashboard AND desktop app show relay candidates
   - If only one side has relay, connection might fail

3. **ICE Candidate Race Condition**
   - Candidates might arrive before peer is ready
   - Already handled with buffering in code
   - But verify: `"📦 Processing buffered ICE candidates"`

### Issue 3: Video Still Shows 2x2 Placeholder

**Symptoms:**
- Connection succeeds (state: "connected")
- But video is still 2x2

**Solutions:**

1. **No Video Tracks Sent**
   - Desktop app might not be sending screen share
   - Check desktop console: `"📹 Local stream tracks:"`
   - Verify: `video: ["screen share (xxxxxxxx)", "camera (xxxxxxxx)"]`

2. **Transceiver Mismatch**
   - Dashboard expects 2 video tracks (screen + camera)
   - Desktop might be sending only 1
   - Check: `"✅ Transceivers added for 2 video + 1 audio tracks"`

3. **Video Element Not Attached**
   - Stream received but not attached to `<video>` element
   - Look for: `"✅ Screen video playing"`
   - Check: `videoRef.current.srcObject` is not null

### Issue 4: Works on Mobile Hotspot but Not Office Network

**Symptoms:**
- TURN works when connected via mobile hotspot
- Fails on corporate/office network

**Solution:**

This is a **firewall/corporate network issue**:

1. **Temporary Workaround**
   - Use mobile hotspot for testing
   - Or use VPN that allows TURN traffic

2. **Permanent Fix**
   - Contact IT department
   - Request whitelist for TURN servers:
     ```
     Domains to whitelist:
     - global.turn.twilio.com (ports: 80, 443, 3478 UDP/TCP)
     - openrelay.metered.ca (ports: 80, 443 UDP/TCP)
     - stun.l.google.com (port: 19302 UDP)

     Protocols: UDP and TCP
     Purpose: WebRTC TURN relay for video conferencing
     ```

3. **Alternative: Self-Hosted TURN Server**
   - Deploy coturn on your own server
   - Add to iceServers config:
     ```javascript
     {
       urls: 'turn:your-server.com:3478',
       username: 'your-username',
       credential: 'your-password'
     }
     ```

## Testing Checklist

- [ ] Desktop app: `test-turn-connectivity.js` shows relay candidates
- [ ] Dashboard: `test-turn-connectivity.js` shows relay candidates
- [ ] Desktop app console: `"🧊 [Desktop] Candidate type: RELAY (TURN)"`
- [ ] Dashboard console: `"🧊 Candidate type: RELAY (TURN)"`
- [ ] ICE connection state: `"connected"` (not "failed" or "disconnected")
- [ ] Video dimensions: Real size (e.g., 1920x1080), NOT 2x2
- [ ] Screen share displays actual employee screen
- [ ] Camera feed displays (if enabled)
- [ ] Connection establishes in < 10 seconds (not 30-second timeout)

## Success Criteria

When everything works correctly, you should see:

**Desktop App Console:**
```
🧊 [Desktop] Candidate type: HOST (local)
🧊 [Desktop] Candidate type: SRFLX (STUN)
🧊 [Desktop] Candidate type: RELAY (TURN)
✅ [Desktop] TURN server working! Relay candidate found.
🧊 [Desktop] ICE connection state for viewer-xxx: connected
✅ [Desktop] ICE connection established for viewer: viewer-xxx
```

**Dashboard Console:**
```
🧊 Candidate type: HOST (local)
🧊 Candidate type: SRFLX (STUN)
🧊 Candidate type: RELAY (TURN)
✅ TURN server working! Relay candidate found.
🧊 ICE connection state for employee-xxx: connected
✅ Successfully connected to: employee-xxx
🎬 Video dimensions: 1920 x 1080
✅ Screen video playing
```

## Alternative TURN Server Providers

If Twilio TURN servers also fail, try these alternatives:

### 1. Metered TURN (Free Tier)
```javascript
{
  urls: 'turn:a.relay.metered.ca:80',
  username: '85d4ddb3c67e67ccea62858a',
  credential: 'GqYm5f5eN4zxD+U/',
},
{
  urls: 'turn:a.relay.metered.ca:443',
  username: '85d4ddb3c67e67ccea62858a',
  credential: 'GqYm5f5eN4zxD+U/',
}
```

### 2. Xirsys (Free Trial)
Sign up at https://xirsys.com/
```javascript
{
  urls: 'turn:your-server.xirsys.com:80?transport=udp',
  username: 'your-username',
  credential: 'your-password'
}
```

### 3. Self-Hosted Coturn
Deploy your own TURN server: https://github.com/coturn/coturn

## Next Steps After Fix

1. **Monitor Production**
   - Check logs for TURN usage percentage
   - Track connection success rate
   - Monitor video quality metrics

2. **Consider Paid TURN**
   - Free TURN servers have usage limits
   - For production, consider:
     - Twilio (paid tier)
     - Xirsys
     - AWS/GCP TURN instances

3. **Add Fallback Logic**
   - If TURN fails, show user-friendly error
   - Suggest network troubleshooting steps
   - Allow manual retry

## Support Resources

- **Twilio TURN docs**: https://www.twilio.com/docs/stun-turn
- **WebRTC debugging**: chrome://webrtc-internals (Chrome/Electron)
- **SimplePeer docs**: https://github.com/feross/simple-peer
- **Coturn setup**: https://github.com/coturn/coturn

## Timeline

- **Test TURN connectivity**: 5 minutes
- **Rebuild desktop app**: 2-5 minutes
- **Redeploy dashboard**: 2-5 minutes (dev) or 5-10 minutes (production)
- **End-to-end testing**: 10-15 minutes
- **Total**: 20-35 minutes

---

**Last Updated**: 2025-10-20
**Fixed By**: Claude (Debug Agent)
**Files Modified**: 2 (page.tsx, livestream-supabase.js)
**Test Script**: test-turn-connectivity.js
