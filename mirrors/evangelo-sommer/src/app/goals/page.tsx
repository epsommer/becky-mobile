// src/app/goals/page.tsx
// Goals management page integrated with the time manager

"use client"

import React, { Suspense } from 'react'
import CRMLayout from '@/components/CRMLayout'
import GoalDashboard from '@/components/goals/GoalDashboard'

const GoalsPageContent = () => {
  return (
    <CRMLayout>
      <div className="p-6 space-y-6">
        {/* Page Header */}
        <div className="neo-container p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground uppercase tracking-wide font-primary mb-2">
                GOALS & OBJECTIVES
              </h1>
              <p className="text-muted-foreground font-primary">
                TRACK YOUR PROGRESS AND ACHIEVE YOUR MISSION OBJECTIVES
              </p>
            </div>
          </div>
        </div>

        {/* Goal Dashboard */}
        <div className="neo-card">
          <GoalDashboard />
        </div>
      </div>
    </CRMLayout>
  )
}

const GoalsPage = () => {
  return (
    <Suspense fallback={
      <CRMLayout>
        <div className="p-6">
          <div className="neo-card flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
              <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading Goals...</p>
            </div>
          </div>
        </div>
      </CRMLayout>
    }>
      <GoalsPageContent />
    </Suspense>
  )
}

export default GoalsPage