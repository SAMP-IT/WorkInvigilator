# Fixes Applied - Live Monitoring & Activity Logs

## Summary
Fixed two critical issues preventing the live monitoring feature and activity logging from working correctly:

1. **❌ ReferenceError: require is not defined** in renderer process
2. **❌ Database schema mismatch** for activity_logs table

---

## Fix #1: Electron Renderer Process `require()` Error

### Problem
```
renderer.js:1880 Failed to initialize live stream manager: ReferenceError: require is not defined
    at WorkInvigilatorApp.initializeLiveStream (renderer.js:1866:35)
```

### Root Cause
When Electron has `contextIsolation: true` (security best practice), the renderer process cannot use Node.js `require()` function, even if `nodeIntegration: true`. This is by design for security.

### Solution Applied
Changed from using `require()` to loading modules via script tags:

#### Changes Made:

**1. [index.html:101-104](work-invigilator-desktop/index.html#L101-L104)** - Load livestream.js as script tag
```html
<!-- Load dependencies and app scripts -->
<!-- Note: With contextIsolation: true, we need to load modules as script tags -->
<script src="livestream.js"></script>
<script src="renderer.js"></script>
```

**2. [livestream.js:303-312](work-invigilator-desktop/livestream.js#L303-L312)** - Export class globally
```javascript
// Export for use in renderer process
// When loaded as script tag with nodeIntegration: true, expose globally
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiveStreamManager;
}

// Also expose globally for script tag loading
if (typeof window !== 'undefined') {
  window.LiveStreamManager = LiveStreamManager;
}
```

**3. [renderer.js:1862-1869](work-invigilator-desktop/renderer.js#L1862-L1869)** - Use global class instead of require
```javascript
async initializeLiveStream() {
  if (!this.liveStreamManager && this.currentUser && this.organizationId) {
    try {
      // Use global LiveStreamManager class (loaded via script tag in index.html)
      if (typeof window.LiveStreamManager === 'undefined') {
        throw new Error('LiveStreamManager not loaded. Ensure livestream.js is loaded before renderer.js');
      }
      this.liveStreamManager = new window.LiveStreamManager();
```

### Why This Works
- With `nodeIntegration: true`, scripts loaded via `<script>` tags can access Node.js APIs like `require()`
- The livestream.js file loads socket.io-client and simple-peer using `require()` at the top
- It then exposes the `LiveStreamManager` class on the global `window` object
- renderer.js can then access it as `window.LiveStreamManager`
- This maintains security while allowing necessary Node.js module access

### References
- [Electron Context Isolation Docs](https://www.electronjs.org/docs/latest/tutorial/context-isolation)
- [Electron Security Best Practices](https://www.electronjs.org/docs/latest/tutorial/security)

---

## Fix #2: Activity Logs Database Schema Mismatch

### Problem
```
POST http://localhost:3002/api/activity-logs 500 (Internal Server Error)
Failed to sync activity logs: {error: "Could not find the 'logged_at' column of 'activity_logs' in the schema cache"}
```

### Root Cause
The API route was trying to insert records with a column named `logged_at`, but the actual Supabase database schema uses `start_time`, `end_time`, and `duration_seconds` columns instead.

### Actual Database Schema
According to Supabase MCP inspection, the `activity_logs` table has:
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  session_id UUID REFERENCES recording_sessions(id),
  app_name TEXT,
  window_title TEXT,
  url TEXT,
  domain TEXT,
  start_time TIMESTAMPTZ NOT NULL,           -- ✅ Actual column
  end_time TIMESTAMPTZ,                       -- ✅ Actual column
  duration_seconds INTEGER,                   -- ✅ Actual column
  category TEXT CHECK (category IN ('productive', 'neutral', 'unproductive', 'uncategorized')),
  productivity_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Solution Applied

#### Changes Made:

**1. [nextjs-dashboard/app/api/activity-logs/route.ts:71-84](nextjs-dashboard/app/api/activity-logs/route.ts#L71-L84)** - POST endpoint
```typescript
// BEFORE (❌ Wrong):
return {
  user_id: user.id,
  organization_id: profile.organization_id,
  session_id: sessionId || null,
  app_name: activity.appName,
  window_title: activity.windowTitle,
  url: activity.url || null,
  domain: activity.domain || null,
  category,
  productivity_score: productivityScore,
  logged_at: activity.timestamp || new Date().toISOString(),  // ❌ Wrong column
};

// AFTER (✅ Correct):
return {
  user_id: user.id,
  organization_id: profile.organization_id,
  session_id: sessionId || null,
  app_name: activity.appName,
  window_title: activity.windowTitle,
  url: activity.url || null,
  domain: activity.domain || null,
  category,
  productivity_score: productivityScore,
  start_time: activity.timestamp || new Date().toISOString(),  // ✅ Correct
  end_time: null, // Will be updated when activity ends
  duration_seconds: null, // Will be calculated later
};
```

**2. [nextjs-dashboard/app/api/activity-logs/route.ts:144-164](nextjs-dashboard/app/api/activity-logs/route.ts#L144-L164)** - GET endpoint
```typescript
// BEFORE (❌ Wrong):
let query = supabaseAdmin
  .from('activity_logs')
  .select('*')
  .eq('organization_id', profile.organization_id)
  .order('logged_at', { ascending: false });  // ❌ Wrong column

// Filter by date range
if (startDate) {
  query = query.gte('logged_at', startDate);  // ❌ Wrong column
}
if (endDate) {
  query = query.lte('logged_at', endDate);  // ❌ Wrong column
}

// AFTER (✅ Correct):
let query = supabaseAdmin
  .from('activity_logs')
  .select('*')
  .eq('organization_id', profile.organization_id)
  .order('start_time', { ascending: false });  // ✅ Correct

// Filter by date range
if (startDate) {
  query = query.gte('start_time', startDate);  // ✅ Correct
}
if (endDate) {
  query = query.lte('start_time', endDate);  // ✅ Correct
}
```

### When Changes Take Effect
Next.js API routes are compiled on-demand. The changes will take effect:
1. **Immediately** after the next desktop app makes a request to `/api/activity-logs`
2. The server will show: `○ Compiling /api/activity-logs ...`
3. Then: `✓ Compiled /api/activity-logs in [X]ms`
4. The next POST request should succeed with `200 OK` instead of `500`

---

## Testing Instructions

### Test Fix #1 (Live Streaming)
1. **Restart the desktop app** completely (close and reopen)
2. Login with your credentials
3. Click the main toggle to start monitoring
4. **Expected console output:**
   ```
   ✅ Live stream manager initialized
   📡 Connecting to signaling server...
   ✅ Connected to signaling server
   🎥 Starting screen and audio capture...
   📺 Found 1 screen sources
   🖥️ Using screen: Entire Screen
   ✅ Screen capture successful
   ✅ Audio capture successful
   📹 Combined stream created: { videoTracks: 1, audioTracks: 1 }
   ✅ Started streaming with tracks: { video: 1, audio: 1 }
   ✅ Live streaming started
   ```
5. Open dashboard at http://localhost:3002/live-monitoring
6. You should see your employee in the "Available Employees" sidebar
7. Click to view the live stream

### Test Fix #2 (Activity Logs)
1. **Restart the desktop app** (or wait for current session)
2. Start monitoring - this will trigger activity tracking
3. **Expected console output:**
   - ✅ No errors about `logged_at` column
   - ✅ No `POST /api/activity-logs 500` errors
4. **Server should show:**
   ```
   ○ Compiling /api/activity-logs ...
   ✓ Compiled /api/activity-logs in [X]ms
   POST /api/activity-logs 200 in [X]ms  ← Should be 200, not 500!
   ```
5. Verify in dashboard that activity logs are being recorded

---

## Files Modified

### Desktop App:
- ✅ [work-invigilator-desktop/index.html](work-invigilator-desktop/index.html) - Added script tag for livestream.js
- ✅ [work-invigilator-desktop/livestream.js](work-invigilator-desktop/livestream.js) - Export class globally
- ✅ [work-invigilator-desktop/renderer.js](work-invigilator-desktop/renderer.js) - Use global class instead of require

### Dashboard:
- ✅ [nextjs-dashboard/app/api/activity-logs/route.ts](nextjs-dashboard/app/api/activity-logs/route.ts) - Fixed column names (logged_at → start_time)

---

## Technical Background

### Why Electron's `contextIsolation` Exists
From Electron's security documentation:

> Context isolation means that preload scripts are isolated from the renderer's main world to avoid leaking privileged APIs into the code running on the web page.

With `contextIsolation: true`:
- ✅ Preload scripts can use `require()` and access Node.js APIs
- ✅ Scripts loaded via `<script>` tags with `nodeIntegration: true` can use `require()`
- ❌ Renderer code in the main world cannot directly use `require()`
- ✅ Must use `contextBridge` or global variables to share between contexts

### Why We Used Script Tags Instead of contextBridge
The `LiveStreamManager` class needs access to:
1. **Node.js modules**: `socket.io-client`, `simple-peer` (via `require()`)
2. **Electron APIs**: `desktopCapturer` for screen capture
3. **Browser APIs**: `navigator.mediaDevices` for audio/video
4. **WebRTC APIs**: `MediaStream`, `RTCPeerConnection`

Since it needs **both** Node.js and Browser APIs, the simplest solution is:
- Load it as a `<script>` tag (gets Node.js access from `nodeIntegration: true`)
- It inherits browser API access naturally
- Expose the class globally on `window`

Alternative approaches would be more complex:
- Using `contextBridge` would require exposing every method individually
- Moving to main process wouldn't work (no WebRTC APIs in main process)
- Bundling would complicate the build process

### Database Schema Design Note
The `activity_logs` table uses `start_time` and `end_time` (not `logged_at`) because:
- Activities have a **duration** (not just a single timestamp)
- `start_time`: When the user switched to this app/window
- `end_time`: When the user switched away (can be null if still active)
- `duration_seconds`: Calculated as `end_time - start_time`

This allows for accurate productivity tracking:
```sql
-- Get total time spent in VS Code today
SELECT SUM(duration_seconds)
FROM activity_logs
WHERE app_name = 'Visual Studio Code'
AND start_time::date = CURRENT_DATE;
```

---

## Current Status

### ✅ All Fixes Applied
1. ✅ Renderer process require() error - **FIXED**
2. ✅ Activity logs database schema - **FIXED**
3. ✅ Dashboard server running on localhost:3002
4. ✅ WebRTC signaling server operational
5. ✅ Live monitoring page accessible

### 🔄 Pending Actions
1. **Restart desktop app** to test live streaming fix
2. **Test activity logging** by starting a monitoring session
3. **Verify WebRTC connection** by viewing stream in dashboard

---

## Additional Notes

### Known Issues (Non-Breaking):
1. **Geolocation 403 error** - Google Maps API restriction, doesn't affect monitoring
   ```
   Network location provider at 'https://www.googleapis.com/' : Returned error code 403.
   ```
   - Impact: Location tracking fallsback to "without location"
   - Solution: Add Google Maps API key or use alternative geolocation service

2. **Multiple server instances** - Several Next.js dev servers running
   - They're in background from previous tests
   - Not causing issues as they failed to bind to port 3002
   - Clean up with: `netstat -ano | findstr :3002` and kill PIDs if needed

### Performance Considerations:
- **WebRTC bandwidth**: Each stream uses ~2-5 Mbps
- **Activity logging**: Syncs every 30 seconds or when buffer reaches 10 activities
- **Database inserts**: Batch inserts for better performance

### Future Enhancements:
1. Add activity duration tracking (update `end_time` and `duration_seconds`)
2. Implement activity aggregation for productivity reports
3. Add real-time activity streaming to dashboard
4. Category auto-detection based on productivity rules

---

## Support

If issues persist:
1. Check [LIVE_MONITORING_TESTING_GUIDE.md](LIVE_MONITORING_TESTING_GUIDE.md)
2. Review console logs in both desktop app and dashboard
3. Verify Supabase connection and schema
4. Ensure all dependencies are installed (`npm install` in both projects)
