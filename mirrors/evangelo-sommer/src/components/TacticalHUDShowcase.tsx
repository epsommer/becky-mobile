'use client';

import React, { useState } from 'react';
import { ChevronRight, Activity, Shield, Target, AlertTriangle, Settings, Database } from 'lucide-react';
import { ThemeToggle, TacticalThemeToggle } from './ThemeToggle';
import { SlidingThemeToggle } from './SlidingThemeToggle';

export default function TacticalHUDShowcase() {
  const [activeTab, setActiveTab] = useState('components');
  const [progress, setProgress] = useState(75);

  const tabs = [
    { id: 'components', label: 'COMPONENTS', icon: Shield },
    { id: 'typography', label: 'TYPOGRAPHY', icon: Target },
    { id: 'data', label: 'DATA DISPLAY', icon: Database },
    { id: 'interactions', label: 'INTERACTIONS', icon: Activity }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground p-8 font-primary transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="tactical-frame mb-8 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-heading text-3xl mb-2">TACTICAL HUD DESIGN SYSTEM</h1>
              <p className="text-hud-secondary text-lg font-hud-mono">
                Military Command Interface • Gold/Gray/Brown Palette • Angular Architecture
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="status-online"></div>
              <span className="text-tactical-data">SYSTEM ONLINE</span>
              <SlidingThemeToggle dayNightOnly={true} />
            </div>
          </div>
          
          <div className="diagonal-accent h-0.5 bg-tactical-gold mb-4"></div>
          
          <div className="grid grid-cols-4 gap-4">
            <div className="hud-metric">
              <Activity className="w-5 h-5" />
              <div>
                <div className="text-tactical-gold text-sm">COMPONENTS</div>
                <div className="font-mono text-lg">47</div>
              </div>
            </div>
            <div className="hud-metric">
              <Shield className="w-5 h-5" />
              <div>
                <div className="text-tactical-gold text-sm">SECURITY</div>
                <div className="font-mono text-lg">100%</div>
              </div>
            </div>
            <div className="hud-metric">
              <Target className="w-5 h-5" />
              <div>
                <div className="text-tactical-gold text-sm">ACCURACY</div>
                <div className="font-mono text-lg">99.7%</div>
              </div>
            </div>
            <div className="hud-metric">
              <Database className="w-5 h-5" />
              <div>
                <div className="text-tactical-gold text-sm">DATA INTEGRITY</div>
                <div className="font-mono text-lg">OPTIMAL</div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tab-tactical ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="tactical-grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {activeTab === 'components' && (
            <>
              {/* Buttons */}
              <div className="tactical-frame p-6 corner-markers">
                <h3 className="text-heading text-xl mb-4">TACTICAL BUTTONS</h3>
                <div className="space-y-4">
                  <button className="btn-tactical w-full">PRIMARY ACTION</button>
                  <button className="btn-secondary w-full">SECONDARY ACTION</button>
                  <button className="btn-outline w-full">OUTLINED ACTION</button>
                  <button className="btn-tactical w-full hover-tactical-glow">ENHANCED HOVER</button>
                </div>
              </div>

              {/* Inputs */}
              <div className="tactical-frame p-6">
                <h3 className="text-heading text-xl mb-4">HUD INPUTS</h3>
                <div className="space-y-4">
                  <input
                    className="input-tactical w-full"
                    placeholder="TACTICAL INPUT FIELD"
                    type="text"
                  />
                  <select className="input-tactical w-full">
                    <option>SELECT MISSION TYPE</option>
                    <option>RECONNAISSANCE</option>
                    <option>ASSAULT</option>
                    <option>DEFENSIVE</option>
                  </select>
                  <textarea
                    className="input-tactical w-full h-24 resize-none"
                    placeholder="MISSION BRIEFING..."
                  />
                </div>
              </div>

              {/* Progress Indicators */}
              <div className="tactical-frame p-6">
                <h3 className="text-heading text-xl mb-4">MISSION PROGRESS</h3>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-hud-secondary text-sm">OBJECTIVE COMPLETION</span>
                      <span className="text-tactical-gold font-mono">{progress}%</span>
                    </div>
                    <div 
                      className="progress-tactical" 
                      style={{ '--progress': `${progress}%` } as React.CSSProperties}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <button
                      onClick={() => setProgress(Math.max(0, progress - 10))}
                      className="btn-outline text-xs py-2"
                    >
                      DECREASE
                    </button>
                    <div className="text-center">
                      <div className="status-tactical bg-tactical-green mx-auto mb-1"></div>
                      <div className="text-xs text-hud-secondary">ACTIVE</div>
                    </div>
                    <button
                      onClick={() => setProgress(Math.min(100, progress + 10))}
                      className="btn-outline text-xs py-2"
                    >
                      INCREASE
                    </button>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="tactical-frame p-6">
                <h3 className="text-heading text-xl mb-4">TACTICAL ALERTS</h3>
                <div className="space-y-4">
                  <div className="hud-alert">
                    <AlertTriangle className="w-5 h-5 mr-3 inline" />
                    THREAT DETECTED - IMMEDIATE RESPONSE REQUIRED
                  </div>
                  
                  <div className="data-terminal">
                    <div className="text-tactical-green font-mono text-sm">
                      &gt; SYSTEM STATUS: OPERATIONAL<br />
                      &gt; SECURITY LEVEL: MAXIMUM<br />
                      &gt; LAST UPDATE: 2025-01-15 14:32:07
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'typography' && (
            <>
              {/* Typography Examples */}
              <div className="tactical-frame p-6 col-span-full">
                <h3 className="text-heading text-xl mb-6">TACTICAL TYPOGRAPHY</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-subheading mb-4">HUD TEXT STYLES</h4>
                    <div className="space-y-4">
                      <div className="text-hud-primary text-2xl font-bold">PRIMARY HUD TEXT</div>
                      <div className="text-hud-secondary text-lg">Secondary information display</div>
                      <div className="text-tactical-data text-base">Tactical data readout: 7.62x51</div>
                      <div className="font-hud-mono text-tactical-gold">MONOSPACE_SYSTEM_CODE</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-subheading mb-4">STATUS INDICATORS</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="status-online"></div>
                        <span className="text-tactical-data">SYSTEM OPERATIONAL</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="status-warning"></div>
                        <span className="text-tactical-data">CAUTION ADVISED</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="status-offline"></div>
                        <span className="text-tactical-data">SYSTEM OFFLINE</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'data' && (
            <>
              {/* Data Display */}
              <div className="tactical-frame p-6 col-span-full">
                <h3 className="text-heading text-xl mb-6">DATA VISUALIZATION</h3>
                
                <div className="tactical-grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="hud-metric">
                    <Target className="w-6 h-6 text-tactical-gold" />
                    <div>
                      <div className="text-tactical-gold text-sm font-mono">TARGET_LOCK</div>
                      <div className="text-2xl font-bold">ACQUIRED</div>
                      <div className="text-xs text-hud-secondary">Range: 1,247m</div>
                    </div>
                  </div>
                  
                  <div className="hud-metric">
                    <Shield className="w-6 h-6 text-tactical-green" />
                    <div>
                      <div className="text-tactical-green text-sm font-mono">DEFENSE_STATUS</div>
                      <div className="text-2xl font-bold text-tactical-green">ACTIVE</div>
                      <div className="text-xs text-hud-secondary">Integrity: 98%</div>
                    </div>
                  </div>
                  
                  <div className="hud-metric">
                    <Activity className="w-6 h-6 text-tactical-amber" />
                    <div>
                      <div className="text-tactical-amber text-sm font-mono">SYS_ACTIVITY</div>
                      <div className="text-2xl font-bold text-tactical-amber">HIGH</div>
                      <div className="text-xs text-hud-secondary">CPU: 67%</div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'interactions' && (
            <>
              {/* Interactive Elements */}
              <div className="tactical-frame p-6">
                <h3 className="text-heading text-xl mb-4">INTERACTIVE ELEMENTS</h3>
                
                <div className="space-y-4">
                  <div className="interactive-tactical p-4 border-2 border-hud-border hover-schematic">
                    <div className="text-tactical-gold font-mono text-sm">HOVER TARGET</div>
                    <div className="text-hud-primary">Interactive tactical element with schematic overlay</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button className="btn-tactical hover-tactical-glow">
                      ENGAGE
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </button>
                    <button className="btn-outline pulse-tactical">
                      STANDBY
                    </button>
                  </div>
                </div>
              </div>

              {/* Theme Control */}
              <div className="tactical-frame p-6">
                <h3 className="text-heading text-xl mb-4">DISPLAY CONTROL</h3>
                <TacticalThemeToggle />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}