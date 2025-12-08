"use client"

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { Target, Plus, Check, X, Edit3, Trash2, Flag } from 'lucide-react'
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
}

interface MissionObjectivesProps {
  date: Date
  onObjectiveComplete?: (objective: MissionObjective) => void
  onObjectiveCreate?: (objective: Omit<MissionObjective, 'id' | 'createdAt'>) => void
}

const MissionObjectives: React.FC<MissionObjectivesProps> = ({
  date,
  onObjectiveComplete,
  onObjectiveCreate
}) => {
  const [objectives, setObjectives] = useState<MissionObjective[]>([])
  const [quickInput, setQuickInput] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  // Load objectives from localStorage on mount
  useEffect(() => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const stored = localStorage.getItem(`mission-objectives-${dateKey}`)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setObjectives(parsed.map((obj: any) => ({
          ...obj,
          createdAt: new Date(obj.createdAt),
          completedAt: obj.completedAt ? new Date(obj.completedAt) : undefined
        })))
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

  const handleQuickAdd = () => {
    if (!quickInput.trim()) return

    const newObjective: MissionObjective = {
      id: `obj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: quickInput.trim(),
      priority: detectPriority(quickInput),
      completed: false,
      createdAt: new Date(),
      estimatedMinutes: extractTimeEstimate(quickInput)
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

  const handleEdit = (id: string, text: string) => {
    setEditingId(id)
    setEditText(text)
  }

  const handleSaveEdit = () => {
    if (!editingId || !editText.trim()) return

    setObjectives(prev => prev.map(obj => {
      if (obj.id === editingId) {
        return {
          ...obj,
          text: editText.trim(),
          priority: detectPriority(editText),
          estimatedMinutes: extractTimeEstimate(editText)
        }
      }
      return obj
    }))

    setEditingId(null)
    setEditText('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const completedObjectives = objectives.filter(obj => obj.completed)
  const pendingObjectives = objectives.filter(obj => !obj.completed)

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

        <div className="flex gap-3">
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

        <div className="mt-3 text-xs text-tactical-grey-400 font-interface">
          <strong>Tips:</strong> Include keywords like "urgent", "important", or time estimates like "30 minutes", "2 hours"
        </div>
      </div>

      {/* Pending Objectives */}
      {pendingObjectives.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-hud-text-primary font-primary flex items-center gap-2">
            <Target className="w-5 h-5 text-tactical-gold" />
            Active Objectives ({pendingObjectives.length})
          </h3>

          {pendingObjectives.map((objective) => (
            <Card key={objective.id} className={`border-l-4 ${getPriorityColor(objective.priority)} bg-hud-background-secondary border-hud-border`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <button
                      onClick={() => handleToggleComplete(objective.id)}
                      className="mt-1 w-5 h-5 rounded border-2 border-tactical-grey-400 hover:border-tactical-gold flex items-center justify-center transition-colors"
                    >
                      {objective.completed && <Check className="w-3 h-3 text-tactical-gold" />}
                    </button>

                    <div className="flex-1">
                      {editingId === objective.id ? (
                        <div className="flex gap-2">
                          <input
                            ref={editInputRef}
                            type="text"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveEdit()
                              } else if (e.key === 'Escape') {
                                handleCancelEdit()
                              }
                            }}
                            className="flex-1 bg-hud-background border border-hud-border rounded px-2 py-1 text-hud-text-primary font-interface"
                          />
                          <Button
                            onClick={handleSaveEdit}
                            size="sm"
                            className="bg-tactical-gold text-hud-background hover:bg-tactical-gold-light"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={handleCancelEdit}
                            size="sm"
                            variant="outline"
                            className="border-hud-border hover:bg-hud-background-secondary"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-hud-text-primary font-interface mb-2">
                            {objective.text}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`${getPriorityColor(objective.priority)} text-xs font-bold uppercase`}>
                              {objective.priority}
                            </Badge>

                            {objective.estimatedMinutes && (
                              <Badge className="bg-tactical-grey-800/30 text-tactical-grey-300 text-xs">
                                ~{objective.estimatedMinutes}min
                              </Badge>
                            )}

                            <span className="text-xs text-tactical-grey-400">
                              Added {format(objective.createdAt, 'h:mm a')}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {editingId !== objective.id && (
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEdit(objective.id, objective.text)}
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
                      <p className="text-tactical-grey-300 font-interface mb-2 line-through">
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
          <p className="text-tactical-grey-400 font-interface">
            Use the quick task entry above to add your daily objectives
          </p>
        </div>
      )}
    </div>
  )
}

export default MissionObjectives