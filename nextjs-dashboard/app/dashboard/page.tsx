'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Profile, Recording, Screenshot, Session } from '@/lib/supabase'

interface DashboardStats {
  totalUsers: number
  activeUsers: number
  totalRecordings: number
  totalScreenshots: number
  totalSessions: number
  activeSessions: number
}

export default function DashboardPage() {
  const { user, profile, loading, signOut, isAdmin } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRecordings: 0,
    totalScreenshots: 0,
    totalSessions: 0,
    activeSessions: 0
  })
  const [users, setUsers] = useState<Profile[]>([])
  const [recentRecordings, setRecentRecordings] = useState<Recording[]>([])
  const [recentScreenshots, setRecentScreenshots] = useState<Screenshot[]>([])
  const [userEmailMap, setUserEmailMap] = useState<{ [key: string]: string }>({})
  const [loadingStats, setLoadingStats] = useState(true)
  const [showAddUserForm, setShowAddUserForm] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [addingUser, setAddingUser] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    } else if (!loading && user && !isAdmin) {
      // Non-admin users should be redirected or shown a different interface
      router.push('/login')
    } else if (!loading && user && isAdmin) {
      loadDashboardData()
    }
  }, [user, loading, isAdmin, router])

  async function loadDashboardData() {
    try {
      setLoadingStats(true)

      // Load users
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      // Load recent recordings (without profile join since no direct FK relationship)
      const { data: recordingsData } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      // Load recent screenshots
      const { data: screenshotsData } = await supabase
        .from('screenshots')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      // Create user email mapping for recordings and screenshots
      const recordingUserIds = recordingsData?.map(r => r.user_id) || []
      const screenshotUserIds = screenshotsData?.map(s => s.user_id) || []
      const allUserIds = [...new Set([...recordingUserIds, ...screenshotUserIds])]
      const userEmailMap: { [key: string]: string } = {}

      if (allUserIds.length > 0) {
        const { data: userProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', allUserIds)

        userProfiles?.forEach(profile => {
          userEmailMap[profile.id] = profile.email
        })
      }

      // Load screenshots count
      const { count: screenshotsCount } = await supabase
        .from('screenshots')
        .select('*', { count: 'exact', head: true })

      // Load recording sessions (table name is recording_sessions, not sessions)
      const { data: sessionsData } = await supabase
        .from('recording_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      // Calculate stats
      const totalUsers = usersData?.length || 0
      const activeUsers = usersData?.filter(u => u.role === 'user').length || 0
      const totalRecordings = recordingsData?.length || 0
      const totalScreenshots = screenshotsCount || 0
      const totalSessions = sessionsData?.length || 0
      // For recording_sessions, we don't have a simple 'active' status field
      // We'll consider sessions active if they don't have an session_end_time
      const activeSessions = sessionsData?.filter(s => !s.session_end_time).length || 0

      setStats({
        totalUsers,
        activeUsers,
        totalRecordings,
        totalScreenshots,
        totalSessions,
        activeSessions
      })

      setUsers(usersData || [])
      setRecentRecordings(recordingsData || [])
      setRecentScreenshots(screenshotsData || [])
      setUserEmailMap(userEmailMap)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()

    if (!newUserEmail || !newUserPassword) {
      alert('Please fill in both email and password')
      return
    }

    if (newUserPassword.length < 6) {
      alert('Password must be at least 6 characters long')
      return
    }

    setAddingUser(true)

    try {
      // Call our API route to create the user
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newUserEmail,
          password: newUserPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user')
      }

      // Success! Refresh the dashboard data
      await loadDashboardData()

      // Reset form
      setNewUserEmail('')
      setNewUserPassword('')
      setShowAddUserForm(false)

      alert(`✅ Employee account created successfully!\n\nEmail: ${newUserEmail}\n\nShare these credentials with your employee so they can log in to the extension.`)

    } catch (error: any) {
      console.error('Error creating user:', error)
      alert(`❌ Failed to create user: ${error.message}`)
    } finally {
      setAddingUser(false)
    }
  }

  async function handleDeleteUser(userId: string, userEmail: string) {
    if (!confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone.`)) {
      return
    }

    alert(`To delete employee account for ${userEmail}:

1. Go to your Supabase Dashboard
2. Navigate to Authentication > Users
3. Find user: ${userEmail}
4. Click the three dots (⋯) next to their name
5. Click "Delete user"
6. Confirm deletion

Note: This will also delete all their monitoring data (recordings, screenshots, sessions).`)
  }

  if (loading || loadingStats) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !isAdmin) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🛡️ Work Vigilator
              </h1>
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                Admin Panel
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {profile?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">👥</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">🟢</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">🎤</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Recordings</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalRecordings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">📸</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Screenshots</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalScreenshots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">⏱️</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-teal-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm">👤</span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Employees</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add User Section */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Employee Management</h3>
              <button
                onClick={() => setShowAddUserForm(!showAddUserForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {showAddUserForm ? 'Cancel' : '+ Add Employee'}
              </button>
            </div>
          </div>

          {showAddUserForm && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="userEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <input
                      id="userEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="employee@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="userPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <input
                      id="userPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Minimum 6 characters"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddUserForm(false)
                      setNewUserEmail('')
                      setNewUserPassword('')
                    }}
                    className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addingUser}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingUser ? 'Creating...' : 'Create Employee Account'}
                  </button>
                </div>
              </form>
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>Instructions:</strong> Create employee accounts here. Share the email/password with your employees so they can log in to the extension.</p>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Current Employees ({users.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.role === 'admin'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                      {user.role === 'admin' && (
                        <span className="text-gray-400 text-sm">Admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Recordings */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Recordings</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentRecordings.map((recording) => (
                  <tr key={recording.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userEmailMap[recording.user_id] || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recording.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Math.round(recording.duration / 1000)}s
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {recording.file_size ? Math.round(recording.file_size / 1024) + 'KB' : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(recording.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Screenshots */}
        <div className="bg-white rounded-lg shadow mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Screenshots</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Preview
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentScreenshots.map((screenshot) => (
                  <tr key={screenshot.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {userEmailMap[screenshot.user_id] || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {screenshot.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(screenshot.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {screenshot.file_url && (
                        <img
                          src={screenshot.file_url}
                          alt="Screenshot preview"
                          className="h-16 w-24 object-cover rounded border"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}