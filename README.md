# 🎙️📸 Work Invigilator Chrome Extension

A comprehensive Chrome extension with user authentication that records audio from your laptop microphone and captures screenshots automatically, perfect for work monitoring and productivity tracking with role-based access control.

## Features

### 🎤 Audio Recording

- 🎤 Record audio from your laptop microphone
- ⏱️ Real-time recording timer
- 💾 Save recordings locally in your browser
- ▶️ Play back recordings directly in the extension
- 📥 Download recordings as WebM files
- 🗑️ Delete unwanted recordings

### 📸 Screenshot Capture

- 📷 Capture screenshots of your active tab every minute
- 🔄 Automatic interval-based capturing
- 👁️ View screenshots in new tabs
- 💾 Download screenshots as PNG files
- 🗑️ Delete unwanted screenshots
- ⏰ Keeps last 20 screenshots (auto-cleanup after 7 days)

### 🔐 Authentication & User Management

- 🔐 Supabase-powered authentication
- 👥 Role-based access control (User/Admin)
- 📧 Email verification and password reset
- 👤 User profile management
- 🚪 Secure logout functionality

### 🎨 User Experience

- 🎨 Beautiful gradient UI with animated waveform
- 📱 Responsive design
- ⚡ Real-time permission status display
- 🛡️ Comprehensive error handling and user guidance
- 🚀 Welcome page for smooth first-time setup

## Installation

### Step 1: Prepare the Extension

1. **Create Icons** (Required):
   - Create three PNG files in the `icons/` folder:
     - `icon16.png` (16x16 pixels)
     - `icon48.png` (48x48 pixels)
     - `icon128.png` (128x128 pixels)
   - Use a microphone icon design. See `icons/README.md` for details.

### Step 2: Load in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder containing this extension
5. The extension should now appear in your toolbar

## Usage

### 🔐 Authentication First

1. **Click the extension icon** to open the popup
2. **Sign Up** for a new account or **Login** if you already have one
3. **Select your role** during signup (User or Admin)
4. **Confirm your email** (check your inbox)
5. **Login** with your credentials

### 🚀 One-Click Monitoring

1. **Click the extension icon** in your Chrome toolbar
2. **Tap the big red "Work Vigilator OFF" button** to start monitoring
3. **Grant microphone permission** when prompted (first-time only)
4. **Both audio recording AND screenshot capture start automatically**
5. **Tap "Work Vigilator ON"** to stop all monitoring

### ☕ Break Management

- **"Take Break" button** appears when monitoring is active
- **Tap to pause** both audio and screenshot recording
- **Button turns gray** and shows "On Break - Tap to Resume"
- **Tap again to resume** monitoring from where you left off
- **Break time is tracked** and displayed in status messages

### 👥 User Roles & Permissions

- **USER Role**: Full access to monitoring features

  - Audio recording and screenshot capture
  - Break/pause functionality
  - File management and downloads

- **ADMIN Role**: All user permissions plus
  - User management capabilities (future feature)
  - Advanced reporting (future feature)
  - System configuration (future feature)

### 📊 Real-Time Status

When monitoring is active, you'll see:

- **🟢 Green toggle button** - Monitoring active
- **Session timer** - How long monitoring has been running
- **Audio status** - Recording status with elapsed time
- **Screenshot status** - Capture frequency and status
- **Break button** - Gray when paused, orange when active
- **Role indicator** - Shows your current role (USER/ADMIN)

### 🔧 Quick Actions (When Monitoring)

- **"Quick Capture"** - Take an instant screenshot anytime
- **"Play Last Recording"** - Listen to your most recent audio recording

### 📋 Managing Files

- **Audio recordings** are saved as WebM files
- **Screenshots** are saved as PNG files
- **Both are stored locally** in your browser
- **Auto-cleanup** removes files older than 7 days
- **Manual deletion** available for individual files

### 🔄 Session Persistence

- **UI State**: Toggle button remembers monitoring status when reopening popup
- **Break State**: Break/pause status is preserved across popup sessions
- **Background Processes**: Audio recording and screenshots continue in background
- **Browser Restart**: Background processes stop on browser/extension restart
- **Recovery**: UI automatically shows correct monitoring and break state when popup reopens

## Permissions

The extension requires the following permissions:

- `microphone`: Runtime permission for audio recording
- `storage`: To save recordings and screenshots locally in your browser
- `activeTab`: To capture screenshots of the currently active tab
- `tabs`: To manage tab operations for screenshots
- `alarms`: For automatic cleanup of old files

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension standards)
- **Audio Format**: WebM with Opus codec (high quality)
- **Screenshot Format**: PNG (compressed for storage efficiency)
- **Storage**: Chrome local storage (all data stays on your device)
- **Limits**: Last 10 audio recordings + 20 screenshots
- **Auto-cleanup**: Removes files older than 7 days
- **Screenshot Interval**: 5 seconds (for testing - change to 60 seconds for production)
- **Screenshot Quality**: 80% compression for optimal storage

## Files Structure

```
├── manifest.json          # Extension configuration
├── popup.html            # Main UI interface with auth
├── popup.css             # Styling for popup and auth forms
├── popup.js              # Main logic: auth, recording, screenshots
├── background.js         # Extension lifecycle and cleanup
├── welcome.html          # First-time setup welcome page
├── welcome.js            # Welcome page permission handling
├── supabase-config.js    # Supabase configuration and setup
├── SUPABASE_SETUP.md     # Detailed Supabase setup guide
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── test.html             # Development testing page
└── README.md             # This documentation
```

## Browser Compatibility

- Chrome 88+ (required for MediaRecorder API and tab capture)
- Edge 88+
- Other Chromium-based browsers

## Screenshot Limitations

- **Active Tab Only**: Screenshots capture the currently active Chrome tab
- **Visible Area**: Only captures the visible portion of the tab
- **No Full Screen**: Cannot capture entire monitor across multiple applications
- **Tab-Specific**: Each screenshot is limited to one tab's content

## Privacy & Security

- **100% Local**: All recordings and screenshots stay on your device
- **No Data Collection**: Nothing is sent to external servers
- **Browser Storage**: Uses Chrome's secure local storage
- **Permission-Based**: Microphone and tab access require explicit user consent
- **Auto-Cleanup**: Old files are automatically removed after 7 days
- **Manual Control**: Users can delete any recording or screenshot anytime

## Troubleshooting

### Microphone Not Working

1. Check if Chrome has microphone permission
2. Try refreshing the extension
3. Check if another application is using the microphone

### Extension Not Loading

1. Ensure all required icon files exist
2. Check the console for errors: `chrome://extensions/` → enable "Developer mode" → click "background page" under your extension

### Recordings Not Saving

1. Check browser storage space
2. Clear browser data if storage is full

### Screenshots Not Working

1. Ensure you're on a regular web page (not chrome:// pages)
2. Check that the active tab has content to capture
3. Screenshots only capture the visible area of the active tab
4. Cannot capture across multiple applications or full desktop

### Screenshot Quality Issues

1. Screenshots are compressed to 80% quality for storage efficiency
2. Only the visible portion of the active tab is captured
3. Browser zoom level may affect screenshot quality

## 🔒 Security & Environment Setup

### Important Security Notes

- **Never expose service role keys** in client-side code
- Only the **anon/public key** is safe to include in your extension
- Admin operations use **Row Level Security (RLS)** policies
- For production deployments, use **environment variables**

### Environment Variables

For production deployments, create environment variables:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

See `ENVIRONMENT_SETUP.md` for detailed security guidelines.

## Development

To modify the extension:

1. Make changes to the files
2. Go to `chrome://extensions/`
3. Click the refresh button on your extension
4. Test the changes

## License

This project is open source. Feel free to modify and distribute.

## Contributing

Feel free to submit issues and pull requests for improvements!
