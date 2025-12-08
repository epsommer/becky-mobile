// src/app/participant-management-demo/page.tsx
// Demo page for the comprehensive participant management and appointment booking system

'use client';

import React, { useState, useEffect } from 'react';
import {
  Participant,
  Appointment,
  CreateParticipantRequest,
  CreateAppointmentRequest,
  VoiceBookingRequest,
  ParticipantRole,
  AppointmentStatus,
} from '../../types/participant-management';

// Import ServiceType values
const ServiceType = {
  LAWN_CARE: 'lawn_care' as const,
  LANDSCAPING: 'landscaping' as const,
  MAINTENANCE: 'maintenance' as const,
  SNOW_REMOVAL: 'snow_removal' as const,
  EMERGENCY: 'emergency' as const,
  CONSULTATION: 'consultation' as const,
  DESIGN: 'design' as const,
  INSTALLATION: 'installation' as const,
};

interface DemoState {
  participants: Participant[];
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  success: string | null;
}

export default function ParticipantManagementDemo() {
  const [state, setState] = useState<DemoState>({
    participants: [],
    appointments: [],
    loading: false,
    error: null,
    success: null,
  });

  const [newParticipant, setNewParticipant] = useState<CreateParticipantRequest>({
    name: '',
    email: '',
    phone: '',
    company: '',
    role: ParticipantRole.CLIENT,
    services: [],
    contactPreferences: {
      sms: true,
      email: true,
      voiceCall: false,
      preferredMethod: 'sms',
    },
  });

  const [newAppointment, setNewAppointment] = useState<CreateAppointmentRequest>({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    service: ServiceType.MAINTENANCE,
    location: '',
    organizerId: '',
    participantIds: [],
  });

  const [voiceCommand, setVoiceCommand] = useState('');

  // Load initial data
  useEffect(() => {
    loadParticipants();
    loadAppointments();
  }, []);

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  };

  const setError = (error: string | null) => {
    setState(prev => ({ ...prev, error, success: null }));
  };

  const setSuccess = (success: string | null) => {
    setState(prev => ({ ...prev, success, error: null }));
  };

  const loadParticipants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/participants');
      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({ ...prev, participants: result.data.participants }));
      } else {
        setError(result.error || 'Failed to load participants');
      }
    } catch (error) {
      setError('Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await fetch('/api/appointments');
      const result = await response.json();
      
      if (result.success) {
        setState(prev => ({ ...prev, appointments: result.data.appointments }));
      } else {
        setError(result.error || 'Failed to load appointments');
      }
    } catch (error) {
      setError('Failed to load appointments');
    }
  };

  const createParticipant = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipant),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Participant created successfully!');
        setNewParticipant({
          name: '',
          email: '',
          phone: '',
          company: '',
          role: ParticipantRole.CLIENT,
          services: [],
          contactPreferences: {
            sms: true,
            email: true,
            voiceCall: false,
            preferredMethod: 'sms',
          },
        });
        loadParticipants();
      } else {
        setError(result.error || 'Failed to create participant');
      }
    } catch (error) {
      setError('Failed to create participant');
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess('Appointment created successfully!');
        setNewAppointment({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          service: ServiceType.MAINTENANCE,
          location: '',
          organizerId: '',
          participantIds: [],
        });
        loadAppointments();
      } else {
        setError(result.error || 'Failed to create appointment');
      }
    } catch (error) {
      setError('Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  const processVoiceCommand = async () => {
    try {
      setLoading(true);
      const voiceRequest: VoiceBookingRequest = {
        transcript: voiceCommand,
        voiceProvider: 'demo',
        sessionId: `demo_${Date.now()}`,
      };

      const response = await fetch('/api/voice/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(voiceRequest),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSuccess(`Voice command processed successfully! ${result.appointmentId ? `Appointment created: ${result.appointmentId}` : ''}`);
        setVoiceCommand('');
        if (result.appointmentId) {
          loadAppointments();
        }
      } else if (result.clarificationNeeded) {
        setError(`Clarification needed: ${result.clarificationQuestion}`);
      } else {
        setError(result.error || 'Failed to process voice command');
      }
    } catch (error) {
      setError('Failed to process voice command');
    } finally {
      setLoading(false);
    }
  };

  const createSampleData = async () => {
    try {
      setLoading(true);
      
      // Create sample service provider
      const serviceProvider = {
        name: 'Evangelo Sommer',
        email: 'evangelo@landscaping.com',
        phone: '+1-555-0100',
        company: 'Evangelo Landscaping',
        role: ParticipantRole.SERVICE_PROVIDER,
        services: [ServiceType.LAWN_CARE, ServiceType.LANDSCAPING, ServiceType.SNOW_REMOVAL],
        contactPreferences: {
          sms: true,
          email: true,
          voiceCall: true,
          preferredMethod: 'email' as const,
        },
      };

      // Create sample clients
      const clients = [
        {
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+1-555-0101',
          company: '',
          role: ParticipantRole.CLIENT,
          services: [ServiceType.LAWN_CARE],
          contactPreferences: {
            sms: true,
            email: true,
            voiceCall: false,
            preferredMethod: 'sms' as const,
          },
        },
        {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+1-555-0102',
          company: 'Johnson Enterprises',
          role: ParticipantRole.CLIENT,
          services: [ServiceType.LANDSCAPING, ServiceType.MAINTENANCE],
          contactPreferences: {
            sms: false,
            email: true,
            voiceCall: true,
            preferredMethod: 'email' as const,
          },
        },
      ];

      // Create participants
      for (const participant of [serviceProvider, ...clients]) {
        await fetch('/api/participants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(participant),
        });
      }

      setSuccess('Sample data created successfully!');
      loadParticipants();
    } catch (error) {
      setError('Failed to create sample data');
    } finally {
      setLoading(false);
    }
  };

  const serviceProviders = state.participants.filter(p => p.role === ParticipantRole.SERVICE_PROVIDER);

  return (
    <div className="min-h-screen bg-tactical-grey-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-tactical-grey-800">
            Participant Management & Appointment Booking Demo
          </h1>
          <p className="mt-2 text-tactical-grey-500">
            Comprehensive CRM system with voice-command appointment booking and multi-participant scheduling
          </p>
        </div>

        {/* Status Messages */}
        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800">{state.error}</div>
          </div>
        )}

        {state.success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
            <div className="text-green-800">{state.success}</div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={createSampleData}
              disabled={state.loading}
              className="px-4 py-2 bg-tactical-gold text-white rounded-md hover:bg-tactical-gold-dark disabled:opacity-50"
            >
              Create Sample Data
            </button>
            <button
              onClick={loadParticipants}
              disabled={state.loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-tactical-grey-700 disabled:opacity-50"
            >
              Refresh Participants
            </button>
            <button
              onClick={loadAppointments}
              disabled={state.loading}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-tactical-grey-700 disabled:opacity-50"
            >
              Refresh Appointments
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Voice Command Booking */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Voice Command Booking</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-2">
                  Voice Command
                </label>
                <textarea
                  value={voiceCommand}
                  onChange={(e) => setVoiceCommand(e.target.value)}
                  placeholder="Try: 'Book appointment with John Smith for lawn care tomorrow at 2 PM'"
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                  rows={3}
                />
              </div>
              <button
                onClick={processVoiceCommand}
                disabled={state.loading || !voiceCommand.trim()}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Process Voice Command
              </button>
              <div className="text-sm text-tactical-grey-500">
                <p className="font-medium">Example commands:</p>
                <ul className="mt-1 space-y-1">
                  <li>• "Book appointment with John Smith for lawn care"</li>
                  <li>• "Schedule landscaping service with Sarah Johnson"</li>
                  <li>• "Check my calendar for tomorrow"</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Create Participant */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Create Participant</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newParticipant.email}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newParticipant.phone}
                    onChange={(e) => setNewParticipant(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Role
                </label>
                <select
                  value={newParticipant.role}
                  onChange={(e) => setNewParticipant(prev => ({ ...prev, role: e.target.value as ParticipantRole }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                >
                  <option value={ParticipantRole.CLIENT}>Client</option>
                  <option value={ParticipantRole.SERVICE_PROVIDER}>Service Provider</option>
                  <option value={ParticipantRole.TEAM_MEMBER}>Team Member</option>
                </select>
              </div>
              <button
                onClick={createParticipant}
                disabled={state.loading || !newParticipant.name}
                className="w-full px-4 py-2 bg-tactical-gold text-white rounded-md hover:bg-tactical-gold-dark disabled:opacity-50"
              >
                Create Participant
              </button>
            </div>
          </div>

          {/* Create Appointment */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Create Appointment</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={newAppointment.title}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newAppointment.startTime}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                    End Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={newAppointment.endTime}
                    onChange={(e) => setNewAppointment(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Service *
                </label>
                <select
                  value={newAppointment.service}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, service: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                >
                  <option value={ServiceType.LAWN_CARE}>Lawn Care</option>
                  <option value={ServiceType.LANDSCAPING}>Landscaping</option>
                  <option value={ServiceType.MAINTENANCE}>Maintenance</option>
                  <option value={ServiceType.SNOW_REMOVAL}>Snow Removal</option>
                  <option value={ServiceType.EMERGENCY}>Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-tactical-grey-600 mb-1">
                  Organizer *
                </label>
                <select
                  value={newAppointment.organizerId}
                  onChange={(e) => setNewAppointment(prev => ({ ...prev, organizerId: e.target.value }))}
                  className="w-full px-3 py-2 border border-tactical-grey-400 rounded-md focus:outline-none focus:ring-2 focus:ring-tactical-gold-500"
                >
                  <option value="">Select organizer...</option>
                  {serviceProviders.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={createAppointment}
                disabled={state.loading || !newAppointment.title || !newAppointment.startTime || !newAppointment.endTime || !newAppointment.organizerId}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Create Appointment
              </button>
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Participants ({state.participants.length})</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {state.participants.map(participant => (
                <div key={participant.id} className="border border-tactical-grey-300 rounded-md p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-tactical-grey-800">{participant.name}</h3>
                      <p className="text-sm text-tactical-grey-500">{participant.role}</p>
                      {participant.email && (
                        <p className="text-sm text-tactical-grey-500">{participant.email}</p>
                      )}
                      {participant.phone && (
                        <p className="text-sm text-tactical-grey-500">{participant.phone}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      {participant.services.length > 0 && (
                        <div>Services: {participant.services.join(', ')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {state.participants.length === 0 && (
                <p className="text-tactical-grey-500 text-center py-4">No participants found</p>
              )}
            </div>
          </div>
        </div>

        {/* Appointments List */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Appointments ({state.appointments.length})</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {state.appointments.map(appointment => (
              <div key={appointment.id} className="border border-tactical-grey-300 rounded-md p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-tactical-grey-800">{appointment.title}</h3>
                    <p className="text-sm text-tactical-grey-500">{appointment.service}</p>
                    <p className="text-sm text-tactical-grey-500">
                      {new Date(appointment.startTime).toLocaleString()} - {new Date(appointment.endTime).toLocaleString()}
                    </p>
                    {appointment.location && (
                      <p className="text-sm text-tactical-grey-500">Location: {appointment.location}</p>
                    )}
                    <p className="text-sm text-tactical-grey-500">
                      Organizer: {appointment.organizer.name}
                    </p>
                    <p className="text-sm text-tactical-grey-500">
                      Participants: {appointment.participants.map(p => p.participant.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      appointment.status === AppointmentStatus.SCHEDULED ? 'bg-yellow-100 text-yellow-800' :
                      appointment.status === AppointmentStatus.CONFIRMED ? 'bg-green-100 text-green-800' :
                      appointment.status === AppointmentStatus.COMPLETED ? 'bg-tactical-gold-muted text-tactical-brown-dark' :
                      appointment.status === AppointmentStatus.CANCELLED ? 'bg-red-100 text-red-800' :
                      'bg-tactical-grey-200 text-tactical-grey-700'
                    }`}>
                      {appointment.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {state.appointments.length === 0 && (
              <p className="text-tactical-grey-500 text-center py-4">No appointments found</p>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {state.loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-tactical-gold-600"></div>
                <span>Processing...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
