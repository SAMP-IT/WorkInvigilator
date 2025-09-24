// Background script for Work Invigilator Extension
// Handles Supabase operations using direct HTTP calls (no external libraries needed)

// Supabase configuration
let SUPABASE_URL = null;
let SUPABASE_ANON_KEY = null;

async function loadSupabaseConfig() {
  try {
    const configResponse = await fetch(chrome.runtime.getURL('supabase-config.js'));
    const configText = await configResponse.text();

    // Extract config using regex
    const urlMatch = configText.match(/url:\s*['"]([^'"]+)['"]/);
    const keyMatch = configText.match(/anonKey:\s*['"]([^'"]+)['"]/);

    if (urlMatch && keyMatch) {
      SUPABASE_URL = urlMatch[1];
      SUPABASE_ANON_KEY = keyMatch[1];
      console.log('Supabase config loaded in background script');
    } else {
      console.error('Could not extract Supabase config from file');
    }
  } catch (error) {
    console.error('Failed to load Supabase config:', error);
  }
}

// Initialize config on startup
loadSupabaseConfig();

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Audio Recorder Extension installed');

    // Clear any stale monitoring state on install
    chrome.storage.local.remove(['monitoringState']);

    // Enable side panel for all sites
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // Optional: Pre-request microphone permission on first install
    // This opens a welcome page where users can grant microphone access upfront
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html'),
      active: true
    });
  } else if (details.reason === 'update') {
    console.log('Audio Recorder Extension updated');

    // Enable side panel on update as well
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    // On update, we can keep monitoring state if it's recent
    // But clear very old state (more than 1 hour old)
    chrome.storage.local.get(['monitoringState'], (result) => {
      const state = result.monitoringState;
      if (state && state.timestamp) {
        const age = Date.now() - state.timestamp;
        const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

        if (age > oneHour) {
          // Clear stale monitoring state
          chrome.storage.local.remove(['monitoringState']);
          console.log('Cleared stale monitoring state on update');
        }
      }
    });
  }
});

// Handle extension icon click - opens side panel
chrome.action.onClicked.addListener(async (tab) => {
  console.log('Extension icon clicked, opening side panel for tab:', tab.title);

  // Open side panel for the current tab
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Clean up old recordings periodically (optional feature)
chrome.alarms.create('cleanup-old-recordings', { delayInMinutes: 60 * 24 }); // Daily cleanup

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup-old-recordings') {
    cleanupOldRecordings();
  }
});

function cleanupOldRecordings() {
  chrome.storage.local.get(['recordings'], (result) => {
    const recordings = result.recordings || [];
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Keep only recordings from the last week
    const recentRecordings = recordings.filter(recording =>
      recording.timestamp > oneWeekAgo
    );

    if (recentRecordings.length !== recordings.length) {
      chrome.storage.local.set({ recordings: recentRecordings });
      console.log(`Cleaned up ${recordings.length - recentRecordings.length} old recordings`);
    }
  });

  // Also cleanup old screenshots
  chrome.storage.local.get(['screenshots'], (result) => {
    const screenshots = result.screenshots || [];
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago

    // Keep only screenshots from the last week
    const recentScreenshots = screenshots.filter(screenshot =>
      screenshot.timestamp > oneWeekAgo
    );

    if (recentScreenshots.length !== screenshots.length) {
      chrome.storage.local.set({ screenshots: recentScreenshots });
      console.log(`Cleaned up ${screenshots.length - recentScreenshots.length} old screenshots`);
    }
  });
}

// Message handlers for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async responses
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {

      case 'login':
        const loginResult = await handleLogin(request.data);
        sendResponse(loginResult);
        break;

      case 'logout':
        const logoutResult = await handleLogout();
        sendResponse(logoutResult);
        break;

      case 'getProfile':
        const profileResult = await handleGetProfile(request.userId);
        sendResponse(profileResult);
        break;

      case 'uploadChunk':
        const uploadResult = await handleUploadChunk(request.data);
        sendResponse(uploadResult);
        break;

      case 'saveSession':
        const sessionResult = await handleSaveSession(request.data);
        sendResponse(sessionResult);
        break;

      case 'saveBreak':
        const breakResult = await handleSaveBreak(request.data);
        sendResponse(breakResult);
        break;

      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('Background message error:', error);
    sendResponse({ success: false, error: error.message });
  }
}


async function handleLogin(data) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Sign in user
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: data.email,
        password: data.password
      })
    });

    const authData = await loginResponse.json();

    if (!loginResponse.ok) {
      throw new Error(authData.msg || authData.error_description || 'Login failed');
    }

    // Get user profile
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${authData.user.id}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    const profiles = await profileResponse.json();
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    return {
      success: true,
      user: authData.user,
      profile: profile
    };

  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

async function handleLogout() {
  // Logout is handled client-side, just confirm success
  return { success: true };
}

async function handleGetProfile(userId) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // For getting profile, we need authentication token
    // This is a simplified version - in production you'd need to handle auth tokens
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });

    const profiles = await profileResponse.json();
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

    return { success: true, profile };

  } catch (error) {
    console.error('Get profile error:', error);
    return { success: false, error: error.message };
  }
}

async function handleUploadChunk(data) {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { filename, blobData, bucket } = data;

    // Convert base64 to blob if needed
    let blob;
    if (typeof blobData === 'string') {
      // Assume base64
      const response = await fetch(`data:audio/webm;base64,${blobData}`);
      blob = await response.blob();
    } else {
      blob = blobData;
    }

    const { data: uploadData, error } = await supabase.storage
      .from(bucket)
      .upload(filename, blob, {
        contentType: bucket === 'audio-recordings' ? 'audio/webm' : 'image/png',
        upsert: false
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filename);

    return { success: true, url: urlData.publicUrl };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSaveSession(data) {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { error } = await supabase
      .from('recording_sessions')
      .insert([data]);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleSaveBreak(data) {
  if (!supabase) return { success: false, error: 'Supabase not initialized' };

  try {
    const { error } = await supabase
      .from('break_sessions')
      .insert([data]);

    if (error) throw error;
    return { success: true };

  } catch (error) {
    return { success: false, error: error.message };
  }
}
