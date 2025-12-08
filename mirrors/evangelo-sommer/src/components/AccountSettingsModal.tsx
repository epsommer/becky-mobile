"use client"

import React, { useState, useEffect } from 'react'
import { X, User, Mail, Phone, MapPin, Building, Key, Shield, Save, Eye, EyeOff, Palette, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrainyTexture, setGrainIntensity, getGrainIntensity } from '@/components/GrainyTexture'

interface AccountSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: AccountSettings) => void
}

export interface AccountSettings {
  profile: {
    name: string
    email: string
    phone?: string
    company?: string
    title?: string
    location?: string
  }
  security: {
    currentPassword?: string
    newPassword?: string
    confirmPassword?: string
    twoFactorEnabled: boolean
    loginNotifications: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    timezone: string
    notifications: {
      email: boolean
      browser: boolean
      mobile: boolean
    }
  }
}

type ColorTheme = 'light' | 'mocha' | 'overkast' | 'true-night' | 'gilded-meadow'
type GrainIntensity = 'off' | 'low' | 'medium' | 'high'
type WindowTheme = 'neomorphic' | 'tactical'

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'display'>('profile')
  const [showPasswords, setShowPasswords] = useState(false)
  const [settings, setSettings] = useState<AccountSettings>({
    profile: {
      name: 'Evangelo Sommer',
      email: 'admin@evangelosommer.com',
      phone: '+1 (647) 327-8401',
      company: 'MSC Systems',
      title: 'System Administrator',
      location: 'Toronto, ON'
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true
    },
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'America/Toronto',
      notifications: {
        email: true,
        browser: true,
        mobile: false
      }
    }
  })

  // Display & Theme state
  const [colorTheme, setColorTheme] = useState<ColorTheme>('light')
  const [grainIntensity, setGrainIntensityState] = useState<GrainIntensity>('medium')
  const [windowTheme, setWindowTheme] = useState<WindowTheme>('neomorphic')

  // Track original theme settings for cancel/revert
  const [originalColorTheme, setOriginalColorTheme] = useState<ColorTheme>('light')
  const [originalGrainIntensity, setOriginalGrainIntensity] = useState<GrainIntensity>('medium')
  const [originalWindowTheme, setOriginalWindowTheme] = useState<WindowTheme>('neomorphic')

  const handleSave = () => {
    // Save theme settings to localStorage when save is clicked
    applyTheme(colorTheme, true) // true = save to localStorage
    localStorage.setItem('window-theme', windowTheme)
    setGrainIntensity(grainIntensity)

    // Update original values so they match current
    setOriginalColorTheme(colorTheme)
    setOriginalGrainIntensity(grainIntensity)
    setOriginalWindowTheme(windowTheme)

    onSave(settings)
    onClose()
  }

  const handleCancel = () => {
    // Revert to original theme settings
    applyTheme(originalColorTheme)
    applyWindowTheme(originalWindowTheme)
    setGrainIntensity(originalGrainIntensity)

    // Reset state to original values
    setColorTheme(originalColorTheme)
    setGrainIntensityState(originalGrainIntensity)
    setWindowTheme(originalWindowTheme)

    onClose()
  }

  const updateProfile = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      profile: { ...prev.profile, [key]: value }
    }))
  }

  const updateSecurity = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }))
  }

  const updatePreferences = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      preferences: { ...prev.preferences, [key]: value }
    }))
  }

  // Load Display & Theme settings from localStorage when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadedTheme = (localStorage.getItem('color-theme') as ColorTheme) || 'light'
      const loadedGrain = getGrainIntensity()
      const loadedWindow = (localStorage.getItem('window-theme') as WindowTheme) || 'neomorphic'

      setColorTheme(loadedTheme)
      setGrainIntensityState(loadedGrain)
      setWindowTheme(loadedWindow)

      // Store original values for cancel/revert
      setOriginalColorTheme(loadedTheme)
      setOriginalGrainIntensity(loadedGrain)
      setOriginalWindowTheme(loadedWindow)
    }
  }, [isOpen])

  // Theme application logic (for preview only, don't save to localStorage)
  const applyTheme = (theme: ColorTheme, saveToStorage: boolean = false) => {
    const root = document.documentElement
    root.classList.remove('mocha-mode', 'overkast-mode', 'true-night-mode', 'gilded-meadow-mode')

    if (theme === 'mocha') {
      root.classList.add('mocha-mode')
      root.setAttribute('data-theme', 'dark')
    } else if (theme === 'overkast') {
      root.classList.add('overkast-mode')
      root.removeAttribute('data-theme')
    } else if (theme === 'true-night') {
      root.classList.add('true-night-mode')
      root.setAttribute('data-theme', 'dark')
    } else if (theme === 'gilded-meadow') {
      root.classList.add('gilded-meadow-mode')
      root.removeAttribute('data-theme')
    } else {
      // Light theme - remove all theme classes and data-theme attribute
      root.removeAttribute('data-theme')
    }

    // Update data-color-theme attribute for consistency
    root.setAttribute('data-color-theme', theme)

    // Only save to localStorage if explicitly requested (on save button click)
    if (saveToStorage) {
      localStorage.setItem('color-theme', theme)
    }

    window.dispatchEvent(new Event('themechange'))
  }

  const applyWindowTheme = (theme: WindowTheme) => {
    document.documentElement.classList.remove('neomorphic-window', 'tactical-window')
    document.documentElement.classList.add(`${theme}-window`)
  }

  const handleColorThemeChange = (theme: ColorTheme) => {
    setColorTheme(theme)
    applyTheme(theme)
  }

  const handleGrainIntensityChange = (intensity: GrainIntensity) => {
    setGrainIntensityState(intensity)
    setGrainIntensity(intensity)
  }

  const handleWindowThemeChange = (theme: WindowTheme) => {
    setWindowTheme(theme)
    localStorage.setItem('window-theme', theme)
    applyWindowTheme(theme)
  }

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup function to restore scroll when component unmounts
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="neo-container w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="neo-container-inner p-6 flex items-center justify-between border-b border-border">
          <div className="flex items-center space-x-3">
            <User className="h-6 w-6 text-foreground" />
            <h2 className="text-xl font-bold font-primary uppercase tracking-wide text-foreground">
              Account Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="neo-button-circle w-10 h-10 flex items-center justify-center transition-all duration-300 hover:scale-110"
          >
            <X className="h-5 w-5 text-foreground" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          {/* Sidebar Tabs - Horizontal on mobile, vertical on desktop */}
          <div className="md:w-64 bg-background border-b md:border-b-0 md:border-r border-border">
            <div className="p-2 md:p-4">
              <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-x-visible">
                {[
                  { id: 'profile', label: 'Profile Information', shortLabel: 'Profile', icon: User },
                  { id: 'security', label: 'Security & Privacy', shortLabel: 'Security', icon: Shield },
                  { id: 'display', label: 'Display & Theme', shortLabel: 'Display', icon: Palette },
                  { id: 'preferences', label: 'Preferences', shortLabel: 'Prefs', icon: Building }
                ].map(tab => {
                  const IconComponent = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-shrink-0 md:w-full flex items-center space-x-2 md:space-x-3 px-3 md:px-4 py-2 md:py-3 text-left font-medium text-xs md:text-sm font-primary uppercase tracking-wide transition-all duration-300 rounded-xl ${
                        activeTab === tab.id
                          ? 'neo-button-active text-foreground'
                          : 'neo-button text-foreground/70 hover:text-foreground'
                      }`}
                    >
                      <IconComponent className="h-4 w-4 flex-shrink-0" />
                      <span className="hidden md:inline">{tab.label}</span>
                      <span className="md:hidden">{tab.shortLabel}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-foreground font-primary uppercase tracking-wide">
                  Profile Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.name}
                        onChange={(e) => updateProfile('name', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter full name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="email"
                        value={settings.profile.email}
                        onChange={(e) => updateProfile('email', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter email address"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="tel"
                        value={settings.profile.phone}
                        onChange={(e) => updateProfile('phone', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Company
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.company}
                        onChange={(e) => updateProfile('company', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={settings.profile.title}
                      onChange={(e) => updateProfile('title', e.target.value)}
                      className="neomorphic-input w-full"
                      placeholder="Enter job title"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                      <input
                        type="text"
                        value={settings.profile.location}
                        onChange={(e) => updateProfile('location', e.target.value)}
                        className="neomorphic-input w-full pl-10 pr-4"
                        placeholder="Enter location"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  Security & Privacy
                </h3>

                {/* Password Change */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Change Password
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        Current Password
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
                        <input
                          type={showPasswords ? "text" : "password"}
                          value={settings.security.currentPassword || ''}
                          onChange={(e) => updateSecurity('currentPassword', e.target.value)}
                          className="neomorphic-input w-full pl-10 pr-12"
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-grey hover:text-hud-text-primary"
                        >
                          {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.newPassword || ''}
                        onChange={(e) => updateSecurity('newPassword', e.target.value)}
                        className="neomorphic-input w-full"
                        placeholder="Enter new password"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-1 font-primary">
                        Confirm New Password
                      </label>
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={settings.security.confirmPassword || ''}
                        onChange={(e) => updateSecurity('confirmPassword', e.target.value)}
                        className="neomorphic-input w-full"
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>
                </div>

                {/* Security Options */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Security Options
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Two-Factor Authentication</div>
                        <div className="text-sm text-medium-grey font-primary">Add an extra layer of security to your account</div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={settings.security.twoFactorEnabled ? 'bg-green-600 text-white' : 'bg-medium-grey text-white'}>
                          {settings.security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorEnabled}
                            onChange={(e) => updateSecurity('twoFactorEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Login Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Get notified when someone logs into your account</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.security.loginNotifications}
                          onChange={(e) => updateSecurity('loginNotifications', e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'display' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  Display & Theme
                </h3>

                {/* Color Theme Section */}
                <div className="neo-container p-6">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-2">
                    Color Theme
                  </h4>
                  <p className="text-sm text-medium-grey font-primary mb-4">
                    Choose your preferred color palette
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                    {/* Light Theme */}
                    <button
                      onClick={() => handleColorThemeChange('light')}
                      className={`neo-button p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative ${
                        colorTheme === 'light' ? 'neo-button-active' : ''
                      }`}
                    >
                      {colorTheme === 'light' && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-tactical-gold" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#EBECF0] to-[#d1d9e6] border-2 border-[#d1d9e6]" />
                      <span className="font-primary text-[10px] sm:text-xs uppercase tracking-wide">Light</span>
                    </button>

                    {/* Mocha Theme */}
                    <button
                      onClick={() => handleColorThemeChange('mocha')}
                      className={`neo-button p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative ${
                        colorTheme === 'mocha' ? 'neo-button-active' : ''
                      }`}
                    >
                      {colorTheme === 'mocha' && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-tactical-gold" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#1c1917] to-[#44403c] border-2 border-[#78716c]" />
                      <span className="font-primary text-[10px] sm:text-xs uppercase tracking-wide">Mocha</span>
                    </button>

                    {/* Overkast Theme */}
                    <button
                      onClick={() => handleColorThemeChange('overkast')}
                      className={`neo-button p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative ${
                        colorTheme === 'overkast' ? 'neo-button-active' : ''
                      }`}
                    >
                      {colorTheme === 'overkast' && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-tactical-gold" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#B8B8B8] to-[#9A9A9A] border-2 border-[#808080]" />
                      <span className="font-primary text-[10px] sm:text-xs uppercase tracking-wide">Overkast</span>
                    </button>

                    {/* True Night Theme */}
                    <button
                      onClick={() => handleColorThemeChange('true-night')}
                      className={`neo-button p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative ${
                        colorTheme === 'true-night' ? 'neo-button-active' : ''
                      }`}
                    >
                      {colorTheme === 'true-night' && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-tactical-gold" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#1a1a1a] to-[#242424] border-2 border-[#333333]" />
                      <span className="font-primary text-[10px] sm:text-xs uppercase tracking-wide">True Night</span>
                    </button>

                    {/* Gilded Meadow Theme */}
                    <button
                      onClick={() => handleColorThemeChange('gilded-meadow')}
                      className={`neo-button p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 relative ${
                        colorTheme === 'gilded-meadow' ? 'neo-button-active' : ''
                      }`}
                    >
                      {colorTheme === 'gilded-meadow' && (
                        <div className="absolute top-1 sm:top-2 right-1 sm:right-2">
                          <Check className="h-4 w-4 sm:h-5 sm:w-5 text-tactical-gold" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-[#F5F5DC] to-[#F0EAD6] border-2 border-[#D4C5A9]" />
                      <span className="font-primary text-[10px] sm:text-xs uppercase tracking-wide">Gilded Meadow</span>
                    </button>
                  </div>
                </div>

                {/* Grain Texture Section */}
                <div className="neo-container p-6">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-2">
                    Grain Texture
                  </h4>
                  <p className="text-sm text-medium-grey font-primary mb-4">
                    Adjust the film grain overlay intensity
                  </p>

                  <div className="space-y-4">
                    {/* Grain Intensity Selector */}
                    <div className="grid grid-cols-4 gap-4">
                      {(['off', 'low', 'medium', 'high'] as GrainIntensity[]).map((intensity) => (
                        <button
                          key={intensity}
                          onClick={() => handleGrainIntensityChange(intensity)}
                          className={`neo-button px-4 py-3 font-primary text-sm uppercase tracking-wide ${
                            grainIntensity === intensity ? 'neo-button-active' : ''
                          }`}
                        >
                          {intensity}
                        </button>
                      ))}
                    </div>

                    {/* Grain Preview */}
                    <div className="relative neo-container p-8 overflow-hidden">
                      <div className="text-center font-primary text-sm uppercase tracking-wide text-medium-grey">
                        Preview
                      </div>
                      <GrainyTexture forceIntensity={grainIntensity} filterId="preview-grain" />
                    </div>
                  </div>
                </div>

                {/* Window Theme Section */}
                <div className="neo-container p-6">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-2">
                    Window Style
                  </h4>
                  <p className="text-sm text-medium-grey font-primary mb-4">
                    Choose your interface style
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Neomorphic Style */}
                    <button
                      onClick={() => handleWindowThemeChange('neomorphic')}
                      className={`neo-button p-6 flex flex-col items-center gap-4 ${
                        windowTheme === 'neomorphic' ? 'neo-button-active' : ''
                      }`}
                    >
                      <div className="w-full h-24 rounded-xl bg-[var(--hud-background-secondary)] shadow-[8px_8px_16px_var(--neomorphic-dark-shadow),-8px_-8px_16px_var(--neomorphic-light-shadow)] flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-[var(--hud-background-primary)] shadow-[4px_4px_8px_var(--neomorphic-dark-shadow),-4px_-4px_8px_var(--neomorphic-light-shadow)]" />
                      </div>
                      <div className="text-center">
                        <div className="font-primary text-sm uppercase tracking-wide mb-1">Neomorphic</div>
                        <div className="text-xs text-medium-grey font-primary">Soft, rounded corners</div>
                      </div>
                    </button>

                    {/* Tactical Style */}
                    <button
                      onClick={() => handleWindowThemeChange('tactical')}
                      className={`neo-button p-6 flex flex-col items-center gap-4 ${
                        windowTheme === 'tactical' ? 'neo-button-active' : ''
                      }`}
                    >
                      <div className="w-full h-24 bg-[var(--hud-background-secondary)] shadow-[0_2px_4px_rgba(0,0,0,0.2)] flex items-center justify-center">
                        <div className="w-12 h-12 bg-[var(--hud-background-primary)] shadow-[0_2px_4px_rgba(0,0,0,0.2)]" />
                      </div>
                      <div className="text-center">
                        <div className="font-primary text-sm uppercase tracking-wide mb-1">Tactical</div>
                        <div className="text-xs text-medium-grey font-primary">Sharp, angular corners</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-hud-text-primary font-primary uppercase tracking-wide">
                  System Preferences
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Localization */}
                  <div className="neo-container p-4">
                    <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                      Localization
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                          Language
                        </label>
                        <select
                          value={settings.preferences.language}
                          onChange={(e) => updatePreferences('language', e.target.value)}
                          className="neomorphic-input w-full"
                        >
                          <option value="en">English</option>
                          <option value="fr">Français</option>
                          <option value="es">Español</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-medium-grey uppercase tracking-wider mb-2 font-primary">
                          Timezone
                        </label>
                        <select
                          value={settings.preferences.timezone}
                          onChange={(e) => updatePreferences('timezone', e.target.value)}
                          className="neomorphic-input w-full"
                        >
                          <option value="America/Toronto">Eastern Time</option>
                          <option value="America/New_York">Eastern Time (US)</option>
                          <option value="America/Chicago">Central Time</option>
                          <option value="America/Denver">Mountain Time</option>
                          <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div className="neo-container p-4">
                  <h4 className="font-bold text-foreground font-primary uppercase tracking-wide mb-4">
                    Notification Preferences
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Email Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Receive notifications via email</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.email}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            email: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Browser Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Show browser popup notifications</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.browser}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            browser: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-hud-text-primary font-primary">Mobile Notifications</div>
                        <div className="text-sm text-medium-grey font-primary">Send push notifications to mobile devices</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.preferences.notifications.mobile}
                          onChange={(e) => updatePreferences('notifications', {
                            ...settings.preferences.notifications,
                            mobile: e.target.checked
                          })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="neo-container-inner border-t border-border p-6 flex items-center justify-between">
          <div className="text-sm text-foreground/60 font-primary">
            Preview changes live. Click "Save Changes" to keep them, or "Cancel" to revert.
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCancel}
              className="neo-button px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="neo-button-active px-6 py-2 font-bold uppercase tracking-wide font-primary transition-all duration-300 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountSettingsModal