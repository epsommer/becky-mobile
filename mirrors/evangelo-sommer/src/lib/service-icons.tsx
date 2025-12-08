import React from "react"
import { 
  Leaf, 
  Snowflake, 
  Scissors, 
  Palette, 
  Circle,
  FileText,
  Calculator,
  Receipt,
  ScrollText,
  Mail,
  Phone,
  AlertTriangle,
  Edit
} from "lucide-react"

export const getServiceIcon = (service: string) => {
  const icons = {
    landscaping: <Leaf className="h-4 w-4 text-tactical-success" />,
    snow_removal: <Snowflake className="h-4 w-4 text-tactical-grey-600" />,
    hair_cutting: <Scissors className="h-4 w-4 text-tactical-brown-light" />,
    creative_development: <Palette className="h-4 w-4 text-tactical-gold" />,
    "snow-removal": <Snowflake className="h-4 w-4 text-tactical-grey-600" />,
    "hair-cutting": <Scissors className="h-4 w-4 text-tactical-brown-light" />,
    "creative-development": <Palette className="h-4 w-4 text-tactical-gold" />
  }
  return icons[service as keyof typeof icons] || <Circle className="h-4 w-4" />
}

export const getBillingIcon = (type: string) => {
  const icons = {
    invoice: <FileText className="h-5 w-5" />,
    quote: <Calculator className="h-5 w-5" />,
    receipt: <Receipt className="h-5 w-5" />,
    sow: <ScrollText className="h-5 w-5" />
  }
  return icons[type as keyof typeof icons]
}

export const formatServiceName = (service: string) => {
  const names = {
    landscaping: "Landscaping",
    snow_removal: "Snow Removal",
    hair_cutting: "Hair Cutting", 
    creative_development: "Creative Development",
    "snow-removal": "Snow Removal",
    "hair-cutting": "Hair Cutting",
    "creative-development": "Creative Development"
  }
  return names[service as keyof typeof names] || service.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}

// Profile completion utilities
export const isProfileIncomplete = (client: any) => {
  return !client.email || !client.phone || !client.name
}

export const getMissingFields = (client: any) => {
  const missing = []
  if (!client.email) missing.push('Email')
  if (!client.phone) missing.push('Phone')
  if (!client.name) missing.push('Name')
  if (!client.address && ['landscaping', 'snow-removal', 'pet-services'].includes(client.serviceId)) {
    missing.push('Address')
  }
  return missing
}

// Export icons for direct use
export {
  Mail,
  Phone,
  AlertTriangle,
  Edit,
  FileText,
  Calculator,
  Receipt,
  ScrollText
}
