"use client"

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { User, Plus, Search, Check, X, Mail, Phone, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
  notes?: string
  createdAt?: string
  updatedAt?: string
}

interface ClientSelectorProps {
  selectedClientId?: string
  selectedClientName?: string
  onClientSelect: (client: Client | null, isNonClient: boolean) => void
  onCreateClient?: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>
  placeholder?: string
  required?: boolean
  allowNonClient?: boolean
  className?: string
}

const ClientSelector: React.FC<ClientSelectorProps> = ({
  selectedClientId,
  selectedClientName,
  onClientSelect,
  onCreateClient,
  placeholder = "Search for a client or enter name",
  required = false,
  allowNonClient = true,
  className = ""
}) => {
  const [clients, setClients] = useState<Client[]>([])
  const [searchQuery, setSearchQuery] = useState(selectedClientName || '')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isNonClient, setIsNonClient] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load clients from API and localStorage
  useEffect(() => {
    const loadClients = async () => {
      try {
        // First try to load from API
        try {
          const response = await fetch('/api/clients?limit=100')
          if (response.ok) {
            const apiData = await response.json()
            if (apiData.success && apiData.data) {
              const apiClients = apiData.data.map((client: any) => ({
                id: client.id,
                name: client.name || 'Unnamed Client',
                email: client.email,
                phone: client.phone,
                address: client.address,
                company: client.company,
                notes: client.notes,
                createdAt: client.createdAt,
                updatedAt: client.updatedAt
              }))
              setClients(apiClients)
              // Also sync to localStorage for offline access
              localStorage.setItem('clients', JSON.stringify(apiClients))
              return
            }
          }
        } catch (apiError) {
          console.warn('API not available, falling back to localStorage:', apiError)
        }

        // Fallback to localStorage if API fails
        const storedClients = JSON.parse(localStorage.getItem('clients') || '[]')
        const formattedClients = storedClients.map((client: any) => ({
          id: client.id,
          name: client.name || 'Unnamed Client',
          email: client.email,
          phone: client.phone,
          address: client.address,
          company: client.company,
          notes: client.notes,
          createdAt: client.createdAt,
          updatedAt: client.updatedAt
        }))
        setClients(formattedClients)
      } catch (error) {
        console.error('Error loading clients:', error)
        setClients([])
      }
    }

    loadClients()
  }, [])

  // Update search query when selectedClientName changes
  useEffect(() => {
    if (selectedClientName) {
      setSearchQuery(selectedClientName)
    }
  }, [selectedClientName])

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients.slice(0, 10) // Show first 10 clients
    
    const query = searchQuery.toLowerCase()
    return clients.filter(client => 
      client.name.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.company?.toLowerCase().includes(query)
    ).slice(0, 10) // Limit to 10 results
  }, [clients, searchQuery])

  // Check if search query matches any existing client exactly
  const exactMatch = useMemo(() => {
    return clients.find(client => 
      client.name.toLowerCase() === searchQuery.toLowerCase()
    )
  }, [clients, searchQuery])

  // Handle input focus
  const handleInputFocus = () => {
    setIsDropdownOpen(true)
  }

  // Handle input blur (with delay to allow dropdown clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setIsDropdownOpen(false)
    }, 200)
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    setIsDropdownOpen(true)
    setIsNonClient(false)
    
    if (!value.trim()) {
      onClientSelect(null, false)
    }
  }

  // Handle client selection
  const handleClientSelect = (client: Client) => {
    setSearchQuery(client.name)
    setIsDropdownOpen(false)
    setIsNonClient(false)
    onClientSelect(client, false)
  }

  // Handle non-client selection
  const handleNonClientSelect = () => {
    if (!searchQuery.trim()) return
    
    setIsDropdownOpen(false)
    setIsNonClient(true)
    
    // Create a temporary client object for non-client
    const nonClientData: Client = {
      id: `non-client-${Date.now()}`,
      name: searchQuery.trim()
    }
    
    onClientSelect(nonClientData, true)
  }

  // Handle create client
  const handleCreateClient = () => {
    setShowCreateModal(true)
    setIsDropdownOpen(false)
  }

  // Handle create client from modal
  const handleCreateNewClient = async (clientData: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!onCreateClient) {
      // Fallback: create client locally
      const newClient: Client = {
        ...clientData,
        id: `client-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      try {
        const updatedClients = [...clients, newClient]
        setClients(updatedClients)
        localStorage.setItem('clients', JSON.stringify(updatedClients))
        
        setSearchQuery(newClient.name)
        onClientSelect(newClient, false)
        setShowCreateModal(false)
        
        return newClient
      } catch (error) {
        console.error('Error saving client:', error)
        throw error
      }
    } else {
      try {
        setLoading(true)
        const newClient = await onCreateClient(clientData)
        
        setClients(prev => [...prev, newClient])
        setSearchQuery(newClient.name)
        onClientSelect(newClient, false)
        setShowCreateModal(false)
        
        return newClient
      } catch (error) {
        console.error('Error creating client:', error)
        throw error
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle clear selection
  const handleClear = () => {
    setSearchQuery('')
    setIsNonClient(false)
    onClientSelect(null, false)
    inputRef.current?.focus()
  }

  return (
    <div className={`relative ${className}`}>
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <User className="h-4 w-4 text-medium-grey" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          required={required}
          className="w-full pl-10 pr-10 p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
        />
        
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <X className="h-4 w-4 text-medium-grey hover:text-hud-text-primary" />
          </button>
        )}
        
        {isNonClient && (
          <div className="absolute inset-y-0 right-8 pr-2 flex items-center">
            <Badge className="bg-tactical-gold-muted text-tactical-brown-dark text-xs">Non-Client</Badge>
          </div>
        )}
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border-2 border-hud-border rounded-md shadow-lg max-h-80 overflow-y-auto"
        >
          {/* Existing Clients */}
          {filteredClients.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-medium-grey uppercase tracking-wide font-primary">
                Existing Clients
              </div>
              {filteredClients.map(client => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-3 text-left hover:bg-hud-background-secondary transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-hud-text-primary font-primary">
                        {client.name}
                      </div>
                      {(client.email || client.company) && (
                        <div className="text-sm text-medium-grey font-primary mt-1">
                          {client.company && <span className="mr-3">{client.company}</span>}
                          {client.email && (
                            <span className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {client.email}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedClientId === client.id && (
                      <Check className="w-4 h-4 text-tactical-gold" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          {searchQuery.trim() && (
            <div className="border-t border-hud-border py-2">
              {/* Non-Client Option */}
              {allowNonClient && !exactMatch && (
                <button
                  onClick={handleNonClientSelect}
                  className="w-full px-4 py-3 text-left hover:bg-tactical-gold-muted transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-tactical-gold-muted rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-tactical-gold" />
                  </div>
                  <div>
                    <div className="font-semibold text-hud-text-primary font-primary">
                      Use as non-client: "{searchQuery.trim()}"
                    </div>
                    <div className="text-sm text-medium-grey font-primary">
                      This won't be saved as a permanent client
                    </div>
                  </div>
                </button>
              )}

              {/* Create New Client */}
              {!exactMatch && (
                <button
                  onClick={handleCreateClient}
                  className="w-full px-4 py-3 text-left hover:bg-tactical-gold-light transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-tactical-gold rounded-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-hud-text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-hud-text-primary font-primary">
                      Create new client: "{searchQuery.trim()}"
                    </div>
                    <div className="text-sm text-medium-grey font-primary">
                      Save this as a permanent client with contact details
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* No Results */}
          {filteredClients.length === 0 && !searchQuery.trim() && (
            <div className="px-4 py-8 text-center text-medium-grey font-primary">
              <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <div className="font-semibold">No clients yet</div>
              <div className="text-sm">Start typing to create your first client</div>
            </div>
          )}
        </div>
      )}

      {/* Create Client Modal */}
      <CreateClientModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateNewClient}
        initialName={searchQuery.trim()}
        loading={loading}
      />
    </div>
  )
}

// Create Client Modal Component
interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Client>
  initialName?: string
  loading?: boolean
}

const CreateClientModal: React.FC<CreateClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: initialName,
    email: '',
    phone: '',
    address: '',
    company: '',
    notes: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Update form when initialName changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, name: initialName }))
  }, [initialName])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'Client name is required'
    }
    
    if (formData.email && !formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Please enter a valid email address'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return
    
    try {
      setIsSaving(true)
      await onSave({
        name: formData.name.trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        company: formData.company.trim() || undefined,
        notes: formData.notes.trim() || undefined
      })
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        company: '',
        notes: ''
      })
      setErrors({})
    } catch (error) {
      console.error('Error saving client:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (!isSaving) {
      onClose()
      setErrors({})
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white border-hud-border">
        <DialogHeader className="border-b border-hud-border pb-4">
          <DialogTitle className="flex items-center gap-3 text-xl font-primary font-semibold uppercase tracking-wide text-hud-text-primary">
            <Plus className="w-6 h-6 text-tactical-gold" />
            Create New Client
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-primary uppercase tracking-wide">
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full p-3 border-2 ${errors.name ? 'border-red-500' : 'border-hud-border'} focus:border-hud-border-accent bg-white font-primary`}
                  placeholder="Enter client's full name"
                />
                {errors.name && (
                  <div className="text-red-600 text-sm font-primary">{errors.name}</div>
                )}
              </div>

              {/* Company */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="Company or organization name"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-primary uppercase tracking-wide">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  <Mail className="inline w-4 h-4 mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={`w-full p-3 border-2 ${errors.email ? 'border-red-500' : 'border-hud-border'} focus:border-hud-border-accent bg-white font-primary`}
                  placeholder="client@example.com"
                />
                {errors.email && (
                  <div className="text-red-600 text-sm font-primary">{errors.email}</div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  <Phone className="inline w-4 h-4 mr-2" />
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  <MapPin className="inline w-4 h-4 mr-2" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary resize-none"
                  rows={3}
                  placeholder="Street address, city, state, zip code"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-primary uppercase tracking-wide">
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-text-primary font-primary uppercase tracking-wide">
                  Additional Information
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  className="w-full p-3 border-2 border-hud-border focus:border-hud-border-accent bg-white font-primary resize-none"
                  rows={4}
                  placeholder="Any additional notes about this client..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6 border-t border-hud-border">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSaving}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !formData.name.trim()}
            className="px-6 bg-tactical-gold hover:bg-tactical-gold-light text-hud-text-primary"
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-hud-text-primary border-t-transparent" />
                Creating...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4" />
                Create Client
              </div>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default ClientSelector