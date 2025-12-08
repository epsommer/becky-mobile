"use client"

import React, { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const EmergencyLogin = () => {
  const [email, setEmail] = useState('admin@evangelosommer.com')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugInfo, setDebugInfo] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setDebugInfo('Starting login process...\n')

    try {
      console.log('🚨 EMERGENCY LOGIN ATTEMPT')
      setDebugInfo(prev => prev + 'Calling signIn function...\n')

      const result = await signIn('admin-login', {
        email: email,
        redirect: false,
        callbackUrl: '/dashboard'
      })

      console.log('🚨 EMERGENCY LOGIN RESULT:', result)
      setDebugInfo(prev => prev + `SignIn result: ${JSON.stringify(result, null, 2)}\n`)

      if (result?.ok) {
        setDebugInfo(prev => prev + 'Login successful! Getting session...\n')
        
        const session = await getSession()
        console.log('🚨 SESSION AFTER LOGIN:', session)
        setDebugInfo(prev => prev + `Session: ${JSON.stringify(session, null, 2)}\n`)

        if (session) {
          setDebugInfo(prev => prev + 'Redirecting to dashboard...\n')
          router.push('/dashboard')
        } else {
          setError('Login succeeded but no session created')
          setDebugInfo(prev => prev + 'ERROR: No session created after successful login\n')
        }
      } else {
        const errorMsg = result?.error || 'Unknown error'
        setError(`Login failed: ${errorMsg}`)
        setDebugInfo(prev => prev + `ERROR: ${errorMsg}\n`)
      }
    } catch (err) {
      console.error('🚨 EMERGENCY LOGIN ERROR:', err)
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      setError(`Exception during login: ${errorMsg}`)
      setDebugInfo(prev => prev + `EXCEPTION: ${errorMsg}\n`)
    } finally {
      setLoading(false)
    }
  }

  const testAPIRoute = async () => {
    try {
      setDebugInfo('Testing authentication API...\n')
      const response = await fetch('/api/test-auth')
      const data = await response.json()
      setDebugInfo(prev => prev + `API Test Result: ${JSON.stringify(data, null, 2)}\n`)
    } catch (err) {
      setDebugInfo(prev => prev + `API Test Error: ${err}\n`)
    }
  }

  const clearAll = () => {
    // Clear all browser storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear cookies
    document.cookie.split(';').forEach(cookie => {
      const eqPos = cookie.indexOf('=')
      const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
    })
    
    setDebugInfo('All storage and cookies cleared!\n')
    alert('Storage cleared. Page will reload.')
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-hud-background-secondary flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 font-space-grotesk uppercase">
            🚨 EMERGENCY LOGIN
          </h1>
          <p className="text-medium-grey font-space-grotesk mt-2">
            Simplified authentication for troubleshooting
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-hud-border text-hud-text-primary font-space-grotesk focus:outline-none focus:border-hud-border-accent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full flex justify-center py-3 px-4 border-2 border-transparent text-sm font-bold font-space-grotesk uppercase tracking-wide text-white transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {loading ? 'LOGGING IN...' : 'EMERGENCY LOGIN'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-500 text-red-700">
              <p className="text-sm font-space-grotesk font-bold">ERROR:</p>
              <p className="text-sm font-space-grotesk">{error}</p>
            </div>
          )}
        </form>

        <div className="space-y-2">
          <button
            onClick={testAPIRoute}
            className="w-full py-2 px-4 bg-tactical-gold text-white text-sm font-bold font-space-grotesk uppercase hover:bg-tactical-gold-dark"
          >
            TEST AUTH API
          </button>
          
          <button
            onClick={clearAll}
            className="w-full py-2 px-4 bg-purple-600 text-white text-sm font-bold font-space-grotesk uppercase hover:bg-purple-700"
          >
            CLEAR ALL & RESTART
          </button>
        </div>

        {debugInfo && (
          <div className="mt-6">
            <h3 className="text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
              DEBUG LOG:
            </h3>
            <div className="bg-dark-grey text-white p-4 text-xs font-mono max-h-64 overflow-y-auto">
              <pre>{debugInfo}</pre>
            </div>
          </div>
        )}

        <div className="text-center">
          <a href="/auth/signin" className="text-sm text-gold hover:text-gold-dark font-space-grotesk">
            ← Back to Normal Login
          </a>
        </div>
      </div>
    </div>
  )
}

export default EmergencyLogin