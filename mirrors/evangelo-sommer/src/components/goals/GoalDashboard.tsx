// src/components/goals/GoalDashboard.tsx
// Comprehensive goal dashboard with analytics and management

"use client"

import React, { useState, useMemo } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { 
  Target, 
  Plus, 
  TrendingUp, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Filter,
  Search,
  Download,
  Upload
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useGoals } from '@/hooks/useGoals'
import { 
  Goal, 
  Milestone, 
  GoalTimeframe, 
  GoalStatus, 
  GoalCategory,
  Priority,
  GOAL_CATEGORIES,
  STATUS_COLORS,
  PRIORITY_COLORS
} from '@/types/goals'
import GoalTimeline from './GoalTimeline'
import GoalCreationModal from './GoalCreationModal'
import { cn } from '@/lib/utils'

interface GoalDashboardProps {
  className?: string
}

type ViewMode = 'overview' | 'timeline' | 'analytics' | 'calendar'
type FilterBy = 'all' | 'timeframe' | 'status' | 'category' | 'priority'

const GoalDashboard: React.FC<GoalDashboardProps> = ({ className }) => {
  const {
    goals,
    milestones,
    statistics,
    isLoading,
    error,
    createGoal,
    updateGoal,
    deleteGoal,
    createMilestone,
    updateProgress,
    getGoalsByTimeframe,
    getGoalsByStatus,
    getOverdueGoals,
    getUpcomingDeadlines,
    getGoalAnalytics,
    searchGoals,
    exportData,
    importData
  } = useGoals()

  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')
  const [filterValue, setFilterValue] = useState<string>('all')
  const [selectedDate, setSelectedDate] = useState(new Date())

  // Filtered goals based on search and filters
  const filteredGoals = useMemo(() => {
    let filtered = goals

    // Apply search
    if (searchQuery.trim()) {
      filtered = searchGoals(searchQuery)
    }

    // Apply filters
    switch (filterBy) {
      case 'timeframe':
        if (filterValue !== 'all') {
          filtered = filtered.filter(goal => goal.timeframe === filterValue)
        }
        break
      case 'status':
        if (filterValue !== 'all') {
          filtered = filtered.filter(goal => goal.status === filterValue)
        }
        break
      case 'category':
        if (filterValue !== 'all') {
          filtered = filtered.filter(goal => goal.category === filterValue)
        }
        break
      case 'priority':
        if (filterValue !== 'all') {
          filtered = filtered.filter(goal => goal.priority === filterValue)
        }
        break
    }

    return filtered
  }, [goals, searchQuery, filterBy, filterValue, searchGoals])

  // Quick stats
  const quickStats = useMemo(() => {
    const overdue = getOverdueGoals()
    const upcoming = getUpcomingDeadlines(7)
    const inProgress = getGoalsByStatus('in-progress')
    
    return {
      total: goals.length,
      inProgress: inProgress.length,
      completed: statistics.byStatus.completed,
      overdue: overdue.length,
      upcoming: upcoming.length,
      averageProgress: statistics.averageProgress
    }
  }, [goals, statistics, getOverdueGoals, getUpcomingDeadlines, getGoalsByStatus])

  // Handle goal creation
  const handleCreateGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createGoal(goalData)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to create goal:', error)
    }
  }

  // Handle goal edit
  const handleEditGoal = async (goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!editingGoal) return
    
    try {
      await updateGoal(editingGoal.id, goalData)
      setEditingGoal(null)
      setShowCreateModal(false)
    } catch (error) {
      console.error('Failed to update goal:', error)
    }
  }

  // Handle progress update
  const handleProgressUpdate = async (goalId: string, progress: number) => {
    try {
      await updateProgress(goalId, progress)
    } catch (error) {
      console.error('Failed to update progress:', error)
    }
  }

  // Handle export
  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `goals-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Handle import
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        await importData(data)
      } catch (error) {
        console.error('Failed to import data:', error)
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Clear input
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground font-primary uppercase tracking-wide">Loading Goals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6 p-6", className)}>
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="neo-button font-primary text-sm uppercase tracking-wide flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            EXPORT
          </button>

          <label>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button className="neo-button font-primary text-sm uppercase tracking-wide flex items-center gap-2">
              <Upload className="w-4 h-4" />
              IMPORT
            </button>
          </label>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="neo-button-active font-primary text-sm uppercase tracking-wide flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          NEW GOAL
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-foreground font-primary">{quickStats.total}</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">Total Goals</div>
        </div>

        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-accent font-primary">{quickStats.inProgress}</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">In Progress</div>
        </div>

        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-green-600 font-primary">{quickStats.completed}</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">Completed</div>
        </div>

        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-red-600 font-primary">{quickStats.overdue}</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">Overdue</div>
        </div>

        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-yellow-600 font-primary">{quickStats.upcoming}</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">Due Soon</div>
        </div>

        <div className="neo-card p-4">
          <div className="text-2xl font-bold text-accent font-primary">{quickStats.averageProgress}%</div>
          <div className="text-sm text-muted-foreground font-primary uppercase tracking-wide">Avg Progress</div>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex space-x-1 neo-card p-1">
          <button
            onClick={() => setViewMode('overview')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-primary uppercase tracking-wide transition-colors",
              viewMode === 'overview'
                ? "neo-button-active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            OVERVIEW
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-primary uppercase tracking-wide transition-colors",
              viewMode === 'timeline'
                ? "neo-button-active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Calendar className="w-4 h-4" />
            TIMELINE
          </button>
          <button
            onClick={() => setViewMode('analytics')}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium font-primary uppercase tracking-wide transition-colors",
              viewMode === 'analytics'
                ? "neo-button-active"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <TrendingUp className="w-4 h-4" />
            ANALYTICS
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search goals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neomorphic-input pl-9 pr-3 py-2 text-sm font-primary"
            />
          </div>

          <select
            value={filterBy}
            onChange={(e) => {
              setFilterBy(e.target.value as FilterBy)
              setFilterValue('all')
            }}
            className="neomorphic-input px-3 py-2 text-sm font-primary uppercase tracking-wide"
          >
            <option value="all">All Goals</option>
            <option value="timeframe">By Timeframe</option>
            <option value="status">By Status</option>
            <option value="category">By Category</option>
            <option value="priority">By Priority</option>
          </select>

          {filterBy !== 'all' && (
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="neomorphic-input px-3 py-2 text-sm font-primary uppercase tracking-wide"
            >
              <option value="all">All</option>
              {filterBy === 'timeframe' && (
                <>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom</option>
                </>
              )}
              {filterBy === 'status' && (
                <>
                  <option value="not-started">Not Started</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                  <option value="paused">Paused</option>
                  <option value="cancelled">Cancelled</option>
                </>
              )}
              {filterBy === 'category' && (
                GOAL_CATEGORIES.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))
              )}
              {filterBy === 'priority' && (
                <>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </>
              )}
            </select>
          )}
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="neo-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-primary font-bold text-foreground uppercase tracking-wide">
                  GOALS ({filteredGoals.length})
                </h2>
                {error && (
                  <Badge variant="destructive" className="text-xs uppercase">
                    Error: {error}
                  </Badge>
                )}
              </div>

              {filteredGoals.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-muted mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-2 font-primary uppercase tracking-wide">
                    No goals found
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="neo-button-active font-primary text-sm uppercase tracking-wide flex items-center gap-2 mx-auto mt-4"
                  >
                    CREATE YOUR FIRST GOAL
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredGoals.map(goal => (
                    <div
                      key={goal.id}
                      className="neo-card p-4 hover:bg-card/80 transition-colors cursor-pointer"
                      onClick={() => {
                        setEditingGoal(goal)
                        setShowCreateModal(true)
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground mb-1 font-primary">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mb-2 font-primary">{goal.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            style={{ backgroundColor: `${STATUS_COLORS[goal.status]}20`, color: STATUS_COLORS[goal.status] }}
                            className="uppercase text-xs font-bold"
                          >
                            {goal.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            style={{ borderColor: PRIORITY_COLORS[goal.priority], color: PRIORITY_COLORS[goal.priority] }}
                            className="uppercase text-xs font-bold"
                          >
                            {goal.priority}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground font-primary uppercase tracking-wide">Progress</span>
                          <span className="font-medium text-foreground font-primary">{goal.progress}%</span>
                        </div>
                        <Progress value={goal.progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground font-primary uppercase tracking-wide">
                        <div className="flex items-center gap-4">
                          <span className="capitalize">{goal.timeframe}</span>
                          <span>{GOAL_CATEGORIES.find(c => c.value === goal.category)?.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Due {format(new Date(goal.endDate), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      {goal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {goal.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs uppercase font-bold">
                              {tag}
                            </Badge>
                          ))}
                          {goal.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs uppercase font-bold">
                              +{goal.tags.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Upcoming Deadlines */}
            <div className="neo-card p-6">
              <h2 className="flex items-center gap-2 font-primary font-bold text-foreground uppercase tracking-wide mb-4">
                <Clock className="w-5 h-5 text-accent" />
                UPCOMING DEADLINES
              </h2>
              <div className="space-y-2">
                {getUpcomingDeadlines(7).slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground font-primary">{item.title}</p>
                      <p className="text-xs text-muted-foreground font-primary uppercase tracking-wide">
                        Due {format(new Date('endDate' in item ? item.endDate : item.dueDate), 'MMM d')}
                      </p>
                    </div>
                    {'goalId' in item ? (
                      <Badge variant="outline" className="text-xs uppercase font-bold">
                        Milestone
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs uppercase font-bold">
                        Goal
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue Goals */}
            {quickStats.overdue > 0 && (
              <div className="neo-card p-6 border-l-4 border-l-red-600">
                <h2 className="flex items-center gap-2 font-primary font-bold text-red-600 uppercase tracking-wide mb-4">
                  <AlertTriangle className="w-5 h-5" />
                  OVERDUE GOALS
                </h2>
                <div className="space-y-2">
                  {getOverdueGoals().slice(0, 5).map(goal => (
                    <div key={goal.id} className="py-2 border-b border-border last:border-0">
                      <p className="text-sm font-medium text-foreground font-primary">{goal.title}</p>
                      <p className="text-xs text-red-500 font-primary uppercase tracking-wide">
                        Due {format(new Date(goal.endDate), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Progress */}
            <div className="neo-card p-6">
              <h2 className="flex items-center gap-2 font-primary font-bold text-foreground uppercase tracking-wide mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                RECENT PROGRESS
              </h2>
              <div className="space-y-2">
                {goals
                  .filter(goal => goal.lastProgressUpdate)
                  .sort((a, b) => new Date(b.lastProgressUpdate!).getTime() - new Date(a.lastProgressUpdate!).getTime())
                  .slice(0, 5)
                  .map(goal => (
                    <div key={goal.id} className="py-2 border-b border-border last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground font-primary">{goal.title}</p>
                        <span className="text-sm font-bold text-green-600 font-primary">{goal.progress}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-primary uppercase tracking-wide">
                        Updated {format(new Date(goal.lastProgressUpdate!), 'MMM d')}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'timeline' && (
        <GoalTimeline
          goals={filteredGoals}
          milestones={milestones}
          viewType="month"
          selectedDate={selectedDate}
          onGoalClick={(goal) => {
            setEditingGoal(goal)
            setShowCreateModal(true)
          }}
          onDateChange={setSelectedDate}
        />
      )}

      {viewMode === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="neo-card p-6">
            <h2 className="font-primary font-bold text-foreground uppercase tracking-wide mb-6">
              GOAL PROGRESS DISTRIBUTION
            </h2>
            <div className="space-y-4">
              {Object.entries(statistics.byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[status as GoalStatus] }}
                    />
                    <span className="text-sm capitalize text-muted-foreground font-primary uppercase tracking-wide">
                      {status.replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground font-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="neo-card p-6">
            <h2 className="font-primary font-bold text-foreground uppercase tracking-wide mb-6">
              GOALS BY TIMEFRAME
            </h2>
            <div className="space-y-4">
              {Object.entries(statistics.byTimeframe).map(([timeframe, count]) => (
                <div key={timeframe} className="flex items-center justify-between">
                  <span className="text-sm capitalize text-muted-foreground font-primary uppercase tracking-wide">
                    {timeframe}
                  </span>
                  <span className="text-sm font-medium text-foreground font-primary">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Goal Creation/Edit Modal */}
      <GoalCreationModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingGoal(null)
        }}
        onSave={editingGoal ? handleEditGoal : handleCreateGoal}
        editingGoal={editingGoal || undefined}
      />
    </div>
  )
}

export default GoalDashboard