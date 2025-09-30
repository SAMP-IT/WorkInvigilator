// Supabase Browser Client for Chrome Extension
// Simplified version that works with CSP restrictions

class SupabaseClient {
  constructor(url, key, options = {}) {
    this.url = url;
    this.key = key;
    this.options = options;
    this.accessToken = null; // Store user's access token

    // Initialize auth
    this.auth = new SupabaseAuth(this);

    console.log('✅ Supabase browser client initialized');
  }

  // Method to set access token
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Get the authorization header (use access token if available, otherwise anon key)
  getAuthHeader() {
    return this.accessToken ? `Bearer ${this.accessToken}` : `Bearer ${this.key}`;
  }

  // Database operations
  from(table) {
    return new SupabaseQuery(this, table);
  }

  // Storage operations
  storage() {
    return new SupabaseStorage(this);
  }
}

class SupabaseAuth {
  constructor(client) {
    this.client = client;
  }

  async signInWithPassword({ email, password }) {
    try {
      const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.client.key,
          'Authorization': `Bearer ${this.client.key}`
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        return { data: null, error: data };
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async signOut() {
    try {
      const response = await fetch(`${this.client.url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          'apikey': this.client.key,
          'Authorization': `Bearer ${this.client.key}`
        }
      });

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  async getUser() {
    // Simplified - in real implementation, you'd check stored tokens
    return { data: { user: null }, error: null };
  }

  async getSession() {
    // Simplified - in real implementation, you'd check stored session
    return { data: { session: null }, error: null };
  }

  onAuthStateChange(callback) {
    // Simplified - in real implementation, you'd set up event listeners
    return { data: { subscription: { unsubscribe: () => {} } } };
  }
}

class SupabaseQuery {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.queryParams = {
      select: '*',
      filters: [],
      modifiers: []
    };
  }

  select(columns = '*') {
    this.queryParams.select = columns;
    return this;
  }

  eq(column, value) {
    this.queryParams.filters.push(`${column}=eq.${value}`);
    return this;
  }

  single() {
    this.queryParams.modifiers.push('single');
    return this;
  }

  async insert(data) {
    try {
      const response = await fetch(`${this.client.url}/rest/v1/${this.table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.client.key,
          'Authorization': this.client.getAuthHeader(),
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async execute() {
    try {
      let url = `${this.client.url}/rest/v1/${this.table}?select=${this.queryParams.select}`;

      if (this.queryParams.filters.length > 0) {
        url += '&' + this.queryParams.filters.join('&');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.client.key,
          'Authorization': this.client.getAuthHeader()
        }
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result };
      }

      // Handle single modifier
      if (this.queryParams.modifiers.includes('single')) {
        return { data: result[0] || null, error: null };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  // Alias for execute to match Supabase API
  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

class SupabaseStorage {
  constructor(client) {
    this.client = client;
  }

  from(bucket) {
    return new SupabaseStorageBucket(this.client, bucket);
  }
}

class SupabaseStorageBucket {
  constructor(client, bucket) {
    this.client = client;
    this.bucket = bucket;
  }

  async upload(path, file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.client.url}/storage/v1/object/${this.bucket}/${path}`, {
        method: 'POST',
        headers: {
          'apikey': this.client.key,
          'Authorization': this.client.getAuthHeader()
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        return { data: null, error: result };
      }

      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  getPublicUrl(path) {
    return {
      data: {
        publicUrl: `${this.client.url}/storage/v1/object/public/${this.bucket}/${path}`
      }
    };
  }
}

// Create the global supabase object to match the CDN version
window.supabase = {
  createClient: (url, key, options) => new SupabaseClient(url, key, options)
};

console.log('✅ Supabase browser client loaded');