"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, ArrowLeft, Play, CheckCircle, AlertTriangle } from 'lucide-react'
import DragDropCalendarDemo from '@/components/DragDropCalendarDemo'

export default function DragDropDemoPage() {
  const [showDemo, setShowDemo] = React.useState(false)

  const features = [
    {
      title: 'Drag & Drop Rescheduling',
      description: 'Click and drag events to move them to different time slots',
      status: 'implemented' as const
    },
    {
      title: 'Mobile Touch Support',
      description: 'Long press and drag on mobile devices',
      status: 'implemented' as const
    },
    {
      title: 'Confirmation Popup',
      description: 'Modal confirmation before rescheduling events',
      status: 'implemented' as const
    },
    {
      title: 'Client Notifications',
      description: 'Automatic Gmail notifications to participants',
      status: 'implemented' as const
    },
    {
      title: 'Duration Editing',
      description: 'Drag event edges to change duration',
      status: 'implemented' as const
    },
    {
      title: 'Enhanced Client Management',
      description: 'Autocomplete client selector with inline creation',
      status: 'implemented' as const
    },
    {
      title: 'Visual Feedback',
      description: 'Real-time drag preview and drop zone highlighting',
      status: 'implemented' as const
    }
  ]

  if (showDemo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-hud-background to-light-grey p-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <Button
              onClick={() => setShowDemo(false)}
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Overview
            </Button>
          </div>
          
          <DragDropCalendarDemo onClose={() => setShowDemo(false)} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-hud-background to-light-grey p-4">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Calendar className="w-12 h-12 text-tactical-gold" />
          </div>
          <h1 className="text-4xl font-bold text-hud-text-primary font-primary uppercase tracking-wide">
            Drag & Drop Calendar System
          </h1>
          <p className="text-lg text-medium-grey font-primary max-w-3xl mx-auto">
            A comprehensive event scheduling system with drag-and-drop functionality, 
            mobile touch support, client notifications, and enhanced user experience
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-hud-border hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-lg font-primary">
                  <span>{feature.title}</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded uppercase font-semibold">
                      Ready
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-medium-grey font-primary text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Architecture Overview */}
        <Card className="border-tactical-gold bg-tactical-gold-light">
          <CardHeader>
            <CardTitle className="text-xl font-primary uppercase tracking-wide text-hud-text-primary">
              System Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-2">
                  Frontend Components
                </h3>
                <ul className="text-sm text-medium-grey font-primary space-y-1">
                  <li>• DragAndDropEvent</li>
                  <li>• DropZone</li>
                  <li>• DragDropContext</li>
                  <li>• ClientSelector</li>
                  <li>• RescheduleModal</li>
                </ul>
              </div>
              
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-2">
                  Touch & Mobile
                </h3>
                <ul className="text-sm text-medium-grey font-primary space-y-1">
                  <li>• Long press detection</li>
                  <li>• Touch coordinate handling</li>
                  <li>• Scroll prevention</li>
                  <li>• Responsive design</li>
                  <li>• Visual feedback</li>
                </ul>
              </div>
              
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-2">
                  Backend Services
                </h3>
                <ul className="text-sm text-medium-grey font-primary space-y-1">
                  <li>• Gmail API integration</li>
                  <li>• Event management</li>
                  <li>• Participant notifications</li>
                  <li>• Client management</li>
                  <li>• Data persistence</li>
                </ul>
              </div>
              
              <div className="bg-white bg-opacity-50 rounded-lg p-4">
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-2">
                  User Experience
                </h3>
                <ul className="text-sm text-medium-grey font-primary space-y-1">
                  <li>• Intuitive drag & drop</li>
                  <li>• Confirmation dialogs</li>
                  <li>• Auto-save functionality</li>
                  <li>• Error handling</li>
                  <li>• Professional styling</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Instructions */}
        <Card className="border-hud-border">
          <CardHeader>
            <CardTitle className="text-xl font-primary uppercase tracking-wide text-hud-text-primary">
              How to Use the Drag & Drop System
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-4">
                  Desktop Instructions
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-hud-text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Click and Drag</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Click on any event and drag it to a different time slot
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-hud-text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Resize Duration</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Drag the top or bottom edge of an event to change its duration
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-hud-text-primary rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Confirm Changes</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Review and confirm the reschedule in the popup modal
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-hud-text-primary font-primary uppercase text-sm mb-4">
                  Mobile Instructions
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Long Press</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Long press (500ms) on an event to initiate drag mode
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Drag to New Slot</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Drag the event to your desired time slot
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-tactical-gold text-white rounded-full flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-hud-text-primary font-primary">Release to Drop</p>
                      <p className="text-sm text-medium-grey font-primary">
                        Release your finger to drop the event and confirm
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integration Status */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl font-primary uppercase tracking-wide text-green-800">
              <CheckCircle className="w-6 h-6" />
              Integration Complete
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-green-800 font-primary uppercase text-sm mb-3">
                  Integrated Components
                </h3>
                <ul className="text-sm text-green-700 font-primary space-y-1">
                  <li>✅ DailyPlanner.tsx - Full drag & drop support</li>
                  <li>✅ WeekView.tsx - Cross-day drag & drop</li>
                  <li>✅ EventCreationModal.tsx - Enhanced client selector</li>
                  <li>✅ Gmail notification service integration</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold text-green-800 font-primary uppercase text-sm mb-3">
                  Ready for Production
                </h3>
                <ul className="text-sm text-green-700 font-primary space-y-1">
                  <li>✅ Cross-platform compatibility</li>
                  <li>✅ Error handling and recovery</li>
                  <li>✅ Professional email templates</li>
                  <li>✅ Responsive design patterns</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Launch Demo Button */}
        <div className="text-center py-8">
          <Button
            onClick={() => setShowDemo(true)}
            size="lg"
            className="bg-tactical-gold hover:bg-tactical-gold-light text-hud-text-primary px-8 py-4 text-lg font-primary font-semibold uppercase tracking-wide"
          >
            <Play className="w-6 h-6 mr-3" />
            Launch Interactive Demo
          </Button>
          <p className="mt-4 text-sm text-medium-grey font-primary">
            Try the complete drag-and-drop workflow with sample events
          </p>
        </div>
      </div>
    </div>
  )
}