# Work Invigilator Desktop

A professional desktop application for work monitoring, time tracking, audio recording, and screenshot capture.

## Features

- 🎤 **Audio Recording** - Continuous audio recording with automatic chunking
- 📸 **Screenshot Capture** - Periodic screenshot capture (every 30 seconds)
- ⏱️ **Time Tracking** - Session timer with punch in/out functionality
- ☕ **Break Management** - Track breaks with pause/resume functionality
- 🔐 **Secure Authentication** - Supabase-based authentication
- 💾 **Cloud Storage** - All recordings and screenshots stored securely in Supabase
- 🪟 **System Tray** - Minimize to system tray

## Installation

### Prerequisites

- Node.js 16 or higher
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm start
```

3. Build for production:
```bash
npm run build
```

The installer will be created in the `dist-electron` directory.

## Development

### Project Structure

```
work-invigilator-desktop/
├── main.js           # Electron main process
├── preload.js        # Preload script for secure IPC
├── renderer.js       # Main application logic
├── index.html        # Application UI
├── styles.css        # Styling
├── package.json      # Dependencies and build config
└── build/            # Build resources (icons)
```

### Scripts

- `npm start` - Run in development mode
- `npm run build` - Build for Windows (x64)
- `npm run build:all` - Build for all platforms (Windows, Mac, Linux)

## Building

### Windows

```bash
npm run build
```

Output: `dist-electron/Work Invigilator Setup 1.0.0.exe`

### Mac

```bash
npm run build:all
```

Output: `dist-electron/Work Invigilator-1.0.0.dmg`

### Linux

```bash
npm run build:all
```

Output: `dist-electron/Work Invigilator-1.0.0.AppImage`

## Configuration

The application uses Supabase for backend services. Configuration is stored in `main.js`:

```javascript
const SUPABASE_CONFIG = {
  url: 'YOUR_SUPABASE_URL',
  anon_key: 'YOUR_SUPABASE_ANON_KEY'
};
```

## Usage

1. **Login** - Enter your employee credentials
2. **Start Monitoring** - Click the main toggle button to punch in
3. **Take Breaks** - Use the break button to pause monitoring
4. **Stop Monitoring** - Click the toggle button again to punch out
5. **Admin Dashboard** - Admins can access the web dashboard

## Security

- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Preload script for secure IPC
- ✅ Content Security Policy configured
- ✅ Secure token storage

## License

MIT

## Support

For issues or questions, please contact your administrator.

