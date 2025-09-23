// Authentication Module
class AuthManager {
  constructor(mainApp) {
    this.mainApp = mainApp;
    this.supabaseUrl = null;
    this.supabaseKey = null;
  }

  async initializeSupabase() {
    try {
      const configUrl = chrome.runtime.getURL('supabase-config.js');
      console.log('Loading Supabase config from:', configUrl);

      const configResponse = await fetch(configUrl);
      if (!configResponse.ok) {
        throw new Error(`Failed to load config: ${configResponse.status}`);
      }

      const configText = await configResponse.text();
      console.log('Config file loaded successfully');

      const urlMatch = configText.match(/url:\s*['"]([^'"]+)['"]/);
      const keyMatch = configText.match(/anonKey:\s*['"]([^'"]+)['"]/);

      if (urlMatch && keyMatch) {
        this.supabaseUrl = urlMatch[1];
        this.supabaseKey = keyMatch[1];
        console.log('Supabase config loaded successfully');
      } else {
        console.error('Could not extract Supabase config');
        throw new Error('Invalid config file format');
      }
    } catch (error) {
      console.error('Failed to load Supabase config:', error);
      // Fallback configuration
      this.supabaseUrl = 'https://qqnmilkgltcooqzytkxy.supabase.co';
      this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbm1pbGtnbHRjb29xenl0a3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDYzODcsImV4cCI6MjA3NDE4MjM4N30.Et5msR4pTjO1jZdQ35pUeWYdXAdCbM8mjqSrzzaLAEs';
      console.log('Using fallback Supabase configuration');
    }
  }

  async checkAuthState() {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedRole = localStorage.getItem('userRole');

      if (storedUser && storedRole) {
        this.mainApp.currentUser = JSON.parse(storedUser);
        this.mainApp.userRole = storedRole;

        console.log('🔄 Restored from localStorage:');
        console.log('👤 User:', this.mainApp.currentUser.email);
        console.log('👑 Temp role:', this.mainApp.userRole);

        await this.loadUserProfile();

        console.log('🔄 Final role after profile load:', this.mainApp.userRole);

        this.mainApp.ui.showAuthenticatedUI();
        return;
      }
    } catch (error) {
      console.warn('Could not restore auth state:', error);
    }

    this.mainApp.ui.showUnauthenticatedUI();
  }

  async loadUserProfile() {
    if (!this.supabaseUrl || !this.supabaseKey || !this.mainApp.currentUser) {
      console.log('⚠️ Cannot load profile: missing config or user');
      this.mainApp.userRole = 'user';
      this.mainApp.ui.updateUserDisplay();
      return;
    }

    try {
      console.log('🔍 Loading user profile for:', this.mainApp.currentUser.id);

      const profileResponse = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${this.mainApp.currentUser.id}&select=role`, {
        method: 'GET',
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (profileResponse.ok) {
        const profiles = await profileResponse.json();
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        this.mainApp.userRole = profile?.role || 'user';
        console.log('✅ Profile loaded, role:', this.mainApp.userRole);

        // Check if this is the first user and no admin exists yet
        if (this.mainApp.userRole === 'user') {
          try {
            // Check if any admin exists
            const adminCheckResponse = await fetch(`${this.supabaseUrl}/rest/v1/profiles?role=eq.admin&select=id`, {
              method: 'GET',
              headers: {
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`,
                'Content-Type': 'application/json'
              }
            });

            if (adminCheckResponse.ok) {
              const adminProfiles = await adminCheckResponse.json();
              if (!adminProfiles || adminProfiles.length === 0) {
                // No admin exists, promote this user to admin
                console.log('👑 No admin found, promoting first user to admin role');
                const updateResponse = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${this.mainApp.currentUser.id}`, {
                  method: 'PATCH',
                  headers: {
                    'apikey': this.supabaseKey,
                    'Authorization': `Bearer ${this.supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                  },
                  body: JSON.stringify({ role: 'admin' })
                });

                if (updateResponse.ok) {
                  this.mainApp.userRole = 'admin';
                  console.log('✅ Successfully promoted to admin role');
                }
              }
            }
          } catch (error) {
            console.warn('Failed to check/promote admin role:', error);
          }
        }
      } else {
        console.log('⚠️ Profile not found, using default role: user');
        this.mainApp.userRole = 'user';
      }

      this.mainApp.ui.updateUserDisplay();

    } catch (error) {
      console.error('❌ Failed to load user profile:', error);
      this.mainApp.userRole = 'user';
      this.mainApp.ui.updateUserDisplay();
    }
  }

  async handleLogin(e) {
    e.preventDefault();

    const email = this.mainApp.loginForm.querySelector('input[type="email"]').value;
    const password = this.mainApp.loginForm.querySelector('input[type="password"]').value;

    if (!email || !password) {
      this.mainApp.ui.showAuthMessage('Please fill in all fields', 'error');
      return;
    }

    try {
      this.mainApp.ui.showAuthMessage('Signing in...', 'info');

      if (!this.supabaseUrl || !this.supabaseKey) {
        throw new Error('Supabase not configured properly');
      }

      const loginResponse = await fetch(`${this.supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': this.supabaseKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const authData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(authData.msg || authData.error_description || 'Login failed');
      }

      if (authData.user) {
        const profileResponse = await fetch(`${this.supabaseUrl}/rest/v1/profiles?id=eq.${authData.user.id}&select=*`, {
          method: 'GET',
          headers: {
            'apikey': this.supabaseKey,
            'Authorization': `Bearer ${authData.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        const profiles = await profileResponse.json();
        const profile = profiles && profiles.length > 0 ? profiles[0] : null;

        this.mainApp.currentUser = authData.user;
        this.mainApp.userRole = profile ? profile.role : 'user';

        console.log('✅ Login successful!');
        console.log('👤 User:', authData.user.email);
        console.log('👑 Role from profile:', profile?.role);
        console.log('🎯 Final userRole:', this.mainApp.userRole);

        localStorage.setItem('currentUser', JSON.stringify(authData.user));
        localStorage.setItem('userRole', this.mainApp.userRole);
        localStorage.setItem('accessToken', authData.access_token);
        localStorage.setItem('authSession', JSON.stringify(authData));

        this.mainApp.ui.showAuthenticatedUI();
        this.mainApp.ui.updateUserDisplay();
        this.mainApp.ui.showAuthMessage('Successfully signed in!', 'success');
      }

    } catch (error) {
      console.error('Login error:', error);
      let message = 'Login failed';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Invalid email or password';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Please check your email and confirm your account';
      }
      this.mainApp.ui.showAuthMessage(message, 'error');
    }
  }


  async handleLogout() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'logout' });

      localStorage.removeItem('currentUser');
      localStorage.removeItem('userRole');

      this.mainApp.currentUser = null;
      this.mainApp.userRole = null;
      this.mainApp.ui.showUnauthenticatedUI();

    } catch (error) {
      console.error('Logout failed:', error);
      localStorage.removeItem('currentUser');
      localStorage.removeItem('userRole');
      this.mainApp.currentUser = null;
      this.mainApp.userRole = null;
      this.mainApp.ui.showUnauthenticatedUI();
    }
  }
}
