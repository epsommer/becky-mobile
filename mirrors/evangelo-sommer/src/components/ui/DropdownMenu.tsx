"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface DropdownMenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  variant?: 'default' | 'destructive'
}

interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
  align?: 'left' | 'right'
  className?: string
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ 
  trigger, 
  items, 
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsOpen(!isOpen)
  }

  const handleItemClick = (item: DropdownMenuItem, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    item.onClick()
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block ${className}`}>
      <div ref={triggerRef} onClick={handleTriggerClick}>
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={menuRef}
          className={`absolute z-50 mt-2 w-48 bg-hud-background-secondary border-2 border-hud-border-accent rounded-md shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={(e) => handleItemClick(item, e)}
                className={`w-full text-left px-4 py-2 text-sm font-primary flex items-center space-x-2 hover:bg-tactical-gold hover:text-hud-text-primary transition-colors ${
                  item.variant === 'destructive' 
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700' 
                    : 'text-hud-text-primary'
                }`}
              >
                {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DropdownMenu