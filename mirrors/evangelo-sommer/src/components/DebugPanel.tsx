"use client"

import React, { useState, useEffect } from 'react'
import { 
  Bug, 
  Download, 
  Trash2, 
  BarChart3, 
  Clock, 
  AlertTriangle, 
  Info,
  Eye,
  EyeOff,
  Minimize2,
  Maximize2,
  Filter,
  Search
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { eventDebugger, DebugLogEntry, DebugLogLevel, DebugCategory } from '@/lib/event-debugger'

interface DebugPanelProps {
  isOpen?: boolean
  onToggle?: (open: boolean) => void
}

const DebugPanel: React.FC<DebugPanelProps> = ({ 
  isOpen: controlledOpen, 
  onToggle 
}) => {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'logs' | 'operations' | 'performance' | 'stats'>('logs')
  const [logs, setLogs] = useState<DebugLogEntry[]>([])
  const [filters, setFilters] = useState({
    level: '' as DebugLogLevel | '',
    category: '' as DebugCategory | '',
    search: ''
  })
  const [autoRefresh, setAutoRefresh] = useState(true)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLogs(eventDebugger.getLogs())
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const handleToggle = () => {
    const newOpen = !isOpen
    if (onToggle) {
      onToggle(newOpen)
    } else {
      setInternalOpen(newOpen)
    }
  }

  const handleExport = () => {
    const data = eventDebugger.exportDebugData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `event-debug-${new Date().toISOString().slice(0, 19)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClear = () => {
    eventDebugger.clear()
    setLogs([])
  }

  const getLogLevelColor = (level: DebugLogLevel): string => {
    switch (level) {
      case 'error': return 'bg-red-100 text-red-800 border-red-200'
      case 'warn': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'info': return 'bg-tactical-gold-muted text-tactical-brown-dark border-tactical-grey-300'
      case 'debug': return 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300'
      default: return 'bg-tactical-grey-200 text-tactical-grey-700 border-tactical-grey-300'
    }
  }

  const getCategoryIcon = (category: DebugCategory) => {
    switch (category) {
      case 'event': return '📅'
      case 'conflict': return '⚠️'
      case 'drag': return '🔄'
      case 'api': return '🌐'
      case 'ui': return '🎨'
      case 'performance': return '⚡'
      default: return '📋'
    }
  }

  const filteredLogs = logs.filter(log => {
    if (filters.level && log.level !== filters.level) return false
    if (filters.category && log.category !== filters.category) return false
    if (filters.search && !log.message.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  const statistics = eventDebugger.getStatistics()

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={handleToggle}
          className="bg-tactical-grey-800 text-white hover:bg-tactical-grey-700 rounded-full p-3"
          title="Open Debug Panel"
        >
          <Bug className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 bg-white border border-tactical-grey-400 rounded-lg shadow-xl ${
      isMinimized ? 'w-80 h-16' : 'w-[800px] h-[600px]'
    } transition-all duration-200`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-tactical-grey-100 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-tactical-grey-500" />
          <h3 className="font-medium text-tactical-grey-700">Debug Panel</h3>
          <Badge variant="outline" className="text-xs">
            {logs.length} logs
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
          >
            {autoRefresh ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            className="text-gray-400 hover:text-tactical-grey-500"
          >
            ×
          </Button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Tabs */}
          <div className="flex border-b">
            {[
              { id: 'logs', label: 'Logs', icon: Info },
              { id: 'operations', label: 'Operations', icon: BarChart3 },
              { id: 'performance', label: 'Performance', icon: Clock },
              { id: 'stats', label: 'Statistics', icon: BarChart3 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  selectedTab === tab.id
                    ? 'border-tactical-gold-500 text-tactical-gold bg-tactical-gold-muted'
                    : 'border-transparent text-tactical-grey-500 hover:text-tactical-grey-600 hover:bg-tactical-grey-100'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {selectedTab === 'logs' && (
              <div className="h-full flex flex-col">
                {/* Filters */}
                <div className="p-3 border-b bg-tactical-grey-100 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-tactical-grey-500" />
                    <select
                      value={filters.level}
                      onChange={(e) => setFilters(prev => ({ ...prev, level: e.target.value as any }))}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="">All Levels</option>
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warn">Warn</option>
                      <option value="error">Error</option>
                    </select>
                    <select
                      value={filters.category}
                      onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value as any }))}
                      className="text-xs border rounded px-2 py-1"
                    >
                      <option value="">All Categories</option>
                      <option value="event">Event</option>
                      <option value="conflict">Conflict</option>
                      <option value="drag">Drag</option>
                      <option value="api">API</option>
                      <option value="ui">UI</option>
                      <option value="performance">Performance</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Search className="w-4 h-4 text-tactical-grey-500" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="text-xs border rounded px-2 py-1 flex-1"
                    />
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClear}
                      className="text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Clear
                    </Button>
                  </div>
                </div>

                {/* Log List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {filteredLogs.slice(-50).reverse().map(log => (
                    <div
                      key={log.id}
                      className="text-xs p-2 border rounded bg-white hover:bg-tactical-grey-100"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{getCategoryIcon(log.category)}</span>
                          <Badge className={`text-xs ${getLogLevelColor(log.level)}`}>
                            {log.level}
                          </Badge>
                          <span className="text-tactical-grey-500">
                            {log.component && `[${log.component}]`}
                          </span>
                          <span className="text-gray-400">
                            {log.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-tactical-grey-700 mb-1">{log.message}</div>
                      {log.data && (
                        <details className="text-tactical-grey-500">
                          <summary className="cursor-pointer text-xs text-tactical-gold">
                            Show data
                          </summary>
                          <pre className="mt-1 text-xs bg-tactical-grey-200 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  {filteredLogs.length === 0 && (
                    <div className="text-center text-tactical-grey-500 py-8">
                      No logs match the current filters
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTab === 'stats' && (
              <div className="p-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Logs by Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {Object.entries(statistics.logsByLevel || {}).map(([level, count]) => (
                          <div key={level} className="flex justify-between text-xs">
                            <span className="capitalize">{level}</span>
                            <span className="font-medium">{String(count)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Operations by Type</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1">
                        {Object.entries(statistics.operationsByType || {}).map(([type, count]) => (
                          <div key={type} className="flex justify-between text-xs">
                            <span className="capitalize">{type}</span>
                            <span className="font-medium">{String(count)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Recent Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {statistics.recentErrors?.slice(0, 5).map((error: DebugLogEntry) => (
                          <div key={error.id} className="text-xs text-red-600 truncate">
                            {error.message}
                          </div>
                        ))}
                        {!statistics.recentErrors?.length && (
                          <div className="text-xs text-tactical-grey-500">No recent errors</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Session Info</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-1 text-xs">
                        <div><strong>Session:</strong> {statistics.sessionId?.slice(-8)}</div>
                        <div><strong>Total Logs:</strong> {statistics.totalLogs}</div>
                        <div><strong>Operations:</strong> {statistics.totalOperations}</div>
                        <div><strong>Metrics:</strong> {statistics.totalMetrics}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default DebugPanel