"use client"

import React from 'react'
import { Target, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useGoals } from '@/hooks/useGoals'
import { format } from 'date-fns'

interface GoalsWidgetProps {
  onViewAll?: () => void
}

const GoalsWidget: React.FC<GoalsWidgetProps> = ({ onViewAll }) => {
  const {
    goals,
    statistics,
    isLoading,
    getOverdueGoals,
    getUpcomingDeadlines,
    getGoalsByStatus
  } = useGoals()

  if (isLoading) {
    return (
      <div className="neo-card flex flex-col w-full h-full">
        <div className="p-6 flex-grow flex items-center justify-center">
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-foreground/20 border-t-transparent animate-spin mx-auto mb-2 rounded-full"></div>
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const activeGoals = getGoalsByStatus('in-progress')
  const overdue = getOverdueGoals()
  const upcoming = getUpcomingDeadlines(7)
  
  // Get top 3 active goals by priority
  const topGoals = activeGoals
    .sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
    .slice(0, 3)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600'
      case 'high': return 'text-orange-500'
      case 'medium': return 'text-blue-500'
      case 'low': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="neo-card flex flex-col w-full h-full">
      <div className="p-6 border-b border-border flex-shrink-0">
        <div className="flex items-center space-x-3">
          <Target className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-bold text-foreground">
            Goals
          </h3>
        </div>
      </div>

      <div className="p-6 flex-grow flex flex-col overflow-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {statistics.byStatus.completed || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Completed
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {activeGoals.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Active
            </div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${overdue.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
              {overdue.length}
            </div>
            <div className="text-xs text-muted-foreground">
              Overdue
            </div>
          </div>
        </div>
        
        {/* Progress Overview */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Overall Progress</span>
            <span>{Math.round(statistics.averageProgress)}%</span>
          </div>
          <div className="w-full h-2 bg-background rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${statistics.averageProgress}%` }}
            ></div>
          </div>
        </div>

        {/* Active Goals */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground mb-3">
            Active Goals
          </h4>

          {topGoals.length === 0 ? (
            <div className="text-center py-6">
              <Target className="h-8 w-8 mx-auto mb-2 text-orange-500 opacity-50" />
              <p className="text-sm text-muted-foreground mb-2">
                No active goals
              </p>
              <button
                className="neo-button text-xs px-4 py-2"
                onClick={onViewAll}
              >
                Create Goal
              </button>
            </div>
          ) : (
            topGoals.map(goal => (
              <div key={goal.id} className="neo-card p-3 cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm truncate">
                      {goal.title}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>Due {format(new Date(goal.endDate), 'MMM d')}</span>
                      <span className={`font-semibold ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-blue-600">
                    {goal.progress}%
                  </div>
                </div>
                <div className="w-full h-1 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Upcoming Deadlines Alert */}
        {upcoming.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center space-x-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-foreground">
                {upcoming.length} deadline{upcoming.length > 1 ? 's' : ''} this week
              </span>
            </div>
          </div>
        )}

        {/* Navigate to full view */}
        {onViewAll && (
          <div className="flex justify-center pt-4 border-t border-border mt-4">
            <button
              className="neo-button text-xs px-3 py-1"
              onClick={onViewAll}
              title="View All Goals"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default GoalsWidget