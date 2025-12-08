"use client"

import React, { Suspense } from 'react'
import CRMLayout from '@/components/CRMLayout'
import EventCreationDemo from '@/components/EventCreationDemo'

const EventCreationDemoPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-hud-border-accent border-t-transparent mx-auto mb-4"></div>
            <p className="text-medium-grey font-space-grotesk uppercase tracking-wide">Loading Event Creation Demo...</p>
          </div>
        </div>
      </CRMLayout>
    }>
      <CRMLayout>
        <EventCreationDemo />
      </CRMLayout>
    </Suspense>
  )
}

export default EventCreationDemoPage