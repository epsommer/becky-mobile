// Google Calendar integration service for follow-ups
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { PrismaClient } from '@prisma/client';
import {
  CalendarEvent,
  CalendarReminder,
  GoogleCalendarIntegration,
  FollowUpWithRelations
} from '@/types/follow-up';

const prisma = new PrismaClient();

interface GoogleCalendarConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export class GoogleCalendarService {
  private config: GoogleCalendarConfig;
  private oauth2Client: OAuth2Client;

  constructor() {
    this.config = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback'
    };

    this.oauth2Client = new google.auth.OAuth2(
      this.config.clientId,
      this.config.clientSecret,
      this.config.redirectUri
    );
  }

  // Generate OAuth URL for authorization
  generateAuthUrl(scopes: string[] = ['https://www.googleapis.com/auth/calendar']): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  // Exchange authorization code for tokens
  async getTokensFromCode(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate?: number;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error('Failed to obtain access token');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token || '',
      expiryDate: tokens.expiry_date || undefined
    };
  }

  // Set credentials for authenticated requests
  private setCredentials(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });
  }

  // Refresh access token if needed
  private async refreshAccessToken(refreshToken: string): Promise<string> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();
    
    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    return credentials.access_token;
  }

  // Create a calendar event for a follow-up
  async createFollowUpEvent(
    followUp: FollowUpWithRelations,
    integration: GoogleCalendarIntegration
  ): Promise<string> {
    try {
      // Set up authentication
      this.setCredentials(integration.accessToken, integration.refreshToken);
      
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Calculate end time
      const endTime = new Date(followUp.scheduledDate.getTime() + followUp.duration * 60000);
      
      // Prepare event data
      const eventData = {
        summary: followUp.title || `Follow-up: ${followUp.client.name}`,
        description: this.buildEventDescription(followUp),
        start: {
          dateTime: followUp.scheduledDate.toISOString(),
          timeZone: followUp.timezone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: followUp.timezone
        },
        attendees: this.buildAttendeesList(followUp),
        reminders: {
          useDefault: false,
          overrides: this.buildReminders(followUp)
        },
        location: this.extractLocation(followUp),
        colorId: this.getCategoryColor(followUp.category),
        extendedProperties: {
          private: {
            followUpId: followUp.id,
            clientId: followUp.clientId,
            category: followUp.category,
            priority: followUp.priority
          }
        }
      };

      // Create the event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventData
      });

      if (!response.data.id) {
        throw new Error('Failed to create calendar event');
      }

      // Update follow-up with calendar event ID
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { googleCalendarEventId: response.data.id }
      });

      return response.data.id;

    } catch (error) {
      // Handle token refresh
      if ((error as any)?.code === 401 && integration.refreshToken) {
        try {
          const newAccessToken = await this.refreshAccessToken(integration.refreshToken);
          
          // Update stored token
          // Note: In production, you'd update this in your database
          const updatedIntegration = { ...integration, accessToken: newAccessToken };
          
          // Retry the operation
          return this.createFollowUpEvent(followUp, updatedIntegration);
        } catch (refreshError) {
          throw new Error(`Failed to refresh token and create event: ${((refreshError instanceof Error) ? refreshError.message : String(refreshError))}`);
        }
      }
      
      throw new Error(`Failed to create calendar event: ${((error instanceof Error) ? error.message : String(error))}`);
    }
  }

  // Update an existing calendar event
  async updateFollowUpEvent(
    followUp: FollowUpWithRelations,
    integration: GoogleCalendarIntegration
  ): Promise<void> {
    if (!followUp.googleCalendarEventId) {
      throw new Error('No Google Calendar event ID found for this follow-up');
    }

    try {
      this.setCredentials(integration.accessToken, integration.refreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const endTime = new Date(followUp.scheduledDate.getTime() + followUp.duration * 60000);
      
      const eventData = {
        summary: followUp.title || `Follow-up: ${followUp.client.name}`,
        description: this.buildEventDescription(followUp),
        start: {
          dateTime: followUp.scheduledDate.toISOString(),
          timeZone: followUp.timezone
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: followUp.timezone
        },
        attendees: this.buildAttendeesList(followUp),
        reminders: {
          useDefault: false,
          overrides: this.buildReminders(followUp)
        },
        location: this.extractLocation(followUp),
        colorId: this.getCategoryColor(followUp.category),
        extendedProperties: {
          private: {
            followUpId: followUp.id,
            clientId: followUp.clientId,
            category: followUp.category,
            priority: followUp.priority,
            status: followUp.status
          }
        }
      };

      await calendar.events.update({
        calendarId: 'primary',
        eventId: followUp.googleCalendarEventId,
        requestBody: eventData
      });

    } catch (error) {
      if ((error as any)?.code === 401 && integration.refreshToken) {
        const newAccessToken = await this.refreshAccessToken(integration.refreshToken);
        const updatedIntegration = { ...integration, accessToken: newAccessToken };
        return this.updateFollowUpEvent(followUp, updatedIntegration);
      }
      
      throw new Error(`Failed to update calendar event: ${((error instanceof Error) ? error.message : String(error))}`);
    }
  }

  // Delete a calendar event
  async deleteFollowUpEvent(
    googleCalendarEventId: string,
    integration: GoogleCalendarIntegration
  ): Promise<void> {
    try {
      this.setCredentials(integration.accessToken, integration.refreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: googleCalendarEventId
      });

    } catch (error) {
      if ((error as any)?.code === 401 && integration.refreshToken) {
        const newAccessToken = await this.refreshAccessToken(integration.refreshToken);
        const updatedIntegration = { ...integration, accessToken: newAccessToken };
        return this.deleteFollowUpEvent(googleCalendarEventId, updatedIntegration);
      }
      
      // Don't throw error if event doesn't exist (already deleted)
      if ((error as any)?.code !== 404) {
        throw new Error(`Failed to delete calendar event: ${((error instanceof Error) ? error.message : String(error))}`);
      }
    }
  }

  // Sync follow-ups with calendar (two-way sync)
  async syncFollowUpsWithCalendar(
    clientId: string,
    integration: GoogleCalendarIntegration,
    syncFromDate: Date = new Date(),
    syncToDate: Date = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days
  ): Promise<{
    created: number;
    updated: number;
    deleted: number;
    errors: string[];
  }> {
    const result = {
      created: 0,
      updated: 0,
      deleted: 0,
      errors: [] as string[]
    };

    try {
      this.setCredentials(integration.accessToken, integration.refreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });

      // Get follow-ups from database
      const followUps = await prisma.followUp.findMany({
        where: {
          clientId,
          scheduledDate: {
            gte: syncFromDate,
            lte: syncToDate
          },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] }
        },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              company: true
            }
          },
          notifications: true
        }
      });

      // Get calendar events in the same period
      const calendarResponse = await calendar.events.list({
        calendarId: 'primary',
        timeMin: syncFromDate.toISOString(),
        timeMax: syncToDate.toISOString(),
        q: 'Follow-up', // Search for follow-up events
        singleEvents: true,
        orderBy: 'startTime'
      });

      const calendarEvents = calendarResponse.data.items || [];

      // Create missing calendar events
      for (const followUp of followUps) {
        if (!followUp.googleCalendarEventId) {
          try {
            const eventId = await this.createFollowUpEvent(followUp, integration);
            result.created++;
          } catch (error) {
            result.errors.push(`Failed to create event for follow-up ${followUp.id}: ${((error instanceof Error) ? error.message : String(error))}`);
          }
        } else {
          // Check if event still exists in calendar
          const existsInCalendar = calendarEvents.some(
            event => event.id === followUp.googleCalendarEventId
          );

          if (!existsInCalendar) {
            try {
              await this.createFollowUpEvent(followUp, integration);
              result.created++;
            } catch (error) {
              result.errors.push(`Failed to recreate missing event for follow-up ${followUp.id}: ${((error instanceof Error) ? error.message : String(error))}`);
            }
          } else {
            // Update existing event
            try {
              await this.updateFollowUpEvent(followUp, integration);
              result.updated++;
            } catch (error) {
              result.errors.push(`Failed to update event for follow-up ${followUp.id}: ${((error instanceof Error) ? error.message : String(error))}`);
            }
          }
        }
      }

      // Handle orphaned calendar events (events in calendar but not in database)
      const followUpEventIds = followUps
        .map(fu => fu.googleCalendarEventId)
        .filter(Boolean);

      for (const event of calendarEvents) {
        if (event.id && !followUpEventIds.includes(event.id)) {
          // Check if this is a follow-up event by looking at extended properties
          const isFollowUpEvent = event.extendedProperties?.private?.followUpId;
          
          if (isFollowUpEvent) {
            try {
              await this.deleteFollowUpEvent(event.id, integration);
              result.deleted++;
            } catch (error) {
              result.errors.push(`Failed to delete orphaned event ${event.id}: ${((error instanceof Error) ? error.message : String(error))}`);
            }
          }
        }
      }

    } catch (error) {
      result.errors.push(`Sync failed: ${((error instanceof Error) ? error.message : String(error))}`);
    }

    return result;
  }

  // Build event description from follow-up data
  private buildEventDescription(followUp: FollowUpWithRelations): string {
    const lines = [];
    
    lines.push(`Follow-up with ${followUp.client.name}`);
    
    if (followUp.client.company) {
      lines.push(`Company: ${followUp.client.company}`);
    }
    
    lines.push(`Category: ${followUp.category}`);
    lines.push(`Priority: ${followUp.priority}`);
    lines.push(`Duration: ${followUp.duration} minutes`);
    
    if (followUp.notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(followUp.notes);
    }
    
    if (followUp.actionItems && Array.isArray(followUp.actionItems) && followUp.actionItems.length > 0) {
      lines.push('');
      lines.push('Action Items:');
      (followUp.actionItems as string[]).forEach((item: string) => lines.push(`• ${item}`));
    }
    
    lines.push('');
    lines.push(`Follow-up ID: ${followUp.id}`);
    lines.push(`Created: ${followUp.createdAt.toLocaleDateString()}`);
    
    return lines.join('\n');
  }

  // Build attendees list
  private buildAttendeesList(followUp: FollowUpWithRelations): Array<{ email: string; displayName?: string }> {
    const attendees = [];
    
    if (followUp.client.email) {
      attendees.push({
        email: followUp.client.email,
        displayName: followUp.client.name
      });
    }
    
    return attendees;
  }

  // Build reminder configuration
  private buildReminders(followUp: FollowUpWithRelations): CalendarReminder[] {
    const reminders: CalendarReminder[] = [];
    
    // Default reminders based on priority
    if (followUp.priority === 'URGENT') {
      reminders.push({ method: 'popup', minutes: 60 });
      reminders.push({ method: 'email', minutes: 1440 }); // 24 hours
    } else if (followUp.priority === 'HIGH') {
      reminders.push({ method: 'popup', minutes: 30 });
      reminders.push({ method: 'email', minutes: 1440 }); // 24 hours
    } else {
      reminders.push({ method: 'popup', minutes: 15 });
    }
    
    return reminders;
  }

  // Extract location from follow-up data
  private extractLocation(followUp: FollowUpWithRelations): string | undefined {
    // This could be enhanced to extract location from client address or notes
    if (followUp.client.company) {
      return `${followUp.client.company} Office`;
    }
    
    return undefined;
  }

  // Get calendar color based on follow-up category
  private getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      'COMPLAINT_RESOLUTION': '11', // Red
      'PAYMENT_FOLLOW_UP': '6',     // Orange
      'CONTRACT_RENEWAL': '9',      // Blue
      'SERVICE_CHECK': '2',         // Green
      'MAINTENANCE_REMINDER': '5',  // Yellow
      'PROJECT_UPDATE': '3',        // Purple
      'SEASONAL_PLANNING': '10',    // Light Green
      'RELATIONSHIP_BUILDING': '4', // Pink
      'UPSELL_OPPORTUNITY': '8',    // Gray
      'GENERAL': '7'                // Cyan
    };
    
    return colorMap[category] || '7'; // Default to cyan
  }

  // Test calendar integration
  async testIntegration(integration: GoogleCalendarIntegration): Promise<{
    success: boolean;
    calendarName?: string;
    error?: string;
  }> {
    try {
      this.setCredentials(integration.accessToken, integration.refreshToken);
      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      const response = await calendar.calendars.get({
        calendarId: 'primary'
      });
      
      return {
        success: true,
        calendarName: response.data.summary || 'Primary Calendar'
      };
      
    } catch (error) {
      return {
        success: false,
        error: ((error instanceof Error) ? error.message : String(error))
      };
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();