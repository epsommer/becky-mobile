// Notification service for follow-up SMS and Email
import nodemailer from 'nodemailer';
// import twilio from 'twilio'; // Optional dependency - install if needed
import { PrismaClient } from '@prisma/client';
import {
  FollowUpNotification,
  FollowUpNotificationType,
  NotificationChannel
} from '@prisma/client';

const prisma = new PrismaClient();

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
  delivered?: boolean;
}

export class NotificationService {
  private emailConfig: EmailConfig;
  private smsConfig: SMSConfig;
  private emailTransporter: nodemailer.Transporter;
  private twilioClient: any; // twilio.Twilio when dependency is installed

  constructor() {
    // Email configuration (using environment variables)
    this.emailConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      from: process.env.SMTP_FROM || 'noreply@yourcompany.com'
    };

    // SMS configuration (Twilio)
    this.smsConfig = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_FROM_NUMBER || ''
    };

    // Initialize email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: this.emailConfig.auth
    });

    // Initialize Twilio client
    // Uncomment when twilio is installed: npm install twilio
    // if (this.smsConfig.accountSid && this.smsConfig.authToken) {
    //   this.twilioClient = twilio(this.smsConfig.accountSid, this.smsConfig.authToken);
    // }
  }

  // Send email notification
  async sendEmail(
    to: string,
    subject: string,
    content: string,
    htmlContent?: string
  ): Promise<NotificationResult> {
    try {
      if (!this.emailConfig.auth.user || !this.emailConfig.auth.pass) {
        return {
          success: false,
          error: 'Email configuration not properly set'
        };
      }

      const mailOptions = {
        from: this.emailConfig.from,
        to: to,
        subject: subject,
        text: content,
        html: htmlContent || content.replace(/\n/g, '<br>')
      };

      const result = await this.emailTransporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId,
        delivered: true
      };

    } catch (error) {
      console.error('Email sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Send SMS notification
  async sendSMS(to: string, content: string): Promise<NotificationResult> {
    try {
      if (!this.twilioClient) {
        return {
          success: false,
          error: 'SMS configuration not properly set'
        };
      }

      // Clean and validate phone number
      const cleanPhone = this.cleanPhoneNumber(to);
      if (!this.isValidPhoneNumber(cleanPhone)) {
        return {
          success: false,
          error: 'Invalid phone number format'
        };
      }

      const message = await this.twilioClient.messages.create({
        body: content,
        from: this.smsConfig.fromNumber,
        to: cleanPhone
      });

      return {
        success: true,
        messageId: message.sid,
        delivered: message.status === 'delivered' || message.status === 'sent'
      };

    } catch (error) {
      console.error('SMS sending error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Process a specific follow-up notification
  async processNotification(notificationId: string): Promise<NotificationResult> {
    try {
      // Get the notification with follow-up details
      const notification = await prisma.followUpNotification.findUnique({
        where: { id: notificationId },
        include: {
          followUp: {
            include: {
              client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  company: true
                }
              }
            }
          }
        }
      });

      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      if (notification.status !== 'PENDING') {
        return { success: false, error: `Notification already processed (status: ${notification.status})` };
      }

      // Check if notification time has arrived
      if (notification.scheduledAt > new Date()) {
        return { success: false, error: 'Notification not yet due' };
      }

      // Check if follow-up is still valid
      if (notification.followUp.status === 'CANCELLED') {
        await prisma.followUpNotification.update({
          where: { id: notificationId },
          data: {
            status: 'FAILED',
            errorMessage: 'Follow-up was cancelled'
          }
        });
        return { success: false, error: 'Follow-up was cancelled' };
      }

      let result: NotificationResult;

      // Send notification based on channel
      if (notification.channel === 'EMAIL') {
        const subject = this.getEmailSubject(notification.type, notification.followUp);
        result = await this.sendEmail(
          notification.recipient,
          subject,
          notification.content
        );
      } else if (notification.channel === 'SMS') {
        result = await this.sendSMS(
          notification.recipient,
          notification.content
        );
      } else {
        result = { success: false, error: 'Unsupported notification channel' };
      }

      // Update notification status
      await prisma.followUpNotification.update({
        where: { id: notificationId },
        data: {
          status: result.success ? 'SENT' : 'FAILED',
          sentAt: result.success ? new Date() : null,
          deliveredAt: result.delivered ? new Date() : null,
          errorMessage: result.error || null,
          retryCount: notification.retryCount + 1
        }
      });

      return result;

    } catch (error) {
      console.error('Notification processing error:', error);

      // Update notification with error
      const errorMessage = error instanceof Error ? error.message : String(error);
      try {
        await prisma.followUpNotification.update({
          where: { id: notificationId },
          data: {
            status: 'FAILED',
            errorMessage: errorMessage,
            retryCount: { increment: 1 }
          }
        });
      } catch (updateError) {
        console.error('Failed to update notification error:', updateError);
      }

      return { success: false, error: errorMessage };
    }
  }

  // Process all pending notifications
  async processPendingNotifications(): Promise<{
    processed: number;
    sent: number;
    failed: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    const result = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>
    };

    try {
      const now = new Date();
      
      // Get pending notifications that are due
      const pendingNotifications = await prisma.followUpNotification.findMany({
        where: {
          status: 'PENDING',
          scheduledAt: { lte: now },
          retryCount: { lt: 3 } // Don't retry more than 3 times
        },
        include: {
          followUp: {
            include: {
              client: {
                select: {
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        take: 50, // Process in batches
        orderBy: { scheduledAt: 'asc' }
      });

      for (const notification of pendingNotifications) {
        result.processed++;

        const processResult = await this.processNotification(notification.id);
        
        if (processResult.success) {
          result.sent++;
        } else {
          result.failed++;
          result.errors.push({
            id: notification.id,
            error: processResult.error || 'Unknown error'
          });
        }

        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

    } catch (error) {
      console.error('Batch notification processing error:', error);
      result.errors.push({
        id: 'batch-process',
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return result;
  }

  // Schedule notification for a follow-up
  async scheduleFollowUpNotifications(
    followUpId: string,
    reminderDays: number[] = [7, 1]
  ): Promise<{ created: number; errors: string[] }> {
    const result = {
      created: 0,
      errors: [] as string[]
    };

    try {
      const followUp = await prisma.followUp.findUnique({
        where: { id: followUpId },
        include: {
          client: {
            select: {
              name: true,
              email: true,
              phone: true,
              company: true
            }
          }
        }
      });

      if (!followUp) {
        result.errors.push('Follow-up not found');
        return result;
      }

      for (const days of reminderDays) {
        const reminderDate = new Date(followUp.scheduledDate);
        reminderDate.setDate(reminderDate.getDate() - days);
        reminderDate.setHours(10, 0, 0, 0); // Default to 10 AM

        // Skip if reminder date is in the past
        if (reminderDate <= new Date()) {
          continue;
        }

        const notificationType = days === 7 ? 'REMINDER_7_DAYS' : 
                               days === 1 ? 'REMINDER_24_HOURS' : 
                               'REMINDER_7_DAYS';

        // Create email notification if email available
        if (followUp.client.email) {
          try {
            const emailContent = this.buildNotificationContent(
              notificationType,
              'EMAIL',
              followUp
            );

            await prisma.followUpNotification.create({
              data: {
                followUpId,
                type: notificationType,
                channel: 'EMAIL',
                recipient: followUp.client.email,
                scheduledAt: reminderDate,
                content: emailContent,
                templateUsed: 'default-email'
              }
            });

            result.created++;
          } catch (error) {
            result.errors.push(`Email notification error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }

        // Create SMS notification if phone available
        if (followUp.client.phone) {
          try {
            const smsContent = this.buildNotificationContent(
              notificationType,
              'SMS',
              followUp
            );

            await prisma.followUpNotification.create({
              data: {
                followUpId,
                type: notificationType,
                channel: 'SMS',
                recipient: followUp.client.phone,
                scheduledAt: reminderDate,
                content: smsContent,
                templateUsed: 'default-sms'
              }
            });

            result.created++;
          } catch (error) {
            result.errors.push(`SMS notification error: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

    } catch (error) {
      result.errors.push(`Scheduling error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return result;
  }

  // Build notification content based on type and channel
  private buildNotificationContent(
    type: FollowUpNotificationType,
    channel: NotificationChannel,
    followUp: any
  ): string {
    const clientName = followUp.client.name;
    const followUpTitle = followUp.title || 'Follow-up';
    const followUpDate = followUp.scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const followUpTime = followUp.scheduledDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (channel === 'EMAIL') {
      switch (type) {
        case 'REMINDER_7_DAYS':
          return `Hi ${clientName},

This is a friendly reminder that you have a follow-up scheduled for next week.

Follow-up Details:
- Title: ${followUpTitle}
- Date: ${followUpDate}
- Time: ${followUpTime}
- Duration: ${followUp.duration} minutes

${followUp.notes ? `Notes: ${followUp.notes}` : ''}

If you need to reschedule, please contact us as soon as possible.

Best regards,
Your Service Team`;

        case 'REMINDER_24_HOURS':
          return `Hi ${clientName},

This is a reminder that you have a follow-up scheduled for tomorrow.

Follow-up Details:
- Title: ${followUpTitle}
- Date: ${followUpDate}
- Time: ${followUpTime}

We look forward to speaking with you.

Best regards,
Your Service Team`;

        case 'REMINDER_1_HOUR':
          return `Hi ${clientName},

Your follow-up "${followUpTitle}" is starting in 1 hour (${followUpTime}).

See you soon!

Your Service Team`;

        default:
          return `Reminder: You have a follow-up "${followUpTitle}" scheduled for ${followUpDate} at ${followUpTime}.`;
      }
    } else if (channel === 'SMS') {
      switch (type) {
        case 'REMINDER_7_DAYS':
          return `Hi ${clientName}, reminder: Follow-up "${followUpTitle}" scheduled for ${followUpDate} at ${followUpTime}. Contact us if you need to reschedule.`;

        case 'REMINDER_24_HOURS':
          return `Hi ${clientName}, reminder: Follow-up tomorrow (${followUpDate}) at ${followUpTime}. ${followUpTitle}`;

        case 'REMINDER_1_HOUR':
          return `Hi ${clientName}, your follow-up "${followUpTitle}" starts in 1 hour. See you soon!`;

        default:
          return `Reminder: Follow-up "${followUpTitle}" on ${followUpDate} at ${followUpTime}`;
      }
    }

    return `Follow-up reminder: ${followUpTitle} on ${followUpDate} at ${followUpTime}`;
  }

  // Get email subject based on notification type
  private getEmailSubject(type: FollowUpNotificationType, followUp: any): string {
    const clientName = followUp.client.name;
    
    switch (type) {
      case 'REMINDER_7_DAYS':
        return `Follow-up Reminder - Next Week (${clientName})`;
      case 'REMINDER_24_HOURS':
        return `Follow-up Reminder - Tomorrow (${clientName})`;
      case 'REMINDER_1_HOUR':
        return `Follow-up Starting Soon (${clientName})`;
      case 'COMPLETION_REQUEST':
        return `Follow-up Completion Required (${clientName})`;
      case 'MISSED_FOLLOW_UP':
        return `Missed Follow-up Follow-up (${clientName})`;
      case 'RESCHEDULE_REQUEST':
        return `Follow-up Rescheduling (${clientName})`;
      case 'OUTCOME_SUMMARY':
        return `Follow-up Completed (${clientName})`;
      default:
        return `Follow-up Notification (${clientName})`;
    }
  }

  // Utility methods
  private cleanPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // If no country code, add +1 for North America
    if (cleaned.match(/^\d{10}$/)) {
      return `+1${cleaned}`;
    }
    
    return cleaned;
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Basic validation for international phone numbers
    return /^\+\d{10,15}$/.test(phone);
  }

  // Test notification configuration
  async testConfiguration(): Promise<{
    email: { configured: boolean; error?: string };
    sms: { configured: boolean; error?: string };
  }> {
    const result = {
      email: { configured: false as boolean, error: undefined as string | undefined },
      sms: { configured: false as boolean, error: undefined as string | undefined }
    };

    // Test email configuration
    try {
      if (this.emailConfig.auth.user && this.emailConfig.auth.pass) {
        await this.emailTransporter.verify();
        result.email.configured = true;
      } else {
        result.email.error = 'Email credentials not configured';
      }
    } catch (error) {
      result.email.error = error instanceof Error ? error.message : String(error);
    }

    // Test SMS configuration
    try {
      if (this.smsConfig.accountSid && this.smsConfig.authToken) {
        // Test by fetching account info
        const account = await this.twilioClient.api.accounts(this.smsConfig.accountSid).fetch();
        if (account.sid) {
          result.sms.configured = true;
        }
      } else {
        result.sms.error = 'SMS credentials not configured';
      }
    } catch (error) {
      result.sms.error = error instanceof Error ? error.message : String(error);
    }

    return result;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();