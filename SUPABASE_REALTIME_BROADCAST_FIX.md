# Supabase Realtime Broadcast Fix - Implementation Complete

## Problem
Supabase Realtime broadcasts were not being received by the desktop app, even though presence updates were working correctly. This prevented WebRTC signaling messages (offers, answers, ICE candidates) from reaching the desktop app.

## Root Cause
Supabase Realtime Broadcast requires **Row Level Security (RLS) policies** on the `realtime.messages` table to authorize broadcast messages. Additionally, channels must be configured as **private channels** to enforce these policies.

## Solution Implemented

### 1. Created RLS Policies on `realtime.messages` Table

```sql
-- Allow authenticated users to receive broadcast messages
CREATE POLICY "Authenticated users can receive broadcasts"
ON "realtime"."messages"
FOR SELECT
TO authenticated
USING ( true );

-- Allow authenticated users to send broadcast messages
CREATE POLICY "Authenticated users can send broadcasts"
ON "realtime"."messages"
FOR INSERT
TO authenticated
WITH CHECK ( true );
```

### 2. Updated Dashboard Channel Configuration

**File**: `nextjs-dashboard/lib/supabase-realtime-signaling.ts` (lines 56-66)

Added `private: true` to channel configuration:

```typescript
this.channel = supabase.channel(channelName, {
  config: {
    broadcast: {
      self: false // Don't receive our own messages
    },
    presence: {
      key: this.presenceKey
    },
    private: true // Required for broadcast authorization with RLS policies
  }
});
```

### 3. Updated Desktop App Channel Configuration

**File**: `work-invigilator-desktop/livestream-supabase.js` (lines 24-30, 50-56)

**Changed initialize method to accept authenticated Supabase client:**

```javascript
async initialize(user, organizationId, supabaseClient) {
  this.currentUser = user;
  this.organizationId = organizationId;

  // Use the authenticated Supabase client (with JWT token) passed from renderer
  // This is required for private channels with RLS policies
  this.supabase = supabaseClient;
```

**Added `private: true` to channel configuration:**

```javascript
this.channel = this.supabase.channel(channelName, {
  config: {
    broadcast: { self: true },
    presence: { key: this.presenceKey },
    private: true // Required for broadcast authorization with RLS policies
  }
});
```

### 4. Updated Desktop App to Pass Authenticated Client

**File**: `work-invigilator-desktop/renderer.js` (lines 1848-1887)

**Created authenticated Supabase client with JWT token:**

```javascript
// Get Supabase config and create authenticated client for live streaming
const supabaseConfig = await window.electronAPI.getSupabaseConfig();
const { createClient } = require('@supabase/supabase-js');

// Get access token from storage
const tokenResult = await window.electronAPI.storeGet('accessToken');
const accessToken = tokenResult.success ? tokenResult.value : null;

if (!accessToken) {
  throw new Error('No access token available for Realtime authentication');
}

// Create authenticated Supabase client for Realtime (with JWT token)
// The Authorization header with JWT token is required for private channels
const supabaseRealtimeClient = createClient(
  supabaseConfig.url,
  supabaseConfig.anon_key,
  {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`  // JWT token for auth
      }
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

const result = await this.liveStreamManager.initialize(
  this.currentUser,
  this.organizationId,
  supabaseRealtimeClient  // Pass authenticated client
);
```

## What Changed

1. **RLS Policies**: Created SELECT and INSERT policies on `realtime.messages` table to allow authenticated users to send and receive broadcasts
2. **Private Channels**: Both dashboard and desktop app now use `private: true` in their channel configuration
3. **Authenticated Client**: Desktop app now creates an authenticated Supabase client with JWT token and passes it to LiveStreamManager
4. **Broadcast Authorization**: Supabase will now check RLS policies and JWT authentication before allowing broadcast messages through

## Next Steps - Testing

### 1. Restart Desktop App
- Completely close the work-invigilator-desktop app
- Restart it to ensure the new configuration is loaded
- Check the console for:
  - `✅ Connected to Supabase Realtime`
  - `✅ Registered as streamer`

### 2. Hard Refresh Dashboard
- Open the dashboard in your browser
- Navigate to the Live Monitoring page
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check the browser console for:
  - `📡 Channel subscription status: SUBSCRIBED`
  - `✅ Presence tracked`

### 3. Test WebRTC Connection
- On the dashboard, click on the employee to start viewing their stream
- Watch for these logs:

**Dashboard Console (Expected)**:
```
📤 Sending offer to: <presenceKey>
🧊 Sending ICE candidate to: <presenceKey>
📨 Received broadcast: (answer and ICE candidates)
✅ Connected to peer
```

**Desktop App Console (Expected)**:
```
📨 RAW BROADCAST RECEIVED: <offer message>
📥 Received offer from viewer: <presenceKey>
🤝 Creating peer connection for viewer
📤 Sending answer to viewer
🧊 Sending ICE candidate to viewer
✅ Connected to viewer
```

### 4. Verify Video Stream
- The video player on the dashboard should show the employee's screen
- You should see both screen and camera feeds (if camera is active)

## Troubleshooting

If broadcasts still don't work after these changes:

1. **Check Authentication**: Ensure both dashboard and desktop app are properly authenticated with valid JWT tokens
2. **Check RLS Policies**: Verify policies were created by running:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'messages' AND schemaname = 'realtime';
   ```
3. **Check Channel Logs**: Look for any authorization errors in the Supabase Realtime logs
4. **Verify Channel Name**: Ensure both apps are connecting to the same channel name (format: `live-monitoring:{organizationId}`)

## Key Files Modified

1. [nextjs-dashboard/lib/supabase-realtime-signaling.ts](nextjs-dashboard/lib/supabase-realtime-signaling.ts#L56-L66) - Added `private: true` to channel config
2. [work-invigilator-desktop/livestream-supabase.js](work-invigilator-desktop/livestream-supabase.js#L24-L30) - Changed to accept authenticated client
3. [work-invigilator-desktop/livestream-supabase.js](work-invigilator-desktop/livestream-supabase.js#L50-L56) - Added `private: true` to channel config
4. [work-invigilator-desktop/renderer.js](work-invigilator-desktop/renderer.js#L1848-L1877) - Create and pass authenticated Supabase client

## Documentation References

- [Supabase Realtime Broadcast Authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Private Channels Configuration](https://supabase.com/docs/guides/realtime/channels#private-channels)
