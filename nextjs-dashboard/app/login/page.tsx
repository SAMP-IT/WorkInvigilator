'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await signIn(email, password)

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account')
        } else {
          setError(error.message)
        }
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Quick demo login function
  async function handleDemoLogin(userType: 'admin' | 'employee') {
    setLoading(true)
    setError('')

    let demoEmail = ''
    let demoPassword = 'demo123' // Default demo password

    if (userType === 'admin') {
      demoEmail = 'abillkishoreraj@gmail.com' // Admin User
    } else {
      demoEmail = 'manoj@gmail.com' // Manoj Kumar (has session data)
    }

    try {
      const { error } = await signIn(demoEmail, demoPassword)

      if (error) {
        setError(`Demo login failed: ${error.message}`)
      } else {
        router.push('/')
      }
    } catch (err) {
      setError('Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-slate-700">
          <div className="text-center">
            <div className="inline-flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">W</span>
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">Work Invigilator</h1>
                <p className="text-slate-400 text-sm">Admin Dashboard</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-8">
              Sign in to access the monitoring dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter your email"
                suppressHydrationWarning
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg shadow-sm placeholder-slate-400 text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="Enter your password"
                suppressHydrationWarning
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              suppressHydrationWarning
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Login Options */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-slate-800 text-slate-400">Or try demo accounts</span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50"
              >
                Demo Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('employee')}
                disabled={loading}
                className="px-4 py-2 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50"
              >
                Demo Employee
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">
                Demo accounts let you explore the dashboard without credentials
              </p>
            </div>
          </div>

          {/* Admin Credentials Info */}
          <div className="mt-6 p-3 bg-slate-700/30 rounded-lg border border-slate-600">
            <h4 className="text-sm font-medium text-slate-300 mb-2">Available Admin Account:</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <p><strong>Email:</strong> abillkishoreraj@gmail.com</p>
              <p><strong>Note:</strong> Use your actual password or try demo button</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              Work Invigilator Dashboard v2.0.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}