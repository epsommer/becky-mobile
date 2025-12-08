// Gmail API Notification Service
// Integrates with your existing Gmail API setup (epsommer@gmail.com)
// SERVER-SIDE ONLY - Do not import this in client components

// Prevent client-side usage
if (typeof window !== 'undefined') {
  throw new Error('Gmail notification service can only be used on the server side')
}

import { google } from 'googleapis'
import type { Appointment, Participant } from '@/types/participant-management'

interface GmailConfig {
  clientId: string
  clientSecret: string
  refreshToken: string
  fromEmail: string
}

interface NotificationTemplateData {
  participantName: string
  eventTitle: string
  eventDate: string
  eventTime: string
  eventDuration: string
  eventLocation?: string
  eventNotes?: string
  organizerName: string
  organizerEmail: string
}

export class GmailNotificationService {
  private config: GmailConfig
  private gmail: any

  constructor() {
    this.config = {
      clientId: process.env.GMAIL_CLIENT_ID || '',
      clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
      fromEmail: process.env.GMAIL_FROM_EMAIL || 'epsommer@gmail.com'
    }

    if (!this.isConfigured()) {
      console.warn('⚠️ Gmail API not properly configured. Check environment variables.')
      return
    }

    this.initializeGmailClient()
  }

  private initializeGmailClient() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        'http://localhost:3000/auth/google/callback'
      )

      oauth2Client.setCredentials({
        refresh_token: this.config.refreshToken
      })

      this.gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      console.log('✅ Gmail API client initialized')
    } catch (error) {
      console.error('❌ Failed to initialize Gmail client:', error)
    }
  }

  public isConfigured(): boolean {
    return !!(
      this.config.clientId &&
      this.config.clientSecret &&
      this.config.refreshToken &&
      this.config.fromEmail
    )
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(
    appointment: Appointment,
    participant: Participant
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.gmail) {
      return {
        success: false,
        error: 'Gmail API not configured'
      }
    }

    try {
      const templateData = this.prepareTemplateData(appointment, participant)
      const emailContent = this.generateConfirmationEmail(templateData)

      const message = await this.sendEmail({
        to: participant.email!,
        subject: `Appointment Confirmed: ${appointment.title}`,
        htmlContent: emailContent.html,
        textContent: emailContent.text
      })

      console.log('✅ Confirmation email sent to:', participant.email)
      return {
        success: true,
        messageId: message.id
      }

    } catch (error) {
      console.error('❌ Failed to send confirmation email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send appointment reminder email
   */
  async sendAppointmentReminder(
    appointment: Appointment,
    participant: Participant,
    reminderType: '24h' | '1h' = '24h'
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.gmail) {
      return {
        success: false,
        error: 'Gmail API not configured'
      }
    }

    try {
      const templateData = this.prepareTemplateData(appointment, participant)
      const emailContent = this.generateReminderEmail(templateData, reminderType)

      const subject = reminderType === '24h' 
        ? `Reminder: Appointment Tomorrow - ${appointment.title}`
        : `Reminder: Appointment in 1 Hour - ${appointment.title}`

      const message = await this.sendEmail({
        to: participant.email!,
        subject,
        htmlContent: emailContent.html,
        textContent: emailContent.text
      })

      console.log(`✅ ${reminderType} reminder sent to:`, participant.email)
      return {
        success: true,
        messageId: message.id
      }

    } catch (error) {
      console.error('❌ Failed to send reminder email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Send appointment cancellation email
   */
  async sendAppointmentCancellation(
    appointment: Appointment,
    participant: Participant
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.gmail) {
      return {
        success: false,
        error: 'Gmail API not configured'
      }
    }

    try {
      const templateData = this.prepareTemplateData(appointment, participant)
      const emailContent = this.generateCancellationEmail(templateData)

      const message = await this.sendEmail({
        to: participant.email!,
        subject: `Appointment Cancelled: ${appointment.title}`,
        htmlContent: emailContent.html,
        textContent: emailContent.text
      })

      console.log('✅ Cancellation email sent to:', participant.email)
      return {
        success: true,
        messageId: message.id
      }

    } catch (error) {
      console.error('❌ Failed to send cancellation email:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Core email sending function using Gmail API
   */
  private async sendEmail({
    to,
    subject,
    htmlContent,
    textContent
  }: {
    to: string
    subject: string
    htmlContent: string
    textContent: string
  }) {
    const emailContent = [
      `From: Evangelo Sommer <${this.config.fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: multipart/alternative; boundary="boundary123"',
      '',
      '--boundary123',
      'Content-Type: text/plain; charset=utf-8',
      '',
      textContent,
      '',
      '--boundary123',
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent,
      '',
      '--boundary123--'
    ].join('\n')

    const encodedMessage = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    })

    return response.data
  }

  /**
   * Prepare template data from appointment and participant
   */
  private prepareTemplateData(
    appointment: Appointment,
    participant: Participant
  ): NotificationTemplateData {
    const startDate = new Date(appointment.startTime)
    const endDate = new Date(appointment.endTime)
    const duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60))

    return {
      participantName: participant.name,
      eventTitle: appointment.title,
      eventDate: startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      eventTime: startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      eventDuration: `${duration} minutes`,
      eventLocation: appointment.location,
      eventNotes: appointment.description,
      organizerName: 'Evangelo Sommer',
      organizerEmail: this.config.fromEmail
    }
  }

  /**
   * Generate confirmation email template
   */
  private generateConfirmationEmail(data: NotificationTemplateData) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Confirmed</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #D4AF37; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-item { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #1f2937; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Confirmed</h1>
            </div>
            <div class="content">
                <p>Hi ${data.participantName},</p>
                <p>Your appointment has been successfully scheduled. Here are the details:</p>
                
                <div class="details">
                    <div class="detail-item">
                        <span class="detail-label">Service:</span> ${data.eventTitle}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span> ${data.eventDate}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time:</span> ${data.eventTime}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span> ${data.eventDuration}
                    </div>
                    ${data.eventLocation ? `
                    <div class="detail-item">
                        <span class="detail-label">Location:</span> ${data.eventLocation}
                    </div>
                    ` : ''}
                    ${data.eventNotes ? `
                    <div class="detail-item">
                        <span class="detail-label">Notes:</span> ${data.eventNotes}
                    </div>
                    ` : ''}
                </div>
                
                <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
                <p>We look forward to working with you!</p>
                
                <p>Best regards,<br>
                ${data.organizerName}</p>
            </div>
            <div class="footer">
                <p>This email was sent from ${data.organizerEmail}</p>
            </div>
        </div>
    </body>
    </html>
    `

    const text = `
Appointment Confirmed

Hi ${data.participantName},

Your appointment has been successfully scheduled. Here are the details:

Service: ${data.eventTitle}
Date: ${data.eventDate}
Time: ${data.eventTime}
Duration: ${data.eventDuration}
${data.eventLocation ? `Location: ${data.eventLocation}\n` : ''}${data.eventNotes ? `Notes: ${data.eventNotes}\n` : ''}

If you need to reschedule or cancel, please contact us as soon as possible.

We look forward to working with you!

Best regards,
${data.organizerName}
${data.organizerEmail}
    `.trim()

    return { html, text }
  }

  /**
   * Generate reminder email template
   */
  private generateReminderEmail(data: NotificationTemplateData, reminderType: '24h' | '1h') {
    const timeText = reminderType === '24h' ? 'tomorrow' : 'in 1 hour'
    
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Reminder</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Reminder</h1>
            </div>
            <div class="content">
                <p>Hi ${data.participantName},</p>
                <p>This is a reminder that you have an appointment scheduled ${timeText}:</p>
                
                <div class="details">
                    <h3>${data.eventTitle}</h3>
                    <p><strong>Date:</strong> ${data.eventDate}</p>
                    <p><strong>Time:</strong> ${data.eventTime}</p>
                    <p><strong>Duration:</strong> ${data.eventDuration}</p>
                    ${data.eventLocation ? `<p><strong>Location:</strong> ${data.eventLocation}</p>` : ''}
                </div>
                
                <p>We look forward to seeing you ${timeText}!</p>
                
                <p>Best regards,<br>
                ${data.organizerName}</p>
            </div>
            <div class="footer">
                <p>This email was sent from ${data.organizerEmail}</p>
            </div>
        </div>
    </body>
    </html>
    `

    const text = `
Appointment Reminder

Hi ${data.participantName},

This is a reminder that you have an appointment scheduled ${timeText}:

${data.eventTitle}
Date: ${data.eventDate}
Time: ${data.eventTime}
Duration: ${data.eventDuration}
${data.eventLocation ? `Location: ${data.eventLocation}\n` : ''}

We look forward to seeing you ${timeText}!

Best regards,
${data.organizerName}
${data.organizerEmail}
    `.trim()

    return { html, text }
  }

  /**
   * Generate cancellation email template
   */
  private generateCancellationEmail(data: NotificationTemplateData) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Cancelled</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #fef2f2; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Cancelled</h1>
            </div>
            <div class="content">
                <p>Hi ${data.participantName},</p>
                <p>We need to inform you that your appointment has been cancelled:</p>
                
                <div class="details">
                    <h3>${data.eventTitle}</h3>
                    <p><strong>Originally scheduled:</strong> ${data.eventDate} at ${data.eventTime}</p>
                </div>
                
                <p>We apologize for any inconvenience this may cause. If you would like to reschedule, please contact us.</p>
                
                <p>Best regards,<br>
                ${data.organizerName}</p>
            </div>
            <div class="footer">
                <p>This email was sent from ${data.organizerEmail}</p>
            </div>
        </div>
    </body>
    </html>
    `

    const text = `
Appointment Cancelled

Hi ${data.participantName},

We need to inform you that your appointment has been cancelled:

${data.eventTitle}
Originally scheduled: ${data.eventDate} at ${data.eventTime}

We apologize for any inconvenience this may cause. If you would like to reschedule, please contact us.

Best regards,
${data.organizerName}
${data.organizerEmail}
    `.trim()

    return { html, text }
  }

  /**
   * Send reschedule notification to participant
   */
  async sendAppointmentReschedule(
    originalAppointment: Appointment,
    newAppointment: Appointment,
    participant: Participant,
    reason?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured() || !this.gmail) {
      return {
        success: false,
        error: 'Gmail API not configured properly'
      }
    }

    try {
      const originalData = this.prepareTemplateData(originalAppointment, participant)
      const newData = this.prepareTemplateData(newAppointment, participant)
      const { html, text } = this.generateRescheduleEmail(originalData, newData, reason)

      if (!participant.email) {
        return {
          success: false,
          error: 'Participant has no email address'
        }
      }

      const result = await this.sendEmail({
        to: participant.email,
        subject: `Appointment Rescheduled: ${newAppointment.title}`,
        htmlContent: html,
        textContent: text
      })

      console.log(`📧 Reschedule notification sent to ${participant.email}`)
      return {
        success: true,
        messageId: result.id
      }
    } catch (error) {
      console.error('❌ Failed to send reschedule notification:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate reschedule email template
   */
  private generateRescheduleEmail(originalData: NotificationTemplateData, newData: NotificationTemplateData, reason?: string) {
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Appointment Rescheduled</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #fefce8; padding: 30px; border-radius: 0 0 8px 8px; }
            .details { background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .details.original { border-left: 4px solid #dc2626; }
            .details.new { border-left: 4px solid #16a34a; }
            .detail-item { margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .detail-label { font-weight: bold; color: #1f2937; }
            .footer { text-align: center; margin-top: 30px; padding: 20px; color: #6b7280; font-size: 14px; }
            .reason-box { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            .arrow { text-align: center; font-size: 24px; color: #f59e0b; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Appointment Rescheduled</h1>
            </div>
            <div class="content">
                <p>Hi ${newData.participantName},</p>
                <p>We need to reschedule your appointment. Here are the updated details:</p>
                
                <div class="details original">
                    <h3>Original Time</h3>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span> ${originalData.eventDate}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time:</span> ${originalData.eventTime}
                    </div>
                </div>

                <div class="arrow">↓</div>

                <div class="details new">
                    <h3>New Time</h3>
                    <div class="detail-item">
                        <span class="detail-label">Event:</span> ${newData.eventTitle}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Date:</span> ${newData.eventDate}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Time:</span> ${newData.eventTime}
                    </div>
                    <div class="detail-item">
                        <span class="detail-label">Duration:</span> ${newData.eventDuration}
                    </div>
                    ${newData.eventLocation ? `
                    <div class="detail-item">
                        <span class="detail-label">Location:</span> ${newData.eventLocation}
                    </div>
                    ` : ''}
                    ${newData.eventNotes ? `
                    <div class="detail-item">
                        <span class="detail-label">Notes:</span> ${newData.eventNotes}
                    </div>
                    ` : ''}
                </div>

                ${reason ? `
                <div class="reason-box">
                    <strong>Reason for reschedule:</strong><br>
                    ${reason}
                </div>
                ` : ''}
                
                <p>We apologize for any inconvenience this may cause. Please update your calendar with the new time.</p>
                <p>If you have any questions or conflicts with the new time, please contact us immediately.</p>
                
                <p>Best regards,<br>
                ${newData.organizerName}</p>
            </div>
            <div class="footer">
                <p>This email was sent from ${newData.organizerEmail}</p>
            </div>
        </div>
    </body>
    </html>
    `

    const text = `
Appointment Rescheduled

Hi ${newData.participantName},

We need to reschedule your appointment. Here are the updated details:

ORIGINAL TIME:
Date: ${originalData.eventDate}
Time: ${originalData.eventTime}

NEW TIME:
Event: ${newData.eventTitle}
Date: ${newData.eventDate}
Time: ${newData.eventTime}
Duration: ${newData.eventDuration}
${newData.eventLocation ? `Location: ${newData.eventLocation}\n` : ''}${newData.eventNotes ? `Notes: ${newData.eventNotes}\n` : ''}

${reason ? `Reason for reschedule: ${reason}\n\n` : ''}We apologize for any inconvenience this may cause. Please update your calendar with the new time.

If you have any questions or conflicts with the new time, please contact us immediately.

Best regards,
${newData.organizerName}
${newData.organizerEmail}
    `.trim()

    return { html, text }
  }
}

// Export singleton instance
export const gmailNotificationService = new GmailNotificationService()