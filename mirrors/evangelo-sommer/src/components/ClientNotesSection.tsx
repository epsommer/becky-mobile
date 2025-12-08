"use client"

import React, { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react'

interface ClientNote {
  id: string
  content: string
  createdAt: string
  updatedAt: string
}

interface ClientNotesSectionProps {
  clientId: string
  clientName: string
  refreshTrigger?: number
}

const ClientNotesSection: React.FC<ClientNotesSectionProps> = ({ clientId, clientName, refreshTrigger }) => {
  const [notes, setNotes] = useState<ClientNote[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [editingNote, setEditingNote] = useState<ClientNote | null>(null)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newNoteDate, setNewNoteDate] = useState('')
  const [newNoteTime, setNewNoteTime] = useState('')
  const isInitialMount = useRef(true)

  // Load notes from localStorage on mount and when refreshTrigger changes
  useEffect(() => {
    const storedNotes = localStorage.getItem(`client_notes_${clientId}`)
    if (storedNotes) {
      setNotes(JSON.parse(storedNotes))
    } else {
      setNotes([])
    }
  }, [clientId, refreshTrigger])

  // Save notes to localStorage whenever they change (but skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }
    localStorage.setItem(`client_notes_${clientId}`, JSON.stringify(notes))
  }, [notes, clientId])

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return

    const now = new Date()
    let timestamp = now.toISOString()

    // If custom date/time is provided, use it
    if (newNoteDate && newNoteTime) {
      const customDateTime = new Date(`${newNoteDate}T${newNoteTime}`)
      timestamp = customDateTime.toISOString()
    } else if (newNoteDate) {
      const customDate = new Date(newNoteDate)
      timestamp = customDate.toISOString()
    }

    const newNote: ClientNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      content: newNoteContent.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    }

    setNotes(prev => [newNote, ...prev])
    setNewNoteContent('')
    setNewNoteDate('')
    setNewNoteTime('')
    setIsAdding(false)
  }

  const handleStartAddingNote = () => {
    const now = new Date()

    // Format date as YYYY-MM-DD using local timezone
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`

    // Format time as HH:MM using local timezone
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const timeString = `${hours}:${minutes}`

    setNewNoteDate(dateString)
    setNewNoteTime(timeString)
    setIsAdding(true)
  }

  const handleUpdateNote = (noteId: string, updates: Partial<ClientNote>) => {
    setNotes(prev => prev.map(note =>
      note.id === noteId
        ? { ...note, ...updates, updatedAt: new Date().toISOString() }
        : note
    ))
    setEditingNote(null)
  }

  const handleDeleteNote = (noteId: string) => {
    if (confirm('Are you sure you want to delete this note?')) {
      setNotes(prev => prev.filter(note => note.id !== noteId))
    }
  }

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString)
    return {
      date: format(date, 'MMM dd, yyyy'),
      time: format(date, 'HH:mm')
    }
  }

  return (
    <div className="neo-container transition-transform hover:scale-[1.01]">
      <div className="neo-inset border-b border-foreground/10 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground uppercase tracking-wide font-primary">
            Notes
          </h2>
          <button
            className="neo-button px-4 py-2 font-bold uppercase text-sm tracking-wide font-primary transition-transform hover:scale-[1.02]"
            onClick={handleStartAddingNote}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </div>
      </div>

      <div className="p-6">
        {/* Add Note Form */}
        {isAdding && (
          <div className="neo-inset p-4 mb-4 space-y-4">
            <div>
              <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                Note Content
              </label>
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground/50 placeholder:font-normal"
                placeholder="Enter your note here..."
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                  Date (Optional)
                </label>
                <input
                  type="date"
                  value={newNoteDate}
                  onChange={(e) => setNewNoteDate(e.target.value)}
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
                  Time (Optional)
                </label>
                <input
                  type="time"
                  value={newNoteTime}
                  onChange={(e) => setNewNoteTime(e.target.value)}
                  className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                className="neo-button px-4 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
                onClick={() => {
                  setIsAdding(false)
                  setNewNoteContent('')
                  setNewNoteDate('')
                  setNewNoteTime('')
                }}
              >
                Cancel
              </button>
              <button
                className="neo-button px-4 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
                onClick={handleAddNote}
                disabled={!newNoteContent.trim()}
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        {notes.length === 0 && !isAdding ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground font-primary mb-4">
              No notes yet. Add a note to keep track of important information about {clientName}.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                isEditing={editingNote?.id === note.id}
                onStartEdit={setEditingNote}
                onUpdate={handleUpdateNote}
                onDelete={handleDeleteNote}
                onCancelEdit={() => setEditingNote(null)}
                formatDateTime={formatDateTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface NoteItemProps {
  note: ClientNote
  isEditing: boolean
  onStartEdit: (note: ClientNote) => void
  onUpdate: (noteId: string, updates: Partial<ClientNote>) => void
  onDelete: (noteId: string) => void
  onCancelEdit: () => void
  formatDateTime: (isoString: string) => { date: string; time: string }
}

const NoteItem: React.FC<NoteItemProps> = ({
  note,
  isEditing,
  onStartEdit,
  onUpdate,
  onDelete,
  onCancelEdit,
  formatDateTime
}) => {
  const [editContent, setEditContent] = useState(note.content)
  const [editDate, setEditDate] = useState(note.createdAt.split('T')[0])
  const [editTime, setEditTime] = useState(note.createdAt.split('T')[1].substring(0, 5))

  const { date, time } = formatDateTime(note.createdAt)
  const wasEdited = note.createdAt !== note.updatedAt

  const handleSave = () => {
    const newTimestamp = new Date(`${editDate}T${editTime}`).toISOString()
    onUpdate(note.id, {
      content: editContent.trim(),
      createdAt: newTimestamp
    })
  }

  if (isEditing) {
    return (
      <div className="neo-inset p-4 space-y-4">
        <div>
          <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
            Note Content
          </label>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Date
            </label>
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-foreground mb-2 uppercase tracking-wide font-primary">
              Time
            </label>
            <input
              type="time"
              value={editTime}
              onChange={(e) => setEditTime(e.target.value)}
              className="w-full px-4 py-3 font-primary neo-inset focus:ring-2 focus:ring-foreground/20 transition-all"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            className="neo-button px-4 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
            onClick={onCancelEdit}
          >
            Cancel
          </button>
          <button
            className="neo-button px-4 py-2 uppercase tracking-wide font-bold font-primary transition-transform hover:scale-[1.02]"
            onClick={handleSave}
            disabled={!editContent.trim()}
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="neo-container p-4 hover:scale-[1.01] transition-transform">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 text-xs text-muted-foreground font-primary">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span className="uppercase">{date}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{time}</span>
          </div>
          {wasEdited && (
            <span className="text-xs italic">(edited)</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="neo-button-sm px-2 py-1 text-xs font-bold uppercase font-primary transition-transform hover:scale-[1.1]"
            onClick={() => onStartEdit(note)}
          >
            <Edit className="h-3 w-3" />
          </button>
          <button
            className="neo-button-sm px-2 py-1 text-xs font-bold uppercase font-primary transition-transform hover:scale-[1.1] bg-red-600 text-white"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <p className="text-sm text-foreground font-primary whitespace-pre-wrap">
        {note.content}
      </p>
    </div>
  )
}

export default ClientNotesSection
