# How to View Logs in Work Invigilator

## 📋 Method 1: Development Mode (Best for Debugging)

Run the app in development mode to see all logs in your terminal:

```bash
cd work-invigilator-desktop
npm start
```

All console logs will appear in the terminal window, including:
- ✅ Work Invigilator Desktop initialized
- 🔐 Login attempts
- 🎯 Session start/stop events
- 📸 Screenshot captures
- 💾 Database operations
- ❌ Errors and warnings

## 🔧 Method 2: DevTools Console (Production & Development)

### Option A: Keyboard Shortcut
Press **`Ctrl + Shift + I`** or **`F12`** to open Developer Tools

### Option B: Menu Bar
Go to **View → Toggle Developer Tools**

### What You'll See:
- **Console Tab**: All console.log() messages
- **Network Tab**: API calls to Supabase
- **Application Tab**: LocalStorage data
- **Sources Tab**: Debug JavaScript code

## 📊 Method 3: Windows Event Viewer (Production Crashes)

For production crashes, check Windows Event Viewer:
1. Press `Win + X` → Event Viewer
2. Navigate to: **Windows Logs → Application**
3. Look for errors from "Work Invigilator"

## 🔍 Method 4: Log Files (If Implemented)

Currently, the app logs to console only. To add file logging:
1. Install electron-log: `npm install electron-log`
2. Add to main.js: `const log = require('electron-log');`
3. Use: `log.info()`, `log.error()`, etc.

## 📝 Common Log Messages

### Login Success:
```
✅ Supabase initialized
✅ User session restored: email@example.com Role: user
✅ Side panel login successful
```

### Session Start:
```
🎯 Starting work session...
✅ Punched in - Session ID: 123
✅ Recording started successfully
✅ Work session started
```

### Session Stop:
```
🛑 Stopping work session...
💾 Saving audio chunk...
✅ Punched out - Duration: 3600s (60 min)
✅ Work session stopped successfully
```

### Errors:
```
❌ Failed to start session: [error message]
❌ Login failed: [error message]
❌ Screenshot capture failed: [error message]
```

## 🚀 Quick Start

**During development:**
```bash
npm start
# Watch terminal for logs
```

**In production app:**
1. Open the installed app
2. Press `F12` or `Ctrl+Shift+I`
3. Click on the **Console** tab
4. See all logs in real-time

## 💡 Tips

- Keep DevTools open while testing to catch errors immediately
- Use `Ctrl+L` in DevTools Console to clear logs
- Right-click in Console → "Save as..." to export logs
- Filter logs using the search box in DevTools
- Use Console filters: Errors, Warnings, Info, Verbose

