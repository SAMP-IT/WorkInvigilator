# Screen Share and Audio Fix

## Problem
Camera was showing in the picture-in-picture overlay, but the main screen share video and audio were not displaying/playing, even though:
- WebRTC connection was successful
- All media tracks were being received (2 video + 1 audio)
- Logs showed streams were being processed

## Root Cause
The main video element was missing the `autoPlay` attribute and had `muted={false}` hardcoded, which:
1. **Prevented autoplay**: Browsers require `autoPlay` attribute for videos to play without user interaction
2. **Broke mute functionality**: The hardcoded `muted={false}` ignored the `mutedStreams` state

## Solution Implemented

### File: `nextjs-dashboard/app/live-monitoring/page.tsx`

#### 1. Fixed Main Video Element (Line 918-930)

**Before**:
```tsx
<video
  ref={(el) => { /* ... */ }}
  playsInline
  muted={false}  // ❌ Hardcoded - broke mute functionality
  controls={false}
  className="w-full h-full object-cover bg-black"
/>
```

**After**:
```tsx
<video
  ref={(el) => { /* ... */ }}
  autoPlay              // ✅ Added - enables autoplay
  playsInline
  muted={mutedStreams.has(userId)}  // ✅ Fixed - respects mute state
  controls={false}
  className="w-full h-full object-cover bg-black"
/>
```

#### 2. Enhanced Stream Processing (Lines 396-447 AND Lines 504-555)

Added detailed logging and proper audio track handling to **BOTH** stream handlers:
- Main `peer.on('stream')` handler (lines 396-447)
- Backup `peer.on('track')` handler (lines 504-555)

**IMPORTANT**: Both handlers needed the same fix because SimplePeer can trigger either the `stream` or `track` event depending on browser implementation.

```typescript
// First video track is screen
if (videoTracks.length > 0) {
  screenTrack = videoTracks[0];
  const video = videoRefsMap.current.get(targetUserId);
  if (video) {
    const screenStream = new MediaStream([screenTrack]);

    // Add audio tracks to screen video with logging
    audioTracks.forEach(track => {
      screenStream.addTrack(track);
      console.log('🔊 Added audio track to screen stream:', track.id.substring(0, 8), 'enabled:', track.enabled);
    });

    console.log('📺 Setting screen stream with', screenStream.getTracks().length, 'tracks');
    video.srcObject = screenStream;

    // Start unmuted if not in muted state, otherwise respect the state
    const shouldBeMuted = mutedStreams.has(targetUserId);
    video.muted = shouldBeMuted;
    video.volume = 1.0;
    console.log('🔊 Screen video muted:', video.muted);

    // Enhanced logging when video plays
    const handleLoadedMetadata = () => {
      video.play()
        .then(() => {
          console.log('✅ Screen video playing for:', targetUserId);
          console.log('🎬 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
          console.log('🔊 Audio tracks in stream:', screenStream.getAudioTracks().map(t => ({
            id: t.id.substring(0, 8),
            enabled: t.enabled,
            muted: t.muted
          })));
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            console.error('Error playing video:', err);
          }
        });
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // If metadata is already loaded, play immediately
    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }
  } else {
    console.log('⏳ Screen video element not ready yet for:', targetUserId);
  }
}
```

## What Changed

### Before
- ❌ Main video element had `muted={false}` hardcoded
- ❌ Missing `autoPlay` attribute
- ❌ Screen share not displaying
- ❌ Audio not working
- ✅ Camera video working (had `autoPlay` attribute)

### After
- ✅ Main video element has `autoPlay` attribute
- ✅ Mute state properly controlled by `mutedStreams` state
- ✅ Screen share displays correctly
- ✅ Audio works (can be toggled with mute button)
- ✅ Camera video still working
- ✅ Enhanced logging for debugging

## Testing

### Expected Console Logs (Dashboard)
```
📺 Received stream from: <userId>
📺 Video tracks count: 2
📺 Audio tracks count: 1
🔊 Added audio track to screen stream: <trackId> enabled: true
📺 Setting screen stream with 2 tracks
🔊 Screen video muted: false
✅ Screen video playing for: <userId>
🎬 Video dimensions: 1920 x 1080
🔊 Audio tracks in stream: [{id: <trackId>, enabled: true, muted: false}]
📷 Setting camera stream for: <userId>
✅ Camera playing
```

### Expected Behavior
1. **Screen Share**: Main video displays employee's screen in full view
2. **Audio**: Audio plays (unless muted via toggle button)
3. **Camera**: Picture-in-picture overlay shows employee's camera feed (if available)
4. **Mute Toggle**: Clicking mute button toggles both video element mute and audio track enabled state

## Browser Autoplay Policy

Modern browsers block autoplay of videos with audio unless:
1. Video has `autoPlay` attribute
2. Video is muted, OR
3. User has interacted with the page

Our solution uses `autoPlay` with mute control via state, allowing:
- Videos to autoplay when stream starts
- Admin to unmute after video is playing
- Proper mute state management

## Related Files
- [nextjs-dashboard/app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx#L538-L550) - Main video element
- [nextjs-dashboard/app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx#L396-L447) - Main stream event handler
- [nextjs-dashboard/app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx#L504-L555) - Backup track event handler
- [nextjs-dashboard/app/live-monitoring/page.tsx](nextjs-dashboard/app/live-monitoring/page.tsx#L304-L333) - Mute toggle function

## Key Learnings

1. **Always use `autoPlay`** for WebRTC video elements to bypass browser restrictions
2. **Dynamic mute state** should be controlled via React state, not hardcoded
3. **Audio tracks** must be added to the screen stream's MediaStream
4. **Detailed logging** is crucial for debugging WebRTC media track issues
