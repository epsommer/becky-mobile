"use client"

import React, { useState, useRef, useEffect } from "react"
import { Users, MessageSquare, Clock, Target, Briefcase, ChevronLeft, ChevronRight, Leaf, Snowflake, Dog, Palette, Receipt, LayoutGrid, Star, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  activeTab?: string
  setActiveTab?: (tab: string) => void
  conversationCount?: number
  onTitleClick?: () => void
  onCollapseChange?: (collapsed: boolean) => void
  mobileMenuOpen?: boolean
  onMobileMenuClose?: () => void
  headerCompact?: boolean
}

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "clients", label: "Clients", icon: Users },
  { id: "conversations", label: "Conversations", icon: MessageSquare },
  { id: "testimonials", label: "Testimonials", icon: Star },
  { id: "billing", label: "Billing", icon: Receipt },
  { id: "time-manager", label: "Time Manager", icon: Clock },
  { id: "goals", label: "Goals", icon: Target },
  { id: "service-lines", label: "Service Lines", icon: Briefcase },
]

// Helper function to map service line slug to icon and color
const getServiceLineIcon = (slug: string) => {
  const iconMap: Record<string, { icon: any; color: string }> = {
    woodgreen: { icon: Leaf, color: "service-landscaping" },
    landscaping: { icon: Leaf, color: "service-landscaping" },
    whiteknight: { icon: Snowflake, color: "service-snow-removal" },
    snow_removal: { icon: Snowflake, color: "service-snow-removal" },
    pupawalk: { icon: Dog, color: "service-hair-cutting" },
    pet_services: { icon: Dog, color: "service-hair-cutting" },
    creative: { icon: Palette, color: "service-creative-development" },
    creative_development: { icon: Palette, color: "service-creative-development" },
  }
  return iconMap[slug] || { icon: Briefcase, color: "bg-gray-500" }
}

interface ServiceLineData {
  id: string
  name: string
  slug: string
  route: string
}

const Sidebar = ({
  activeTab = "clients",
  setActiveTab,
  conversationCount = 0,
  onTitleClick,
  onCollapseChange,
  mobileMenuOpen = false,
  onMobileMenuClose,
  headerCompact = false
}: SidebarProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showServiceLinesSubmenu, setShowServiceLinesSubmenu] = useState(false)
  const [serviceLinesButtonRef, setServicesLinesButtonRef] = useState<HTMLButtonElement | null>(null)
  const [submenuPosition, setSubmenuPosition] = useState({ top: 0, left: 0 })
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [serviceLines, setServiceLines] = useState<Array<{
    id: string
    name: string
    slug: string
    icon: any
    color: string
    path: string
  }>>([])

  // Fetch service lines from API
  useEffect(() => {
    const fetchServiceLines = async () => {
      try {
        const response = await fetch('/api/service-lines')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data) {
            const mappedServiceLines = data.data.map((line: ServiceLineData) => {
              const { icon, color } = getServiceLineIcon(line.slug)
              return {
                id: line.slug,
                name: line.name,
                slug: line.slug,
                icon,
                color,
                path: line.route || `/services/${line.slug}`
              }
            })
            setServiceLines(mappedServiceLines)
          }
        }
      } catch (error) {
        console.error('Error fetching service lines:', error)
      }
    }

    fetchServiceLines()
  }, [])

  const handleTabChange = (tab: string) => {
    setActiveTab?.(tab)
    onMobileMenuClose?.() // Close mobile menu when tab is selected
  }

  const headerTopClass = headerCompact ? 'top-12 sm:top-14' : 'top-14 sm:top-20'
  const headerHeightClass = headerCompact
    ? 'h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.5rem)]'
    : 'h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-5rem)]'

  return (
    <>
    <aside className={`
      ${isCollapsed ? 'w-16' : 'w-64'}
      neo-sidebar
      fixed
      left-0
      ${headerTopClass}
      ${headerHeightClass}
      transition-all
      duration-300
      z-[60]
      overflow-y-auto
      ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      lg:translate-x-0
    `}>
      {/* Header with ES Logo and Toggle */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border overflow-visible">
        {/* Mobile Close Button - Top Right when menu is open */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute top-2 right-2 z-50">
            <button
              onClick={onMobileMenuClose}
              className="neo-button-sm p-2 transition-all duration-200"
              aria-label="Close mobile menu"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
        )}

        {/* Spacer to align toggle */}
        <div className={`${isCollapsed ? 'pt-2 pb-2 px-2' : 'pt-4 pb-2 px-4'}`} />

        {/* Desktop Toggle Button - Centered when collapsed */}
        <div className={`p-2 hidden lg:flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={() => {
              const newState = !isCollapsed
              setIsCollapsed(newState)
              onCollapseChange?.(newState)
            }}
            className="neo-button-sm w-8 h-8 flex items-center justify-center transition-all duration-200"
            style={isCollapsed ? { margin: 0 } : {}}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <nav className={`${isCollapsed ? 'px-2 py-6' : 'p-6'}`}>
        <div className="space-y-1">
          {navigationItems.map(item => {
            const IconComponent = item.icon
            const isServiceLinesItem = item.id === 'service-lines'

            return (
              <button
                key={item.id}
                ref={isServiceLinesItem ? setServicesLinesButtonRef : undefined}
                className={`neo-nav-button w-full flex items-center ${isCollapsed ? 'justify-center px-1' : 'space-x-3 px-4'} ${isCollapsed ? 'py-2' : 'py-3'} text-left font-medium text-sm transition-all duration-200 rounded-lg ${
                  activeTab === item.id || (isServiceLinesItem && serviceLines.some(sl => sl.slug === activeTab))
                    ? 'neo-nav-button-active'
                    : ''
                }`}
                onClick={() => handleTabChange(item.id)}
                onMouseEnter={() => {
                  if (isServiceLinesItem && !isCollapsed) {
                    if (closeTimeoutRef.current) {
                      clearTimeout(closeTimeoutRef.current)
                      closeTimeoutRef.current = null
                    }
                    if (serviceLinesButtonRef) {
                      const rect = serviceLinesButtonRef.getBoundingClientRect()
                      setSubmenuPosition({
                        top: rect.top,
                        left: rect.right + 8
                      })
                    }
                    setShowServiceLinesSubmenu(true)
                  }
                }}
                onMouseLeave={() => {
                  if (isServiceLinesItem) {
                    closeTimeoutRef.current = setTimeout(() => {
                      setShowServiceLinesSubmenu(false)
                    }, 150)
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <IconComponent className="h-4 w-4" />
                {!isCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.id === "conversations" && conversationCount > 0 && (
                      <Badge className="ml-auto flex items-center justify-center h-5 min-w-[1.25rem] px-1.5 py-0 text-xs font-semibold rounded-full bg-[var(--neomorphic-button-bg)] text-[var(--neomorphic-button-text)] hover:opacity-90 transition-opacity">
                        {conversationCount}
                      </Badge>
                    )}
                    {isServiceLinesItem && <ChevronRight className="ml-auto h-4 w-4" />}
                  </>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </aside>

    {/* Service Lines Submenu */}
    {showServiceLinesSubmenu && !isCollapsed && (
      <div
        className="fixed z-[9999] py-2 neo-container min-w-[240px]"
        style={{
          top: `${submenuPosition.top}px`,
          left: `${submenuPosition.left}px`
        }}
        onMouseEnter={() => {
          if (closeTimeoutRef.current) {
            clearTimeout(closeTimeoutRef.current)
            closeTimeoutRef.current = null
          }
        }}
        onMouseLeave={() => {
          setShowServiceLinesSubmenu(false)
        }}
      >
        {serviceLines.map(service => {
          const IconComponent = service.icon
          return (
            <button
              key={service.id}
              className="w-full flex items-center space-x-3 px-4 py-3 text-left font-medium text-sm text-foreground transition-all duration-200 hover:neo-inset rounded-lg"
              onClick={() => {
                handleTabChange(service.id)
                setShowServiceLinesSubmenu(false)
              }}
            >
              <div className={`w-3 h-3 rounded-full ${service.color}`}></div>
              <IconComponent className="h-4 w-4" />
              <span>{service.name}</span>
            </button>
          )
        })}
      </div>
    )}
    </>
  )
}

export default Sidebar
