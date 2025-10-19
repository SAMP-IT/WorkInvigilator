# 🔧 Testing Fix Applied

## Issue Encountered

When testing the Supabase Realtime migration, you encountered this error:

```
InvalidStateError: Failed to execute 'setRemoteDescription' on 'RTCPeerConnection':
Failed to set remote answer sdp: Called in wrong state: stable
```

## Root Cause

**The same user account was logged in to both the desktop app and the dashboard.**

Looking at the logs, the user ID `9403702c-071d-4976-8298-2c55447a8549` was used for:
- **Desktop app** (streamer/employee)
- **Dashboard** (viewer/admin)

This caused the signaling messages to loop back to the same user, creating a WebRTC conflict.

---

## Fix Applied ✅

Added self-message filtering to prevent users from receiving their own signaling messages:

### 1. Dashboard Library ([lib/supabase-realtime-signaling.ts](nextjs-dashboard/lib/supabase-realtime-signaling.ts:184-187))
```typescript
private handleSignalingMessage(message: SignalingMessage) {
  // Ignore messages from ourselves
  if (message.from === this.userId) {
    return;
  }

  // Ignore messages not meant for us
  if (message.to && message.to !== this.userId) {
    return;
  }
  // ... rest of code
}
```

### 2. Desktop App ([livestream-supabase.js](work-invigilator-desktop/livestream-supabase.js:102-105))
```javascript
handleSignalingMessage(message) {
  // Ignore messages from ourselves
  if (message.from === this.currentUser.id) {
    return;
  }

  // Ignore messages not meant for us
  if (message.to && message.to !== this.currentUser.id) {
    return;
  }
  // ... rest of code
}
```

---

## ⚠️ Important: Testing Requirements

For live monitoring to work correctly, you **MUST** use **different user accounts**:

### Correct Testing Setup:

1. **Desktop App (Employee Side)**:
   - Login with an **employee** account
   - Example: `employee@kdmarketing.org`
   - Role: `user` (not admin)

2. **Dashboard (Admin Side)**:
   - Login with an **admin** account
   - Example: `admin@kdmarketing.org` or your admin account
   - Role: `admin`

### Why This Matters:

- **Streamer** = Employee desktop app broadcasting screen/audio/camera
- **Viewer** = Admin dashboard watching the stream
- **They must be different users** to establish a WebRTC peer connection

---

## 🧪 How to Test Properly

### Step 1: Create Test Accounts (If Needed)

If you don't have separate employee/admin accounts, create them:

**Admin Account** (use existing or create new):
```sql
-- You likely already have this
SELECT id, email, role FROM profiles WHERE role = 'admin';
```

**Employee Test Account** (create if needed):
```sql
-- Insert employee account
INSERT INTO profiles (id, email, name, role, organization_id)
VALUES (
  gen_random_uuid(),
  'test-employee@kdmarketing.org',
  'Test Employee',
  'user',
  'your-org-id'
);
```

### Step 2: Test the Connection

**A. Start Desktop App (Employee)**:
```bash
cd work-invigilator-desktop
npm start
```
- Login with **employee credentials**
- Start work session (monitoring will auto-start)
- Console should show: ✅ Connected to Supabase Realtime

**B. Open Dashboard (Admin)**:
```
http://localhost:3002/live-monitoring-supabase
```
- Login with **admin credentials** (different from desktop app)
- Employee should appear in "Available Employees" sidebar
- Click employee name to start watching

**C. Expected Console Logs**:

**Dashboard Console**:
```
📡 Connecting to Supabase Realtime channel: live-monitoring:org_xxx
✅ Connected to Supabase Realtime
📋 Received streamers list: [{ userId: "employee-id", ... }]
🔗 Creating new peer connection for: employee-id
📤 Sending offer to: employee-id
📥 Received answer from streamer: employee-id
📺 Received stream from: employee-id
✅ Video playing for: employee-id
```

**Desktop App Console**:
```
✅ Connected to Supabase Realtime
✅ Registered as streamer
📥 Received offer from viewer: admin-id
🤝 Creating peer connection for viewer: admin-id
📤 Sending answer to viewer: admin-id
✅ Connected to viewer: admin-id
```

**D. You Should See**:
- ✅ Live video stream in dashboard
- ✅ Live audio (toggle mute/unmute button)
- ✅ Camera overlay (if employee has webcam)
- ✅ All controls working (mute, camera toggle, stop stream)

---

## ❌ Common Mistakes

### Mistake 1: Using Same Account
```
Desktop App: admin@kdmarketing.org
Dashboard: admin@kdmarketing.org  ❌ WRONG
```

**Result**: Self-signaling loop, WebRTC error

**Fix**: Use different accounts
```
Desktop App: employee@kdmarketing.org
Dashboard: admin@kdmarketing.org  ✅ CORRECT
```

### Mistake 2: Not Starting Work Session
- Desktop app must have **work session active**
- Live streaming starts automatically when session starts
- If session not started, employee won't appear in dashboard

### Mistake 3: Firewall/Network Issues
- WebRTC requires STUN servers to be reachable
- Check if firewall is blocking WebRTC connections
- Try from same network first before testing remotely

---

## ✅ Next Steps

1. **Close desktop app** (if running)
2. **Close dashboard tab** (if open)
3. **Restart desktop app** with **employee credentials**
4. **Open dashboard** in browser with **admin credentials**
5. **Start work session** in desktop app
6. **Click employee name** in dashboard to start watching
7. **Verify video/audio streams work**

---

## 🐛 Still Having Issues?

If you still get errors after using different accounts:

### Check 1: Verify Users Are Different
**Dashboard console**:
```javascript
// Check your user ID
console.log('My user ID:', user?.id)
```

**Desktop app console**:
```javascript
// Check employee user ID
console.log('My user ID:', this.currentUser.id)
```

**They should be DIFFERENT!**

### Check 2: Clear Browser Cache
- Browser may cache old code
- Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
- Or open in incognito/private mode

### Check 3: Restart Both Apps
```bash
# Kill desktop app
# Kill all Node.js processes on port 3002
taskkill /F /IM node.exe

# Restart dashboard
cd nextjs-dashboard
npm run dev

# Restart desktop app
cd work-invigilator-desktop
npm start
```

---

## 📊 Summary

✅ **Fix Applied**: Self-message filtering added to both dashboard and desktop app
✅ **Testing Requirement**: Use **different user accounts** (employee + admin)
✅ **Expected Behavior**: Clean WebRTC connection without state errors
✅ **Next Step**: Restart apps with different accounts and test again

The fix is complete and ready to test! 🎉
