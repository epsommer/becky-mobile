"use client";

import React, { useState } from 'react';
import { ArrowLeft, Save, User, Key, Shield, Eye, EyeOff, CheckCircle, AlertCircle, Bell, Monitor } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface AccountSettings {
  profile: {
    name: string;
    email: string;
    phone?: string;
    company?: string;
    title?: string;
    location?: string;
    avatar?: string;
    bio?: string;
  };
  security: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
    twoFactorEnabled: boolean;
    loginNotifications: boolean;
    sessionTimeout: number;
    trustedDevices: string[];
  };
  privacy: {
    profileVisibility: 'public' | 'private' | 'contacts';
    activityTracking: boolean;
    dataSharing: boolean;
    marketingEmails: boolean;
  };
  notifications: {
    email: {
      securityAlerts: boolean;
      systemUpdates: boolean;
      newsletters: boolean;
      promotions: boolean;
    };
    browser: {
      realTimeUpdates: boolean;
      taskReminders: boolean;
      systemAlerts: boolean;
    };
    mobile: {
      pushNotifications: boolean;
      smsAlerts: boolean;
    };
  };
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
}

export default function AccountConfigPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'privacy' | 'notifications' | 'preferences'>('profile');
  const [showPasswords, setShowPasswords] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [settings, setSettings] = useState<AccountSettings>({
    profile: {
      name: 'Evangelo Sommer',
      email: 'admin@evangelosommer.com',
      phone: '+1 (647) 327-8401',
      company: 'MSC Systems',
      title: 'System Administrator',
      location: 'Toronto, ON',
      bio: 'Full-stack developer and system administrator with expertise in CRM systems, business automation, and tactical operations management.'
    },
    security: {
      twoFactorEnabled: false,
      loginNotifications: true,
      sessionTimeout: 60,
      trustedDevices: ['Chrome on Windows', 'Safari on macOS']
    },
    privacy: {
      profileVisibility: 'private',
      activityTracking: false,
      dataSharing: false,
      marketingEmails: false
    },
    notifications: {
      email: {
        securityAlerts: true,
        systemUpdates: true,
        newsletters: false,
        promotions: false
      },
      browser: {
        realTimeUpdates: true,
        taskReminders: true,
        systemAlerts: true
      },
      mobile: {
        pushNotifications: false,
        smsAlerts: false
      }
    },
    preferences: {
      theme: 'system',
      language: 'en',
      timezone: 'America/Toronto',
      dateFormat: 'MM/DD/YYYY',
      currency: 'CAD'
    }
  });

  const handleSave = async () => {
    setSaveStatus('saving');
    
    try {
      // Save to localStorage for now (would be API call in production)
      localStorage.setItem('account-settings', JSON.stringify(settings));
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSaveStatus('saved');
      
      // Reset status after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const updateProfile = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      profile: { ...prev.profile, [key]: value }
    }));
  };

  const updateSecurity = (key: string, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      security: { ...prev.security, [key]: value }
    }));
  };

  const getSaveButtonText = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved!';
      case 'error': return 'Error - Retry';
      default: return 'Save Changes';
    }
  };

  const getSaveButtonIcon = () => {
    switch (saveStatus) {
      case 'saved': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <Save className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-hud-background-primary">
      {/* Header */}
      <div className="bg-hud-overlay border-b-4 border-tactical-gold">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-tactical-gold hover:text-tactical-amber transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="font-primary uppercase tracking-wide">Back</span>
              </button>
              <div className="border-l-2 border-tactical-gold pl-4">
                <h1 className="text-3xl font-bold text-tactical-white font-primary uppercase tracking-wide">
                  Account Configuration
                </h1>
                <p className="text-tactical-data text-sm font-primary uppercase tracking-wider">
                  CLEARANCE_LEVEL: ALPHA • USER_ID: ES001
                </p>
              </div>
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className={`px-6 py-2 font-bold uppercase tracking-wide font-primary ${
                saveStatus === 'saved' 
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : saveStatus === 'error'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-tactical-gold hover:bg-tactical-gold-dark text-hud-text-primary'
              }`}
            >
              {getSaveButtonIcon()}
              <span className="ml-2">{getSaveButtonText()}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex space-x-8">
          {/* Sidebar Navigation */}
          <div className="w-80 shrink-0">
            <div className="bg-hud-background-secondary border-2 border-hud-border">
              <div className="p-6">
                <div className="space-y-2">
                  {[
                    { id: 'profile', label: 'Profile Information', icon: User, desc: 'Personal details and bio' },
                    { id: 'security', label: 'Security Settings', icon: Shield, desc: 'Passwords and 2FA' },
                    { id: 'privacy', label: 'Privacy Controls', icon: Key, desc: 'Data and visibility settings' },
                    { id: 'notifications', label: 'Notification Center', icon: Bell, desc: 'Email and alert preferences' },
                    { id: 'preferences', label: 'System Preferences', icon: Monitor, desc: 'Theme and localization' }
                  ].map(tab => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'profile' | 'security' | 'privacy' | 'notifications' | 'preferences')}
                        className={`w-full text-left p-4 border-2 transition-all duration-200 ${
                          activeTab === tab.id
                            ? 'bg-tactical-gold text-hud-text-primary border-tactical-gold'
                            : 'bg-transparent text-medium-grey border-transparent hover:border-hud-border hover:text-hud-text-primary'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <IconComponent className={`h-5 w-5 mt-0.5 ${
                            activeTab === tab.id ? 'text-hud-text-primary' : 'text-tactical-gold'
                          }`} />
                          <div>
                            <div className={`font-medium font-primary uppercase tracking-wide text-sm ${
                              activeTab === tab.id ? 'text-hud-text-primary' : 'text-hud-text-primary'
                            }`}>
                              {tab.label}
                            </div>
                            <div className={`text-xs mt-1 ${
                              activeTab === tab.id ? 'text-hud-text-primary/80' : 'text-medium-grey'
                            }`}>
                              {tab.desc}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-hud-background-secondary border-2 border-hud-border">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Profile Information
                  </h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Basic Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide border-b border-hud-border pb-2">
                        Basic Information
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={settings.profile.name}
                            onChange={(e) => updateProfile('name', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={settings.profile.email}
                            onChange={(e) => updateProfile('email', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={settings.profile.phone || ''}
                            onChange={(e) => updateProfile('phone', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Professional Information */}
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide border-b border-hud-border pb-2">
                        Professional Details
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Company
                          </label>
                          <input
                            type="text"
                            value={settings.profile.company || ''}
                            onChange={(e) => updateProfile('company', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Job Title
                          </label>
                          <input
                            type="text"
                            value={settings.profile.title || ''}
                            onChange={(e) => updateProfile('title', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Location
                          </label>
                          <input
                            type="text"
                            value={settings.profile.location || ''}
                            onChange={(e) => updateProfile('location', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bio Section - Full Width */}
                    <div className="lg:col-span-2 space-y-4">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide border-b border-hud-border pb-2">
                        Biography
                      </h3>
                      <div>
                        <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                          Professional Bio
                        </label>
                        <textarea
                          value={settings.profile.bio || ''}
                          onChange={(e) => updateProfile('bio', e.target.value)}
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-hud-border bg-hud-background-primary text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none resize-none"
                          placeholder="Tell us about your professional background and expertise..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Security Settings
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Password Section */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Password Management
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Current Password
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords ? 'text' : 'password'}
                              value={settings.security.currentPassword || ''}
                              onChange={(e) => updateSecurity('currentPassword', e.target.value)}
                              className="w-full px-4 py-3 pr-12 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords(!showPasswords)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-medium-grey hover:text-hud-text-primary"
                            >
                              {showPasswords ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            New Password
                          </label>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={settings.security.newPassword || ''}
                            onChange={(e) => updateSecurity('newPassword', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Confirm Password
                          </label>
                          <input
                            type={showPasswords ? 'text' : 'password'}
                            value={settings.security.confirmPassword || ''}
                            onChange={(e) => updateSecurity('confirmPassword', e.target.value)}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Two-Factor Authentication */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Two-Factor Authentication
                      </h3>
                      
                      <div className="flex items-center justify-between p-4 border border-hud-border">
                        <div>
                          <div className="font-medium text-hud-text-primary font-primary">Enable 2FA</div>
                          <div className="text-sm text-medium-grey font-primary mt-1">Add an extra layer of security to your account</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.security.twoFactorEnabled}
                            onChange={(e) => updateSecurity('twoFactorEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                        </label>
                      </div>
                    </div>

                    {/* Session Management */}
                    <div className="bg-hud-background-primary border-2 border-hud-border p-6">
                      <h3 className="text-lg font-medium text-hud-text-primary font-primary uppercase tracking-wide mb-6">
                        Session Management
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border border-hud-border">
                          <div>
                            <div className="font-medium text-hud-text-primary font-primary">Login Notifications</div>
                            <div className="text-sm text-medium-grey font-primary mt-1">Get notified when someone logs into your account</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.security.loginNotifications}
                              onChange={(e) => updateSecurity('loginNotifications', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-tactical-grey-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tactical-gold"></div>
                          </label>
                        </div>

                        <div className="p-4 border border-hud-border">
                          <label className="block text-sm font-medium text-medium-grey font-primary uppercase tracking-wider mb-2">
                            Session Timeout (minutes)
                          </label>
                          <select
                            value={settings.security.sessionTimeout}
                            onChange={(e) => updateSecurity('sessionTimeout', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border-2 border-hud-border bg-white text-hud-text-primary font-primary focus:border-tactical-gold focus:outline-none"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                            <option value={480}>8 hours</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Add other tabs (privacy, notifications, preferences) here */}
              {activeTab === 'privacy' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Privacy Controls
                  </h2>
                  <div className="text-medium-grey">Privacy settings content will be implemented here...</div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    Notification Center
                  </h2>
                  <div className="text-medium-grey">Notification settings content will be implemented here...</div>
                </div>
              )}

              {activeTab === 'preferences' && (
                <div className="p-8">
                  <h2 className="text-2xl font-bold text-hud-text-primary font-primary uppercase tracking-wide mb-8">
                    System Preferences
                  </h2>
                  <div className="text-medium-grey">System preferences content will be implemented here...</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}