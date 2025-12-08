// src/lib/participant-management.ts
// Core service for participant management and appointment booking

import { PrismaClient } from '@prisma/client';
import {
  Participant,
  CreateParticipantRequest,
  UpdateParticipantRequest,
  ParticipantSearchFilters,
  ParticipantSearchResult,
  Appointment,
  CreateAppointmentRequest,
  UpdateAppointmentRequest,
  AppointmentSearchFilters,
  AppointmentSearchResult,
  AvailabilityRequest,
  AvailabilityResponse,
  AvailabilitySlot,
  AppointmentConflict,
  VoiceBookingRequest,
  VoiceBookingResponse,
  NotificationLog,
  ParticipantRole,
  AppointmentStatus,
  VoiceIntent,
  VoiceCommandStatus,
  NotificationType,
  NotificationChannel,
  NotificationStatus
} from '../types/participant-management';
import type { ServiceType } from '../types/participant-management';
import { gmailNotificationService } from './gmail-notification-service';

// Initialize Prisma client
let prisma: PrismaClient;

if (typeof window === 'undefined') {
  // Server-side only
  prisma = new PrismaClient();
}

function getPrismaClient(): PrismaClient {
  if (typeof window !== 'undefined') {
    throw new Error('Prisma client cannot be used on the client side');
  }
  return prisma;
}

export class ParticipantManagementService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = getPrismaClient();
  }

  // ===== PARTICIPANT MANAGEMENT =====

  /**
   * Create a new participant
   */
  async createParticipant(data: CreateParticipantRequest): Promise<Participant> {
    const participant = await this.prisma.participant.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        role: data.role || ParticipantRole.CLIENT,
        services: data.services || [],
        contactPreferences: data.contactPreferences ? JSON.stringify(data.contactPreferences) : undefined,
      },
    });

    return this.mapParticipantFromDB(participant);
  }

  /**
   * Update an existing participant
   */
  async updateParticipant(data: UpdateParticipantRequest): Promise<Participant> {
    const participant = await this.prisma.participant.update({
      where: { id: data.id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.company !== undefined && { company: data.company }),
        ...(data.role && { role: data.role }),
        ...(data.services && { services: data.services }),
        ...(data.contactPreferences && { 
          contactPreferences: JSON.stringify(data.contactPreferences) 
        }),
      },
    });

    return this.mapParticipantFromDB(participant);
  }

  /**
   * Get participant by ID
   */
  async getParticipant(id: string): Promise<Participant | null> {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
    });

    return participant ? this.mapParticipantFromDB(participant) : null;
  }

  /**
   * Search participants with filters
   */
  async searchParticipants(
    filters: ParticipantSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<ParticipantSearchResult> {
    const where: any = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }
    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }
    if (filters.phone) {
      where.phone = { contains: filters.phone };
    }
    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }
    if (filters.services && filters.services.length > 0) {
      where.services = { hasSome: filters.services };
    }

    const [participants, total] = await Promise.all([
      this.prisma.participant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.participant.count({ where }),
    ]);

    return {
      participants: participants.map((p: any) => this.mapParticipantFromDB(p)),
      total,
      page,
      limit,
    };
  }

  /**
   * Delete a participant
   */
  async deleteParticipant(id: string): Promise<void> {
    await this.prisma.participant.delete({
      where: { id },
    });
  }

  /**
   * Find participant by phone or email (for voice commands)
   */
  async findParticipantByContact(phone?: string, email?: string): Promise<Participant | null> {
    if (!phone && !email) return null;

    const where: any = {};
    if (phone && email) {
      where.OR = [{ phone }, { email }];
    } else if (phone) {
      where.phone = phone;
    } else if (email) {
      where.email = email;
    }

    const participant = await this.prisma.participant.findFirst({ where });
    return participant ? this.mapParticipantFromDB(participant) : null;
  }

  // ===== APPOINTMENT MANAGEMENT =====

  /**
   * Create a new appointment
   */
  async createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
    const appointment = await this.prisma.appointment.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        timezone: data.timezone || 'America/Toronto',
        service: data.service as any,
        location: data.location,
        organizerId: data.organizerId,
        voiceCommandData: data.voiceCommandData ? JSON.stringify(data.voiceCommandData) : undefined,
        participants: {
          create: data.participantIds.map(participantId => ({
            participantId,
            responseStatus: 'NEEDS_ACTION',
            role: participantId === data.organizerId ? 'ORGANIZER' : 'ATTENDEE',
          })),
        },
      },
      include: {
        organizer: true,
        participants: {
          include: {
            participant: true,
          },
        },
        notifications: true,
      },
    });

    return this.mapAppointmentFromDB(appointment);
  }

  /**
   * Update an existing appointment
   */
  async updateAppointment(data: UpdateAppointmentRequest): Promise<Appointment> {
    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.startTime) updateData.startTime = new Date(data.startTime);
    if (data.endTime) updateData.endTime = new Date(data.endTime);
    if (data.timezone) updateData.timezone = data.timezone;
    if (data.service) updateData.service = data.service;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.status) updateData.status = data.status;

    const appointment = await this.prisma.appointment.update({
      where: { id: data.id },
      data: updateData,
      include: {
        organizer: true,
        participants: {
          include: {
            participant: true,
          },
        },
        notifications: true,
      },
    });

    return this.mapAppointmentFromDB(appointment);
  }

  /**
   * Get appointment by ID
   */
  async getAppointment(id: string): Promise<Appointment | null> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        organizer: true,
        participants: {
          include: {
            participant: true,
          },
        },
        notifications: true,
      },
    });

    return appointment ? this.mapAppointmentFromDB(appointment) : null;
  }

  /**
   * Search appointments with filters
   */
  async searchAppointments(
    filters: AppointmentSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<AppointmentSearchResult> {
    const where: any = {};

    if (filters.startDate) {
      where.startTime = { gte: new Date(filters.startDate) };
    }
    if (filters.endDate) {
      where.endTime = { lte: new Date(filters.endDate) };
    }
    if (filters.service) {
      where.service = filters.service;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.organizerId) {
      where.organizerId = filters.organizerId;
    }
    if (filters.participantId) {
      where.participants = {
        some: { participantId: filters.participantId },
      };
    }
    if (filters.location) {
      where.location = { contains: filters.location, mode: 'insensitive' };
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          organizer: true,
          participants: {
            include: {
              participant: true,
            },
          },
          notifications: true,
        },
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      appointments: appointments.map((a: any) => this.mapAppointmentFromDB(a)),
      total,
      page,
      limit,
    };
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const appointment = await this.updateAppointment({
      id,
      status: AppointmentStatus.CANCELLED,
    });

    // Send cancellation notifications
    await this.sendAppointmentNotifications(id, NotificationType.CANCELLATION);

    return appointment;
  }

  /**
   * Check availability for participants
   */
  async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    const startDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);
    const duration = request.duration;

    // Get existing appointments for participants in the date range
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        participants: {
          some: {
            participantId: { in: request.participantIds },
          },
        },
        startTime: { gte: startDate },
        endTime: { lte: endDate },
        status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      include: {
        participants: {
          include: {
            participant: true,
          },
        },
      },
    });

    // Generate time slots and check conflicts
    const availableSlots: AvailabilitySlot[] = [];
    const conflicts: AppointmentConflict[] = [];

    // Simple implementation - generate hourly slots
    const current = new Date(startDate);
    while (current < endDate) {
      const slotEnd = new Date(current.getTime() + duration * 60000);
      
      const hasConflict = existingAppointments.some((apt: any) => {
        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        return (current < aptEnd && slotEnd > aptStart);
      });

      availableSlots.push({
        startTime: current.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !hasConflict,
        conflictReason: hasConflict ? 'Existing appointment' : undefined,
      });

      // Add conflicts
      if (hasConflict) {
        const conflictingApt = existingAppointments.find((apt: any) => {
          const aptStart = new Date(apt.startTime);
          const aptEnd = new Date(apt.endTime);
          return (current < aptEnd && slotEnd > aptStart);
        });

        if (conflictingApt) {
          conflictingApt.participants.forEach((p: any) => {
            if (request.participantIds.includes(p.participantId)) {
              conflicts.push({
                participantId: p.participantId,
                participantName: p.participant.name,
                conflictingAppointmentId: conflictingApt.id,
                conflictingAppointmentTitle: conflictingApt.title,
                conflictTime: {
                  start: conflictingApt.startTime.toISOString(),
                  end: conflictingApt.endTime.toISOString(),
                },
              });
            }
          });
        }
      }

      current.setHours(current.getHours() + 1);
    }

    // Generate suggestions (next available slots)
    const suggestions = availableSlots
      .filter(slot => slot.available)
      .slice(0, 5);

    return {
      availableSlots,
      conflicts,
      suggestions,
    };
  }

  // ===== VOICE COMMAND INTEGRATION =====

  /**
   * Process voice booking request
   */
  async processVoiceBooking(request: VoiceBookingRequest): Promise<VoiceBookingResponse> {
    try {
      // Create voice command record
      const voiceCommand = await this.prisma.voiceCommand.create({
        data: {
          transcript: request.transcript,
          intent: VoiceIntent.UNKNOWN,
          confidence: 0,
          status: VoiceCommandStatus.PROCESSING,
          voiceProvider: request.voiceProvider,
          sessionId: request.sessionId,
        },
      });

      // Parse the voice command (simplified implementation)
      const parsedCommand = await this.parseVoiceCommand(request.transcript);

      // Update voice command with parsed data
      await this.prisma.voiceCommand.update({
        where: { id: voiceCommand.id },
        data: {
          intent: parsedCommand.intent,
          confidence: parsedCommand.confidence,
          participantName: parsedCommand.participantName,
          participantPhone: parsedCommand.participantPhone,
          service: parsedCommand.service as any,
          requestedDateTime: parsedCommand.requestedDateTime,
        },
      });

      // Process based on intent
      if (parsedCommand.intent === VoiceIntent.BOOK_APPOINTMENT) {
        return await this.processVoiceAppointmentBooking(voiceCommand.id, parsedCommand);
      } else if (parsedCommand.intent === VoiceIntent.CHECK_CALENDAR) {
        return await this.processVoiceCalendarCheck(parsedCommand);
      }

      return {
        success: false,
        intent: parsedCommand.intent,
        confidence: parsedCommand.confidence,
        clarificationNeeded: true,
        clarificationQuestion: "I didn't understand your request. Could you please rephrase?",
      };

    } catch (error) {
      return {
        success: false,
        intent: VoiceIntent.UNKNOWN,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Parse voice command (simplified implementation)
   */
  private async parseVoiceCommand(transcript: string): Promise<{
    intent: VoiceIntent;
    confidence: number;
    participantName?: string;
    participantPhone?: string;
    service?: ServiceType;
    requestedDateTime?: Date;
  }> {
    const lowerTranscript = transcript.toLowerCase();

    // Simple keyword-based parsing (in production, use proper NLP)
    let intent = VoiceIntent.UNKNOWN;
    let confidence = 0.5;

    if (lowerTranscript.includes('book') || lowerTranscript.includes('schedule')) {
      intent = VoiceIntent.BOOK_APPOINTMENT;
      confidence = 0.8;
    } else if (lowerTranscript.includes('check') || lowerTranscript.includes('calendar')) {
      intent = VoiceIntent.CHECK_CALENDAR;
      confidence = 0.7;
    } else if (lowerTranscript.includes('cancel')) {
      intent = VoiceIntent.CANCEL_APPOINTMENT;
      confidence = 0.8;
    }

    // Extract service type
    let service: ServiceType | undefined;
    if (lowerTranscript.includes('lawn')) service = 'lawn_care';
    else if (lowerTranscript.includes('snow')) service = 'snow_removal';
    else if (lowerTranscript.includes('landscape')) service = 'landscaping';
    else if (lowerTranscript.includes('maintenance')) service = 'maintenance';

    // Extract participant name (very basic)
    const nameMatch = lowerTranscript.match(/with\s+([a-zA-Z\s]+)/);
    const participantName = nameMatch ? nameMatch[1].trim() : undefined;

    // Extract phone number
    const phoneMatch = transcript.match(/(\d{3}[-.\s]?\d{3}[-.\s]?\d{4})/);
    const participantPhone = phoneMatch ? phoneMatch[1] : undefined;

    return {
      intent,
      confidence,
      participantName,
      participantPhone,
      service,
    };
  }

  /**
   * Process voice appointment booking
   */
  private async processVoiceAppointmentBooking(
    voiceCommandId: string,
    parsedCommand: any
  ): Promise<VoiceBookingResponse> {
    try {
      // Find or create participant
      let participant: Participant | null = null;

      if (parsedCommand.participantPhone) {
        participant = await this.findParticipantByContact(parsedCommand.participantPhone);
      }

      if (!participant && parsedCommand.participantName) {
        // Search by name
        const searchResult = await this.searchParticipants({
          name: parsedCommand.participantName,
        }, 1, 1);

        if (searchResult.participants.length > 0) {
          participant = searchResult.participants[0];
        }
      }

      if (!participant) {
        return {
          success: false,
          intent: parsedCommand.intent,
          confidence: parsedCommand.confidence,
          clarificationNeeded: true,
          clarificationQuestion: "I couldn't find that contact. Could you provide their phone number or full name?",
        };
      }

      // Get default organizer (service provider)
      const organizer = await this.prisma.participant.findFirst({
        where: { role: ParticipantRole.SERVICE_PROVIDER },
      });

      if (!organizer) {
        throw new Error('No service provider found');
      }

      // Create appointment (with default time if not specified)
      const defaultStartTime = new Date();
      defaultStartTime.setHours(defaultStartTime.getHours() + 24); // Tomorrow
      defaultStartTime.setMinutes(0, 0, 0);

      const appointment = await this.createAppointment({
        title: `${parsedCommand.service || 'Service'} - ${participant.name}`,
        startTime: parsedCommand.requestedDateTime?.toISOString() || defaultStartTime.toISOString(),
        endTime: new Date(defaultStartTime.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour
        service: parsedCommand.service || 'maintenance',
        organizerId: organizer.id,
        participantIds: [organizer.id, participant.id],
        voiceCommandData: {
          originalTranscript: parsedCommand.transcript,
          confidence: parsedCommand.confidence,
          voiceProvider: parsedCommand.voiceProvider,
          sessionId: parsedCommand.sessionId,
        },
      });

      // Update voice command with appointment ID
      await this.prisma.voiceCommand.update({
        where: { id: voiceCommandId },
        data: {
          appointmentId: appointment.id,
          status: VoiceCommandStatus.COMPLETED,
        },
      });

      // Send confirmation notifications
      await this.sendAppointmentNotifications(appointment.id, NotificationType.CONFIRMATION);

      return {
        success: true,
        intent: parsedCommand.intent,
        confidence: parsedCommand.confidence,
        appointmentId: appointment.id,
        appointment,
      };

    } catch (error) {
      await this.prisma.voiceCommand.update({
        where: { id: voiceCommandId },
        data: {
          status: VoiceCommandStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      return {
        success: false,
        intent: parsedCommand.intent,
        confidence: parsedCommand.confidence,
        error: error instanceof Error ? error.message : 'Failed to create appointment',
      };
    }
  }

  /**
   * Process voice calendar check
   */
  private async processVoiceCalendarCheck(parsedCommand: any): Promise<VoiceBookingResponse> {
    // Implementation for checking calendar via voice
    // This would return upcoming appointments
    return {
      success: true,
      intent: VoiceIntent.CHECK_CALENDAR,
      confidence: parsedCommand.confidence,
    };
  }

  // ===== NOTIFICATION SYSTEM =====

  /**
   * Send appointment notifications using Gmail API
   */
  async sendAppointmentNotifications(
    appointmentId: string,
    type: NotificationType
  ): Promise<void> {
    const appointment = await this.getAppointment(appointmentId);
    if (!appointment) {
      console.error('❌ Appointment not found:', appointmentId);
      return;
    }

    console.log('📧 Sending notifications for appointment:', appointmentId, 'Type:', type);

    // Send notifications to all participants (excluding organizer)
    for (const participant of appointment.participants) {
      // Skip organizer notifications for now
      if (participant.role === 'ORGANIZER') continue;
      
      const contactPrefs = participant.participant.contactPreferences;
      
      // Only send email notifications if participant has email and email is enabled
      if (participant.participant.email && (contactPrefs?.email !== false)) {
        try {
          let result: { success: boolean; messageId?: string; error?: string } = { success: false };

          switch (type) {
            case NotificationType.CONFIRMATION:
              result = await gmailNotificationService.sendAppointmentConfirmation(
                appointment, 
                participant.participant
              );
              break;
              
            case NotificationType.REMINDER_24H:
              result = await gmailNotificationService.sendAppointmentReminder(
                appointment, 
                participant.participant, 
                '24h'
              );
              break;
              
            case NotificationType.REMINDER_1H:
              result = await gmailNotificationService.sendAppointmentReminder(
                appointment, 
                participant.participant, 
                '1h'
              );
              break;
              
            case NotificationType.CANCELLATION:
              result = await gmailNotificationService.sendAppointmentCancellation(
                appointment, 
                participant.participant
              );
              break;
              
            default:
              console.warn('⚠️ Unsupported notification type:', type);
              continue;
          }

          // Log notification in database
          if (result.success) {
            await this.createNotification({
              appointmentId,
              type,
              channel: NotificationChannel.EMAIL,
              recipient: participant.participant.email,
              content: `Gmail notification sent successfully (${result.messageId})`,
            });
            console.log('✅ Email notification sent to:', participant.participant.email);
          } else {
            await this.createNotification({
              appointmentId,
              type,
              channel: NotificationChannel.EMAIL,
              recipient: participant.participant.email,
              content: `Failed to send Gmail notification: ${result.error}`,
            });
            console.error('❌ Failed to send email to:', participant.participant.email, result.error);
          }

        } catch (error) {
          console.error('❌ Notification error for', participant.participant.email, ':', error);
          
          // Still log the failed attempt
          await this.createNotification({
            appointmentId,
            type,
            channel: NotificationChannel.EMAIL,
            recipient: participant.participant.email,
            content: `Notification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }
      } else {
        console.log('⏭️ Skipping notification for participant (no email or email disabled):', participant.participant.name);
      }
    }
  }

  /**
   * Create notification record
   */
  private async createNotification(data: {
    appointmentId: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    content: string;
  }): Promise<NotificationLog> {
    const notification = await this.prisma.notificationLog.create({
      data: {
        appointmentId: data.appointmentId,
        type: data.type,
        channel: data.channel,
        recipient: data.recipient,
        content: data.content,
        status: NotificationStatus.PENDING,
        retryCount: 0,
      },
    });

    return this.mapNotificationFromDB(notification);
  }

  /**
   * Generate notification content
   */
  private generateNotificationContent(
    type: NotificationType,
    appointment: Appointment,
    participant: Participant
  ): string {
    const startTime = new Date(appointment.startTime).toLocaleString();

    switch (type) {
      case NotificationType.CONFIRMATION:
        return `Hi ${participant.name}, your ${appointment.service} appointment is confirmed for ${startTime}. Location: ${appointment.location || 'TBD'}`;
      
      case NotificationType.REMINDER_24H:
        return `Reminder: You have a ${appointment.service} appointment tomorrow at ${startTime}. Location: ${appointment.location || 'TBD'}`;
      
      case NotificationType.REMINDER_1H:
        return `Your ${appointment.service} appointment starts in 1 hour at ${startTime}. Location: ${appointment.location || 'TBD'}`;
      
      case NotificationType.CANCELLATION:
        return `Your ${appointment.service} appointment scheduled for ${startTime} has been cancelled.`;
      
      default:
        return `Update regarding your ${appointment.service} appointment on ${startTime}`;
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Map database participant to interface
   */
  private mapParticipantFromDB(dbParticipant: any): Participant {
    return {
      id: dbParticipant.id,
      name: dbParticipant.name,
      email: dbParticipant.email,
      phone: dbParticipant.phone,
      company: dbParticipant.company,
      role: dbParticipant.role,
      services: dbParticipant.services,
      contactPreferences: dbParticipant.contactPreferences 
        ? JSON.parse(dbParticipant.contactPreferences) 
        : undefined,
      bixbyContactId: dbParticipant.bixbyContactId,
      googleContactId: dbParticipant.googleContactId,
      createdAt: dbParticipant.createdAt.toISOString(),
      updatedAt: dbParticipant.updatedAt.toISOString(),
    };
  }

  /**
   * Map database appointment to interface
   */
  private mapAppointmentFromDB(dbAppointment: any): Appointment {
    return {
      id: dbAppointment.id,
      title: dbAppointment.title,
      description: dbAppointment.description,
      startTime: dbAppointment.startTime.toISOString(),
      endTime: dbAppointment.endTime.toISOString(),
      timezone: dbAppointment.timezone,
      service: dbAppointment.service,
      location: dbAppointment.location,
      status: dbAppointment.status,
      organizerId: dbAppointment.organizerId,
      organizer: this.mapParticipantFromDB(dbAppointment.organizer),
      participants: dbAppointment.participants.map((p: any) => ({
        id: p.id,
        appointmentId: p.appointmentId,
        participantId: p.participantId,
        participant: this.mapParticipantFromDB(p.participant),
        responseStatus: p.responseStatus,
        role: p.role,
        notes: p.notes,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })),
      notifications: dbAppointment.notifications.map((n: any) => this.mapNotificationFromDB(n)),
      voiceCommandData: dbAppointment.voiceCommandData 
        ? JSON.parse(dbAppointment.voiceCommandData) 
        : undefined,
      googleCalendarEventId: dbAppointment.googleCalendarEventId,
      outlookCalendarEventId: dbAppointment.outlookCalendarEventId,
      createdAt: dbAppointment.createdAt.toISOString(),
      updatedAt: dbAppointment.updatedAt.toISOString(),
    };
  }

  /**
   * Map database notification to interface
   */
  private mapNotificationFromDB(dbNotification: any): NotificationLog {
    return {
      id: dbNotification.id,
      appointmentId: dbNotification.appointmentId,
      type: dbNotification.type,
      channel: dbNotification.channel,
      recipient: dbNotification.recipient,
      status: dbNotification.status,
      sentAt: dbNotification.sentAt?.toISOString(),
      deliveredAt: dbNotification.deliveredAt?.toISOString(),
      readAt: dbNotification.readAt?.toISOString(),
      content: dbNotification.content,
      templateUsed: dbNotification.templateUsed,
      errorMessage: dbNotification.errorMessage,
      retryCount: dbNotification.retryCount,
      createdAt: dbNotification.createdAt.toISOString(),
      updatedAt: dbNotification.updatedAt.toISOString(),
    };
  }
}

// Export singleton instance
export const participantManagementService = new ParticipantManagementService();

// Export utility functions
export async function createParticipant(data: CreateParticipantRequest): Promise<Participant> {
  return participantManagementService.createParticipant(data);
}

export async function createAppointment(data: CreateAppointmentRequest): Promise<Appointment> {
  return participantManagementService.createAppointment(data);
}

export async function processVoiceBooking(data: VoiceBookingRequest): Promise<VoiceBookingResponse> {
  return participantManagementService.processVoiceBooking(data);
}

export async function checkAvailability(data: AvailabilityRequest): Promise<AvailabilityResponse> {
  return participantManagementService.checkAvailability(data);
}
