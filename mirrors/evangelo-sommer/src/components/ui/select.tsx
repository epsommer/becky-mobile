import * as React from "react"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
}

const Select = ({ children, ...props }: SelectProps) => {
  return <div {...props}>{children}</div>
}

const SelectTrigger = ({ children }: { children?: React.ReactNode }) => {
  return <div>{children}</div>
}

const SelectValue = ({ placeholder }: { placeholder?: string }) => {
  return <span>{placeholder}</span>
}

const SelectContent = ({ children }: { children?: React.ReactNode }) => {
  return <div>{children}</div>
}

const SelectItem = ({ value, children }: { value: string; children?: React.ReactNode }) => {
  return <div data-value={value}>{children}</div>
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem }
