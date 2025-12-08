"use client"

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Target, Plus, Check, X, Edit3, Trash2, Flag,
  GripVertical, Wand2, Loader2, Lightbulb, Brain,
  ArrowUpDown, Clock, Zap, Calendar, Bell, Tag, Info,
  User, MapPin, Hash, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MissionObjective {
  id: string
  text: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  completed: boolean
  createdAt: Date
  completedAt?: Date
  estimatedMinutes?: number
  position?: number
  dueDate?: Date
  dueTime?: string
  hasNotification?: boolean
  notificationMinutes?: number
  category?: string
  tags?: string[]
}

interface MissionObjectivesProps {
  date: Date
  onObjectiveComplete?: (objective: MissionObjective) => void
  onObjectiveCreate?: (objective: Omit<MissionObjective, 'id' | 'createdAt'>) => void
}

interface DragState {
  isDragging: boolean
  draggedId: string | null
  dragOverId: string | null
}

const EnhancedMissionObjectives: React.FC<MissionObjectivesProps> = ({
  date,
  onObjectiveComplete,
  onObjectiveCreate
}) => {
  const [objectives, setObjectives] = useState<MissionObjective[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null)
  const [editTime, setEditTime] = useState('')
  const [showInfoId, setShowInfoId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    text: '',
    priority: 'medium' as MissionObjective['priority'],
    estimatedMinutes: undefined as number | undefined,
    dueDate: '',
    dueTime: '',
    hasNotification: false,
    notificationMinutes: 15,
    category: '',
    tags: [] as string[]
  })
  const [isAISorting, setIsAISorting] = useState(false)
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedId: null,
    dragOverId: null
  })

  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)
  const editTimeInputRef = useRef<HTMLInputElement>(null)

  // Load objectives from localStorage on mount
  useEffect(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const stored = localStorage.getItem(`mission-objectives-${dateKey}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const objectivesWithPositions = parsed.map((obj: any, index: number) => ({
          ...obj,
          createdAt: new Date(obj.createdAt),
          completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined,
          position: obj.position ?? index
        }))
        // Sort by position
        objectivesWithPositions.sort((a: MissionObjective, b: MissionObjective) => (a.position || 0) - (b.position || 0))
        setObjectives(objectivesWithPositions)
      } catch (error) {
        console.warn('Failed to parse stored objectives:', error)
      }
    }
  }, [date])

  // Save objectives to localStorage whenever they change
  useEffect(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    localStorage.setItem(`mission-objectives-${dateKey}`, JSON.stringify(objectives))
  }, [objectives, date])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  // Focus time edit input when time editing starts
  useEffect(() => {
    if (editingTimeId && editTimeInputRef.current) {
      editTimeInputRef.current.focus()
      editTimeInputRef.current.select()
    }
  }, [editingTimeId])

  const getPriorityColor = (priority: MissionObjective['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-900/30 text-red-200 border-l-red-500'
      case 'high':
        return 'bg-orange-900/30 text-orange-200 border-l-orange-500'
      case 'medium':
        return 'bg-tactical-gold/20 text-tactical-gold-light border-l-tactical-gold'
      case 'low':
        return 'bg-green-900/30 text-green-200 border-l-green-500'
      default:
        return 'bg-tactical-grey-800/30 text-tactical-grey-200 border-l-gray-500'
    }
  }

  const detectPriority = (text: string): MissionObjective['priority'] => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('urgent') || lowerText.includes('emergency') || lowerText.includes('asap')) {
      return 'urgent'
    }
    if (lowerText.includes('important') || lowerText.includes('high') || lowerText.includes('critical')) {
      return 'high'
    }
    if (lowerText.includes('low') || lowerText.includes('later') || lowerText.includes('when possible')) {
      return 'low'
    }
    return 'medium'
  }

  const extractTimeEstimate = (text: string): number | undefined => {
    const timePatterns = [
      /(\d+)\s*(?:minutes?|mins?)/i,
      /(\d+)\s*(?:hours?|hrs?)/i,
      /(\d+)h/i,
      /(\d+)m/i
    ]

    for (const pattern of timePatterns) {
      const match = text.match(pattern)
      if (match) {
        const value = parseInt(match[1])
        if (pattern.source.includes('hour') || pattern.source.includes('h')) {
          return value * 60
        }
        return value
      }
    }
    return undefined
  }

  const extractDueDate = (text: string): { dueDate?: Date; dueTime?: string } => {
    const result: { dueDate?: Date; dueTime?: string } = {}

    // Extract time patterns
    const timeMatch = text.match(/(?:at|by)\s+(\d{1,2}:\d{2}(?:\s*[ap]m)?)/i)
    if (timeMatch) {
      result.dueTime = timeMatch[1]
    }

    // Extract date patterns
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)

    if (text.match(/\btoday\b/i)) {
      result.dueDate = today
    } else if (text.match(/\btomorrow\b/i)) {
      result.dueDate = tomorrow
    } else if (text.match(/\bnext week\b/i)) {
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      result.dueDate = nextWeek
    }

    return result
  }

  const extractCategory = (text: string): string | undefined => {
    const categoryPatterns = [
      /#(\w+)/,  // hashtag style: #work
      /\[(\w+)\]/, // bracket style: [work]
      /category:\s*(\w+)/i // explicit: category: work
    ]

    for (const pattern of categoryPatterns) {
      const match = text.match(pattern)
      if (match) {
        return match[1].toLowerCase()
      }
    }
    return undefined
  }

  const hasNotificationKeywords = (text: string): boolean => {
    return /\b(?:remind|notification|notify|alert)\b/i.test(text)
  }

  const handleQuickAdd = () => {
    if (!quickInput.trim()) return

    const dueDateInfo = extractDueDate(quickInput)
    const category = extractCategory(quickInput)
    const hasNotification = hasNotificationKeywords(quickInput)

    const newObjective: MissionObjective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: quickInput.trim(),
      priority: detectPriority(quickInput),
      completed: false,
      createdAt: new Date(),
      estimatedMinutes: extractTimeEstimate(quickInput),
      position: objectives.filter(obj => !obj.completed).length,
      dueDate: dueDateInfo.dueDate,
      dueTime: dueDateInfo.dueTime,
      category,
      hasNotification,
      notificationMinutes: hasNotification ? 15 : undefined
    }

    setObjectives(prev => [newObjective, ...prev])
    setQuickInput('')

    if (onObjectiveCreate) {
      onObjectiveCreate(newObjective)
    }

    // Refocus input
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }, 0)
  }

  const handleToggleComplete = (id: string) => {
    setObjectives(prev => prev.map(obj => {
      if (obj.id === id) {
        const updated = {
          ...obj,
          completed: !obj.completed,
          completedAt: !obj.completed ? new Date() : undefined
        }
        if (onObjectiveComplete) {
          onObjectiveComplete(updated)
        }
        return updated
      }
      return obj
    }))
  }

  const handleDelete = (id: string) => {
    setObjectives(prev => prev.filter(obj => obj.id !== id))
  }

  const handleEdit = (id: string, objective: MissionObjective) => {
    setEditingId(id)
    setEditForm({
      text: objective.text,
      priority: objective.priority,
      estimatedMinutes: objective.estimatedMinutes,
      dueDate: objective.dueDate ? format(objective.dueDate, 'yyyy-MM-dd') : '',
      dueTime: objective.dueTime || '',
      hasNotification: objective.hasNotification || false,
      notificationMinutes: objective.notificationMinutes || 15,
      category: objective.category || '',
      tags: objective.tags || []
    })
  }

  const handleSaveEdit = () => {
    if (!editingId || !editForm.text.trim()) return

    setObjectives(prev => prev.map(obj => {
      if (obj.id === editingId) {
        return {
          ...obj,
          text: editForm.text.trim(),
          priority: editForm.priority,
          estimatedMinutes: editForm.estimatedMinutes,
          dueDate: editForm.dueDate ? new Date(editForm.dueDate + (editForm.dueTime ? `T${editForm.dueTime}` : 'T00:00')) : undefined,
          dueTime: editForm.dueTime,
          hasNotification: editForm.hasNotification,
          notificationMinutes: editForm.notificationMinutes,
          category: editForm.category,
          tags: editForm.tags
        }
      }
      return obj
    }))

    setEditingId(null)
    setEditForm({
      text: '',
      priority: 'medium',
      estimatedMinutes: undefined,
      dueDate: '',
      dueTime: '',
      hasNotification: false,
      notificationMinutes: 15,
      category: '',
      tags: []
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditForm({
      text: '',
      priority: 'medium',
      estimatedMinutes: undefined,
      dueDate: '',
      dueTime: '',
      hasNotification: false,
      notificationMinutes: 15,
      category: '',
      tags: []
    })
  }

  const handleTimeEdit = (id: string, currentMinutes?: number) => {
    setEditingTimeId(id)
    setEditTime(currentMinutes ? currentMinutes.toString() : '')
  }

  const handleSaveTimeEdit = () => {
    if (!editingTimeId || !editTime.trim()) return

    const minutes = parseInt(editTime)
    if (isNaN(minutes) || minutes <= 0) {
      setEditingTimeId(null)
      setEditTime('')
      return
    }

    setObjectives(prev => prev.map(obj => {
      if (obj.id === editingTimeId) {
        return {
          ...obj,
          estimatedMinutes: minutes
        }
      }
      return obj
    }))

    setEditingTimeId(null)
    setEditTime('')
  }

  const handleCancelTimeEdit = () => {
    setEditingTimeId(null)
    setEditTime('')
  }

  const handleShowInfo = (id: string) => {
    setShowInfoId(id)
  }

  const handleCloseInfo = () => {
    setShowInfoId(null)
  }

  const getObjectiveById = (id: string): MissionObjective | undefined => {
    return objectives.find(obj => obj.id === id)
  }

  const formatDuration = (minutes?: number): string => {
    if (!minutes) return 'Not specified'
    if (minutes < 60) return `${minutes} minutes`
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
    return `${hours}h ${remainingMinutes}m`
  }

  const getTimeUntilDue = (dueDate?: Date): string => {
    if (!dueDate) return 'No due date'
    const now = new Date()
    const diff = dueDate.getTime() - now.getTime()

    if (diff < 0) return 'Overdue'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} remaining`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} remaining`
    return 'Due soon'
  }

  const getPriorityDescription = (priority: MissionObjective['priority']): string => {
    switch (priority) {
      case 'urgent': return 'Requires immediate attention'
      case 'high': return 'Important and should be done soon'
      case 'medium': return 'Normal priority task'
      case 'low': return 'Can be done when time permits'
      default: return 'Standard priority'
    }
  }

  // AI Sorting
  const handleAISort = async () => {
    const incompleteObjectives = objectives.filter(obj => !obj.completed)
    if (incompleteObjectives.length <= 1) return

    setIsAISorting(true)
    try {
      const response = await fetch('/api/ai/objectives/sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectives: incompleteObjectives,
          context: `Current time: ${format(date, 'EEEE, MMMM do, yyyy')}`,
          sortingStrategy: 'smart'
        })
      })

      if (!response.ok) throw new Error('Failed to sort objectives')

      const result = await response.json()

      // Apply the new sorting
      const completedObjectives = objectives.filter(obj => obj.completed)
      const sortedIncomplete = result.sortedObjectives.map((sortItem: any) => {
        const objective = incompleteObjectives.find(obj => obj.id === sortItem.id)
        return { ...objective, position: sortItem.newPosition }
      }).sort((a: any, b: any) => (a.position || 0) - (b.position || 0))

      setObjectives([...sortedIncomplete, ...completedObjectives])

      // Show brief explanation
      console.log('AI Sorting Result:', result.explanation)
    } catch (error) {
      console.error('AI sorting failed:', error)
      // Fallback to priority sorting
      const completed = objectives.filter(obj => obj.completed)
      const incomplete = objectives.filter(obj => !obj.completed)
        .sort((a, b) => {
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        })
        .map((obj, index) => ({ ...obj, position: index }))

      setObjectives([...incomplete, ...completed])
    } finally {
      setIsAISorting(false)
    }
  }

  // AI Suggestions
  const handleGenerateSuggestions = async () => {
    setIsGeneratingSuggestions(true)
    try {
      const currentTexts = objectives.filter(obj => !obj.completed).map(obj => obj.text)
      const response = await fetch('/api/ai/objectives/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objectives: currentTexts,
          context: `Current time: ${format(date, 'EEEE, MMMM do, yyyy')}`
        })
      })

      if (!response.ok) throw new Error('Failed to generate suggestions')

      const result = await response.json()
      setSuggestions(result.suggestions)
      setShowSuggestions(true)
    } catch (error) {
      console.error('AI suggestions failed:', error)
      setSuggestions([
        'Review and prioritize email inbox',
        'Take a 10-minute break and stretch',
        'Plan tomorrow\'s priorities'
      ])
      setShowSuggestions(true)
    } finally {
      setIsGeneratingSuggestions(false)
    }
  }

  const handleAddSuggestion = (suggestion: string) => {
    const newObjective: MissionObjective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: suggestion,
      priority: detectPriority(suggestion),
      completed: false,
      createdAt: new Date(),
      estimatedMinutes: extractTimeEstimate(suggestion),
      position: objectives.filter(obj => !obj.completed).length
    }

    setObjectives(prev => [newObjective, ...prev])
    setSuggestions(prev => prev.filter(s => s !== suggestion))
  }

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDragState({
      isDragging: true,
      draggedId: id,
      dragOverId: null
    })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    setDragState(prev => ({ ...prev, dragOverId: id }))
  }

  const handleDragLeave = () => {
    setDragState(prev => ({ ...prev, dragOverId: null }))
  }

  const handleDrop = (e: React.DragEvent, dropId: string) => {
    e.preventDefault()
    const { draggedId } = dragState

    if (!draggedId || draggedId === dropId) {
      setDragState({ isDragging: false, draggedId: null, dragOverId: null })
      return
    }

    const incompleteObjectives = objectives.filter(obj => !obj.completed)
    const completedObjectives = objectives.filter(obj => obj.completed)

    const draggedIndex = incompleteObjectives.findIndex(obj => obj.id === draggedId)
    const dropIndex = incompleteObjectives.findIndex(obj => obj.id === dropId)

    if (draggedIndex === -1 || dropIndex === -1) return

    const newIncomplete = [...incompleteObjectives]
    const [draggedItem] = newIncomplete.splice(draggedIndex, 1)
    newIncomplete.splice(dropIndex, 0, draggedItem)

    // Update positions
    const reorderedIncomplete = newIncomplete.map((obj, index) => ({
      ...obj,
      position: index
    }))

    setObjectives([...reorderedIncomplete, ...completedObjectives])
    setDragState({ isDragging: false, draggedId: null, dragOverId: null })
  }

  const handleDragEnd = () => {
    setDragState({ isDragging: false, draggedId: null, dragOverId: null })
  }

  const completedObjectives = objectives.filter(obj => obj.completed)
  const pendingObjectives = objectives.filter(obj => !obj.completed)

  // Task Information Modal Component
  const TaskInfoModal = ({ objective }: { objective: MissionObjective }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-hud-background-primary border-2 border-tactical-gold rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-hud-border">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Info className="w-6 h-6 text-tactical-gold" />
                <h2 className="text-xl font-bold text-hud-text-primary font-primary">
                  Task Information
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getPriorityColor(objective.priority)} text-xs font-bold uppercase`}>
                  {objective.priority}
                </Badge>
                {objective.completed && (
                  <Badge className="bg-green-900/30 text-green-300 text-xs font-bold uppercase">
                    Completed
                  </Badge>
                )}
              </div>
            </div>
            <Button
              onClick={handleCloseInfo}
              variant="outline"
              size="sm"
              className="border-hud-border hover:bg-hud-background-secondary"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Task Description */}
          <div>
            <h3 className="text-lg font-semibold text-hud-text-primary mb-2 flex items-center gap-2">
              <Hash className="w-4 h-4 text-tactical-gold" />
              Description
            </h3>
            <p className="text-hud-text-primary font-interface bg-hud-background-secondary p-4 rounded border border-hud-border">
              {objective.text}
            </p>
          </div>

          {/* Priority & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <Flag className="w-3 h-3" />
                Priority Level
              </h4>
              <div className="space-y-1">
                <Badge className={`${getPriorityColor(objective.priority)} text-sm font-bold uppercase`}>
                  {objective.priority}
                </Badge>
                <p className="text-xs text-tactical-grey-400">
                  {getPriorityDescription(objective.priority)}
                </p>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Status
              </h4>
              <div className="space-y-1">
                <Badge className={objective.completed ? 'bg-green-900/30 text-green-300' : 'bg-tactical-gold/20 text-tactical-gold-light'}>
                  {objective.completed ? 'Completed' : 'Active'}
                </Badge>
                {objective.completed && objective.completedAt && (
                  <p className="text-xs text-tactical-grey-400">
                    Completed on {format(objective.completedAt, 'MMM d, yyyy \\at h:mm a')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Time Estimate
              </h4>
              <p className="text-hud-text-primary">{formatDuration(objective.estimatedMinutes)}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Due Date
              </h4>
              {objective.dueDate ? (
                <div className="space-y-1">
                  <p className="text-hud-text-primary">
                    {format(objective.dueDate, 'EEEE, MMMM do, yyyy')}
                    {objective.dueTime && ` at ${objective.dueTime}`}
                  </p>
                  <p className="text-xs text-tactical-gold">
                    {getTimeUntilDue(objective.dueDate)}
                  </p>
                </div>
              ) : (
                <p className="text-tactical-grey-400">No due date set</p>
              )}
            </div>
          </div>

          {/* Category and Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Category
              </h4>
              {objective.category ? (
                <Badge className="bg-blue-900/30 text-blue-300">
                  {objective.category}
                </Badge>
              ) : (
                <p className="text-tactical-grey-400 text-sm">No category assigned</p>
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
                <Bell className="w-3 h-3" />
                Notifications
              </h4>
              {objective.hasNotification ? (
                <div className="space-y-1">
                  <Badge className="bg-yellow-900/30 text-yellow-300">
                    Enabled
                  </Badge>
                  <p className="text-xs text-tactical-grey-400">
                    Remind {objective.notificationMinutes} minutes before due time
                  </p>
                </div>
              ) : (
                <p className="text-tactical-grey-400 text-sm">No notifications set</p>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div>
            <h4 className="text-sm font-semibold text-tactical-grey-300 mb-2 flex items-center gap-1">
              <User className="w-3 h-3" />
              Timeline
            </h4>
            <div className="bg-hud-background-secondary p-4 rounded border border-hud-border space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-tactical-grey-400">Created:</span>
                <span className="text-hud-text-primary">
                  {format(objective.createdAt, 'MMM d, yyyy \\at h:mm a')}
                </span>
              </div>
              {objective.completedAt && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-tactical-grey-400">Completed:</span>
                  <span className="text-green-300">
                    {format(objective.completedAt, 'MMM d, yyyy \\at h:mm a')}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-tactical-grey-400">Task ID:</span>
                <span className="text-tactical-grey-300 font-mono text-xs">
                  {objective.id}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-hud-border">
            <Button
              onClick={() => {
                handleCloseInfo()
                handleEdit(objective.id, objective)
              }}
              className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light flex-1"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit Task
            </Button>
            <Button
              onClick={() => handleToggleComplete(objective.id)}
              variant="outline"
              className="border-hud-border hover:bg-hud-background-secondary flex-1"
            >
              {objective.completed ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Mark Incomplete
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
            <Button
              onClick={() => {
                handleDelete(objective.id)
                handleCloseInfo()
              }}
              variant="outline"
              className="border-red-500 text-red-400 hover:bg-red-900/30 hover:border-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-hud-background-secondary p-6 border-b-2 border-hud-border-accent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-6 h-6 text-tactical-gold" />
            <div>
              <h1 className="text-2xl font-bold text-hud-text-primary font-primary">
                Mission Objectives
              </h1>
              <p className="text-tactical-grey-300 font-interface">
                {format(date, 'EEEE, MMMM do, yyyy')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-tactical-gold font-bold text-lg">
              {completedObjectives.length}/{objectives.length}
            </div>
            <div className="text-xs text-tactical-grey-300">
              objectives completed
            </div>
          </div>
        </div>
      </div>

      {/* Quick Task Input */}
      <div className="bg-hud-background-secondary p-6 border border-hud-border rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Flag className="w-5 h-5 text-tactical-gold" />
          <h2 className="text-lg font-semibold text-hud-text-primary font-primary">
            Quick Task Entry
          </h2>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            ref={inputRef}
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleQuickAdd()
              }
            }}
            placeholder="Type your objective... (auto-detects priority and time estimates)"
            className="flex-1 bg-hud-background border border-hud-border rounded px-4 py-3 text-hud-text-primary placeholder-tactical-grey-400 focus:outline-none focus:border-tactical-gold font-interface"
          />
          <Button
            onClick={handleQuickAdd}
            disabled={!quickInput.trim()}
            className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light disabled:bg-tactical-grey-500 px-6"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* AI Actions */}
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={handleAISort}
            disabled={isAISorting || pendingObjectives.length <= 1}
            variant="outline"
            className="border-hud-border hover:bg-hud-background-secondary"
          >
            {isAISorting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Brain className="w-4 h-4 mr-2" />
            )}
            AI Smart Sort
          </Button>

          <Button
            onClick={handleGenerateSuggestions}
            disabled={isGeneratingSuggestions}
            variant="outline"
            className="border-hud-border hover:bg-hud-background-secondary"
          >
            {isGeneratingSuggestions ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            AI Suggestions
          </Button>
        </div>

        <div className="mt-3 text-xs text-tactical-grey-400 font-interface">
          <strong>Smart Parsing:</strong> Use "urgent/important" for priority, "30 minutes/2 hours" for time, "today/tomorrow" for dates, "at 3:00pm" for time, "#work" for categories, "remind me" for notifications
        </div>
      </div>

      {/* AI Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="bg-hud-background-secondary p-6 border border-hud-border rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-hud-text-primary font-primary flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-tactical-gold" />
              AI Suggestions
            </h3>
            <Button
              onClick={() => setShowSuggestions(false)}
              variant="outline"
              size="sm"
              className="border-hud-border"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-hud-background border border-hud-border rounded"
              >
                <span className="text-hud-text-primary font-interface flex-1">
                  {suggestion}
                </span>
                <Button
                  onClick={() => handleAddSuggestion(suggestion)}
                  size="sm"
                  className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light ml-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Objectives */}
      {pendingObjectives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-hud-text-primary font-primary flex items-center gap-2">
            <Target className="w-5 h-5 text-tactical-gold" />
            Active Objectives ({pendingObjectives.length})
          </h3>

          {pendingObjectives.map((objective) => (
            <Card
              key={objective.id}
              className={`border-l-4 ${getPriorityColor(objective.priority)} bg-hud-background-secondary border-hud-border transition-all duration-200 ${
                dragState.dragOverId === objective.id ? 'ring-2 ring-tactical-gold' : ''
              } ${dragState.draggedId === objective.id ? 'opacity-50' : ''}`}
              draggable={!editingId}
              onDragStart={(e) => handleDragStart(e, objective.id)}
              onDragOver={(e) => handleDragOver(e, objective.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, objective.id)}
              onDragEnd={handleDragEnd}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Drag Handle */}
                    <div className="cursor-grab active:cursor-grabbing mt-1">
                      <GripVertical className="w-4 h-4 text-tactical-grey-400" />
                    </div>

                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComplete(objective.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-tactical-grey-400 hover:border-tactical-gold flex items-center justify-center transition-colors"
                    >
                      {objective.completed && <Check className="w-3 h-3 text-tactical-gold" />}
                    </button>

                    <div className="flex-1">
                      {editingId === objective.id ? (
                        <div className="space-y-4 p-4 bg-hud-background border border-hud-border rounded-lg">
                          {/* Text Input */}
                          <div>
                            <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Task Description</label>
                            <input
                              ref={editInputRef}
                              type="text"
                              value={editForm.text}
                              onChange={(e) => setEditForm(prev => ({ ...prev, text: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  handleSaveEdit()
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit()
                                }
                              }}
                              className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                              placeholder="Enter task description"
                            />
                          </div>

                          {/* Priority and Time Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Priority</label>
                              <select
                                value={editForm.priority}
                                onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value as MissionObjective['priority'] }))}
                                className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Estimated Time (min)</label>
                              <input
                                type="number"
                                value={editForm.estimatedMinutes || ''}
                                onChange={(e) => setEditForm(prev => ({ ...prev, estimatedMinutes: e.target.value ? parseInt(e.target.value) : undefined }))}
                                className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                                placeholder="15"
                                min="1"
                                max="1440"
                              />
                            </div>
                          </div>

                          {/* Due Date and Time Row */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Due Date</label>
                              <input
                                type="date"
                                value={editForm.dueDate}
                                onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                                className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Due Time</label>
                              <input
                                type="time"
                                value={editForm.dueTime}
                                onChange={(e) => setEditForm(prev => ({ ...prev, dueTime: e.target.value }))}
                                className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                              />
                            </div>
                          </div>

                          {/* Notification Settings */}
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <input
                                type="checkbox"
                                id={`notification-${objective.id}`}
                                checked={editForm.hasNotification}
                                onChange={(e) => setEditForm(prev => ({ ...prev, hasNotification: e.target.checked }))}
                                className="w-4 h-4 text-tactical-gold bg-hud-background-secondary border-hud-border rounded focus:ring-tactical-gold focus:ring-2"
                              />
                              <label htmlFor={`notification-${objective.id}`} className="text-xs font-semibold text-tactical-grey-300 flex items-center gap-1">
                                <Bell className="w-3 h-3" />
                                Enable Notification
                              </label>
                            </div>
                            {editForm.hasNotification && (
                              <div className="ml-6">
                                <label className="block text-xs text-tactical-grey-400 mb-1">Notify me (minutes before)</label>
                                <select
                                  value={editForm.notificationMinutes}
                                  onChange={(e) => setEditForm(prev => ({ ...prev, notificationMinutes: parseInt(e.target.value) }))}
                                  className="w-32 bg-hud-background-secondary border border-hud-border rounded px-2 py-1 text-hud-text-primary font-interface text-xs focus:outline-none focus:border-tactical-gold"
                                >
                                  <option value={5}>5 min</option>
                                  <option value={10}>10 min</option>
                                  <option value={15}>15 min</option>
                                  <option value={30}>30 min</option>
                                  <option value={60}>1 hour</option>
                                  <option value={120}>2 hours</option>
                                  <option value={1440}>1 day</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-xs font-semibold text-tactical-grey-300 mb-1">Category</label>
                            <input
                              type="text"
                              value={editForm.category}
                              onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                              className="w-full bg-hud-background-secondary border border-hud-border rounded px-3 py-2 text-hud-text-primary font-interface focus:outline-none focus:border-tactical-gold"
                              placeholder="Work, Personal, Health, etc."
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              onClick={handleSaveEdit}
                              size="sm"
                              className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light flex-1"
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Save Changes
                            </Button>
                            <Button
                              onClick={handleCancelEdit}
                              size="sm"
                              variant="outline"
                              className="border-hud-border hover:bg-hud-background-secondary flex-1"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p
                            className="text-hud-text-primary font-interface mb-2 cursor-pointer hover:text-tactical-gold transition-colors"
                            onClick={() => handleShowInfo(objective.id)}
                            title="Click to view task details"
                          >
                            {objective.text}
                          </p>

                          <div className="space-y-2">
                            {/* First row: Priority and Time */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={`${getPriorityColor(objective.priority)} text-xs font-bold uppercase`}>
                                {objective.priority}
                              </Badge>

                              {editingTimeId === objective.id ? (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-tactical-grey-400" />
                                  <input
                                    ref={editTimeInputRef}
                                    type="number"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleSaveTimeEdit()
                                      } else if (e.key === 'Escape') {
                                        handleCancelTimeEdit()
                                      }
                                    }}
                                    onBlur={handleSaveTimeEdit}
                                    className="w-16 bg-hud-background border border-hud-border rounded px-1 py-0.5 text-hud-text-primary text-xs font-interface"
                                    min="1"
                                    max="1440"
                                    placeholder="min"
                                  />
                                  <span className="text-xs text-tactical-grey-400">min</span>
                                </div>
                              ) : (
                                <>
                                  {objective.estimatedMinutes ? (
                                    <Badge
                                      className="bg-tactical-grey-800/30 text-tactical-grey-300 text-xs cursor-pointer hover:bg-tactical-grey-700/40 transition-colors"
                                      onClick={() => handleTimeEdit(objective.id, objective.estimatedMinutes)}
                                      title="Click to edit time estimate"
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      ~{objective.estimatedMinutes}min
                                    </Badge>
                                  ) : (
                                    <Badge
                                      className="bg-tactical-grey-800/30 text-tactical-grey-400 text-xs cursor-pointer hover:bg-tactical-grey-700/40 transition-colors border border-dashed border-tactical-grey-500"
                                      onClick={() => handleTimeEdit(objective.id)}
                                      title="Click to add time estimate"
                                    >
                                      <Clock className="w-3 h-3 mr-1" />
                                      Add time
                                    </Badge>
                                  )}
                                </>
                              )}

                              {objective.category && (
                                <Badge className="bg-blue-900/30 text-blue-300 text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {objective.category}
                                </Badge>
                              )}

                              {objective.hasNotification && (
                                <Badge className="bg-yellow-900/30 text-yellow-300 text-xs" title={`Notification ${objective.notificationMinutes} min before`}>
                                  <Bell className="w-3 h-3 mr-1" />
                                  {objective.notificationMinutes}m
                                </Badge>
                              )}
                            </div>

                            {/* Second row: Due date and creation time */}
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                              {objective.dueDate && (
                                <div className="flex items-center gap-1 text-tactical-gold">
                                  <Calendar className="w-3 h-3" />
                                  <span>
                                    Due {format(objective.dueDate, 'MMM d')}
                                    {objective.dueTime && ` at ${objective.dueTime}`}
                                  </span>
                                </div>
                              )}

                              <span className="text-tactical-grey-400">
                                Added {format(objective.createdAt, 'h:mm a')}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId !== objective.id && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleShowInfo(objective.id)}
                        size="sm"
                        variant="outline"
                        className="border-hud-border hover:bg-hud-background-secondary p-2"
                        title="View task details"
                      >
                        <Info className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleEdit(objective.id, objective)}
                        size="sm"
                        variant="outline"
                        className="border-hud-border hover:bg-hud-background-secondary p-2"
                      >
                        <Edit3 className="w-3 h-3" />
                      </Button>
                      <Button
                        onClick={() => handleDelete(objective.id)}
                        size="sm"
                        variant="outline"
                        className="border-hud-border hover:bg-red-900/30 hover:border-red-500 p-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Completed Objectives */}
      {completedObjectives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-tactical-grey-300 font-primary flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            Completed ({completedObjectives.length})
          </h3>

          {completedObjectives.map((objective) => (
            <Card key={objective.id} className="bg-hud-background-secondary/50 border-hud-border opacity-75">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleComplete(objective.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-green-400 bg-green-400 flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-hud-background" />
                    </button>

                    <div className="flex-1">
                      <p
                        className="text-tactical-grey-300 font-interface mb-2 line-through cursor-pointer hover:text-tactical-gold transition-colors"
                        onClick={() => handleShowInfo(objective.id)}
                        title="Click to view task details"
                      >
                        {objective.text}
                      </p>

                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-green-900/30 text-green-300 text-xs font-bold uppercase">
                          Completed
                        </Badge>

                        {objective.completedAt && (
                          <span className="text-xs text-tactical-grey-400">
                            Completed {format(objective.completedAt, 'h:mm a')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleShowInfo(objective.id)}
                    size="sm"
                    variant="outline"
                    className="border-hud-border hover:bg-hud-background-secondary p-2 mr-1"
                    title="View task details"
                  >
                    <Info className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => handleDelete(objective.id)}
                    size="sm"
                    variant="outline"
                    className="border-hud-border hover:bg-red-900/30 hover:border-red-500 p-2"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {objectives.length === 0 && (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-tactical-grey-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-tactical-grey-300 mb-2">
            No objectives set for today
          </h3>
          <p className="text-tactical-grey-400 font-interface mb-4">
            Use the quick task entry above to add your daily objectives
          </p>
          <Button
            onClick={handleGenerateSuggestions}
            disabled={isGeneratingSuggestions}
            className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light"
          >
            {isGeneratingSuggestions ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Lightbulb className="w-4 h-4 mr-2" />
            )}
            Get AI Suggestions
          </Button>
        </div>
      )}

      {/* Task Information Modal */}
      {showInfoId && (
        <TaskInfoModal objective={getObjectiveById(showInfoId)!} />
      )}
    </div>
  )
}

export default EnhancedMissionObjectives