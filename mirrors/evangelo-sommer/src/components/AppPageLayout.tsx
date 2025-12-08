"use client"

import React from "react"
import Header from "./Header"

interface AppPageLayoutProps {
  children: React.ReactNode
  className?: string
  contentClassName?: string
  style?: React.CSSProperties
}

const AppPageLayout = ({
  children,
  className = "",
  contentClassName = "",
  style,
}: AppPageLayoutProps) => {
  return (
    <div className={`min-h-screen bg-background text-foreground ${className}`} style={style}>
      <Header
        hideCommands
        hideNotifications
        hidePreferences
        hideMobileMenuToggle
      />
      <main className={`pt-16 sm:pt-20 ${contentClassName}`}>
        {children}
      </main>
    </div>
  )
}

export default AppPageLayout
