"use client"

import React, { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Shield, Users, Activity, Settings } from 'lucide-react'
import CRMLayout from '@/components/CRMLayout'
import SecurityDashboard from '@/components/SecurityDashboard'
import UserManagement from '@/components/UserManagement'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UserRole } from '@/types/security'
import { hasPermission } from '@/lib/security'

type SecurityTab = 'dashboard' | 'users' | 'settings'

const SecurityPage = () => {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SecurityTab>('dashboard')

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin")
    }
  }, [status, router])

  if (status === "loading") {
    return (
      <CRMLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-hud-border-accent border-t-transparent animate-spin mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">LOADING SECURITY...</p>
          </div>
        </div>
      </CRMLayout>
    )
  }

  if (status === "unauthenticated") {
    return null
  }

  const userRole = (session?.user as any)?.role as UserRole || 'USER'
  const canAccessSecurity = ['SUPER_ADMIN', 'ADMIN'].includes(userRole)

  if (!canAccessSecurity) {
    return (
      <CRMLayout>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
          <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase">
            ACCESS DENIED
          </h3>
          <p className="text-medium-grey font-space-grotesk">
            Security features require administrator privileges.
          </p>
        </div>
      </CRMLayout>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Security Dashboard', icon: Shield },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'settings', label: 'Security Settings', icon: Settings },
  ] as const

  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Security Header */}
        <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
          <h1 className="text-3xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase tracking-wide">
            SECURITY CENTER
          </h1>
          <p className="text-medium-grey font-space-grotesk uppercase tracking-wider text-sm">
            System Security & User Management
          </p>
        </div>

        {/* Security Navigation Tabs */}
        <div className="bg-white border-2 border-hud-border">
          <div className="flex border-b border-hud-border">
            {tabs.map(tab => {
              const IconComponent = tab.icon
              return (
                <button
                  key={tab.id}
                  className={`flex items-center space-x-3 px-6 py-4 text-left font-medium uppercase tracking-wide text-sm font-space-grotesk transition-all duration-200 ${
                    activeTab === tab.id 
                      ? 'bg-tactical-gold text-hud-text-primary font-semibold border-b-2 border-dark-grey' 
                      : 'text-medium-grey hover:bg-light-grey hover:text-hud-text-primary'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <SecurityDashboard userRole={userRole} />
            )}
            
            {activeTab === 'users' && (
              <UserManagement currentUserRole={userRole} />
            )}
            
            {activeTab === 'settings' && (
              <SecuritySettingsPanel userRole={userRole} />
            )}
          </div>
        </div>
      </div>
    </CRMLayout>
  )
}

// Security Settings Panel Component
const SecuritySettingsPanel: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const [settings, setSettings] = useState({
    maxFailedAttempts: 5,
    lockoutDuration: 30,
    sessionTimeout: 15,
    requireTwoFactor: false,
    strictIPValidation: false,
    enableAuditLogging: true,
    passwordMinLength: 12,
    passwordComplexity: true
  })

  const canConfigureSystem = hasPermission(userRole, 'system:configure')

  if (!canConfigureSystem) {
    return (
      <div className="text-center py-12">
        <Settings className="h-16 w-16 mx-auto mb-4 text-gold opacity-50" />
        <h3 className="text-xl font-bold text-hud-text-primary mb-2 font-space-grotesk uppercase">
          CONFIGURATION ACCESS RESTRICTED
        </h3>
        <p className="text-medium-grey font-space-grotesk">
          System configuration requires super administrator privileges.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Authentication Settings */}
        <Card className="bg-white border-2 border-hud-border">
          <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
              AUTHENTICATION SETTINGS
            </h3>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
                Max Failed Login Attempts
              </label>
              <input
                type="number"
                value={settings.maxFailedAttempts}
                onChange={(e) => setSettings({...settings, maxFailedAttempts: parseInt(e.target.value)})}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-space-grotesk"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
                Account Lockout Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.lockoutDuration}
                onChange={(e) => setSettings({...settings, lockoutDuration: parseInt(e.target.value)})}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-space-grotesk"
                min="5"
                max="1440"
              />
            </div>

            <div>
              <label className="block text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-space-grotesk"
                min="5"
                max="480"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-hud-background-secondary">
              <div>
                <span className="font-bold text-hud-text-primary font-space-grotesk">Require Two-Factor Authentication</span>
                <div className="text-sm text-medium-grey font-space-grotesk">
                  Force all users to enable 2FA
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, requireTwoFactor: !settings.requireTwoFactor})}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  settings.requireTwoFactor
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white hover:bg-tactical-grey-1000'
                }`}
              >
                {settings.requireTwoFactor ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Security Policies */}
        <Card className="bg-white border-2 border-hud-border">
          <CardHeader className="bg-hud-background-secondary border-b border-hud-border p-6">
            <h3 className="text-lg font-bold text-hud-text-primary uppercase tracking-wide font-space-grotesk">
              SECURITY POLICIES
            </h3>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold uppercase text-medium-grey tracking-wider font-space-grotesk mb-2">
                Minimum Password Length
              </label>
              <input
                type="number"
                value={settings.passwordMinLength}
                onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value)})}
                className="w-full p-3 border-2 border-hud-border bg-white text-hud-text-primary font-space-grotesk"
                min="8"
                max="32"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-hud-background-secondary">
              <div>
                <span className="font-bold text-hud-text-primary font-space-grotesk">Password Complexity</span>
                <div className="text-sm text-medium-grey font-space-grotesk">
                  Require uppercase, lowercase, numbers, and symbols
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, passwordComplexity: !settings.passwordComplexity})}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  settings.passwordComplexity
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white hover:bg-tactical-grey-1000'
                }`}
              >
                {settings.passwordComplexity ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-hud-background-secondary">
              <div>
                <span className="font-bold text-hud-text-primary font-space-grotesk">Strict IP Validation</span>
                <div className="text-sm text-medium-grey font-space-grotesk">
                  Invalidate sessions when IP address changes
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, strictIPValidation: !settings.strictIPValidation})}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  settings.strictIPValidation
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white hover:bg-tactical-grey-1000'
                }`}
              >
                {settings.strictIPValidation ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-hud-background-secondary">
              <div>
                <span className="font-bold text-hud-text-primary font-space-grotesk">Audit Logging</span>
                <div className="text-sm text-medium-grey font-space-grotesk">
                  Log all security events and user actions
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, enableAuditLogging: !settings.enableAuditLogging})}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                  settings.enableAuditLogging
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-400 text-white hover:bg-tactical-grey-1000'
                }`}
              >
                {settings.enableAuditLogging ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Settings Button */}
      <div className="flex justify-end">
        <button className="bg-tactical-gold text-hud-text-primary px-8 py-3 font-bold uppercase tracking-wide hover:bg-tactical-gold-dark font-space-grotesk transition-colors">
          SAVE CONFIGURATION
        </button>
      </div>
    </div>
  )
}

export default SecurityPage