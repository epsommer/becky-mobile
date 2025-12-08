// Client-side activity logger - calls API endpoints instead of using Prisma directly
import { ActivityType } from '@prisma/client';

export interface LogActivityParams {
  activityType: ActivityType;
  action: string;
  entityType: string;
  entityId?: string;
  clientId?: string;
  description: string;
  metadata?: Record<string, any>;
  userId?: string;
  userName?: string;
  userRole?: string;
  deploymentInfo?: Record<string, any>;
}

/**
 * Log an activity via API
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const response = await fetch('/api/activity-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to log activity');
    }

    const data = await response.json();
    return { success: true, activity: data.activity };
  } catch (error) {
    console.error('Failed to log activity:', error);
    return { success: false, error };
  }
}

/**
 * Helper functions for common activity logging scenarios
 */

export async function logClientUpdate(params: {
  clientId: string;
  clientName: string;
  updates: Record<string, any>;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'CLIENT_UPDATE',
    action: 'updated',
    entityType: 'client',
    entityId: params.clientId,
    clientId: params.clientId,
    description: `Updated client profile for ${params.clientName}`,
    metadata: { updates: params.updates },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logNoteCreated(params: {
  noteId: string;
  clientId: string;
  clientName: string;
  noteContent: string;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'NOTE_CREATED',
    action: 'created',
    entityType: 'note',
    entityId: params.noteId,
    clientId: params.clientId,
    description: `Created note for ${params.clientName}`,
    metadata: { notePreview: params.noteContent.substring(0, 100) },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logTestimonialReceived(params: {
  testimonialId: string;
  clientId: string;
  clientName: string;
  rating: number;
  source?: string;
  userId?: string;
  userName?: string;
}) {
  const sourceText = params.source === 'imported' ? 'Imported testimonial' : 'Received testimonial';
  return logActivity({
    activityType: 'TESTIMONIAL_RECEIVED',
    action: params.source === 'imported' ? 'imported' : 'received',
    entityType: 'testimonial',
    entityId: params.testimonialId,
    clientId: params.clientId,
    description: `${sourceText} from ${params.clientName} (${params.rating} stars)`,
    metadata: { rating: params.rating, source: params.source || 'form' },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logAppointmentScheduled(params: {
  appointmentId: string;
  clientId?: string;
  clientName?: string;
  appointmentTitle: string;
  appointmentDate: string;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'APPOINTMENT_SCHEDULED',
    action: 'scheduled',
    entityType: 'appointment',
    entityId: params.appointmentId,
    clientId: params.clientId,
    description: `Scheduled appointment: ${params.appointmentTitle}${params.clientName ? ` for ${params.clientName}` : ''}`,
    metadata: { appointmentDate: params.appointmentDate },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logReceiptCreated(params: {
  receiptId: string;
  receiptNumber: string;
  clientId?: string;
  clientName?: string;
  amount: number;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'RECEIPT_CREATED',
    action: 'created',
    entityType: 'receipt',
    entityId: params.receiptId,
    clientId: params.clientId,
    description: `Created receipt ${params.receiptNumber}${params.clientName ? ` for ${params.clientName}` : ''} - $${params.amount.toFixed(2)}`,
    metadata: { amount: params.amount, receiptNumber: params.receiptNumber },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logDeployment(params: {
  commitHash?: string;
  commitMessage?: string;
  branch?: string;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'DEPLOYMENT',
    action: 'deployed',
    entityType: 'system',
    description: `Website deployed successfully${params.commitMessage ? `: ${params.commitMessage}` : ''}`,
    deploymentInfo: {
      commitHash: params.commitHash,
      commitMessage: params.commitMessage,
      branch: params.branch,
      timestamp: new Date().toISOString(),
    },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logGitPush(params: {
  commitHash: string;
  commitMessage: string;
  branch: string;
  filesChanged?: number;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'GIT_PUSH',
    action: 'pushed',
    entityType: 'system',
    description: `Pushed to ${params.branch}: ${params.commitMessage}`,
    metadata: {
      commitHash: params.commitHash,
      branch: params.branch,
      filesChanged: params.filesChanged,
    },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logTimeTracked(params: {
  entryId: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  duration: number; // in milliseconds
  amount?: number;
  userId?: string;
  userName?: string;
}) {
  const hours = params.duration / (1000 * 60 * 60);
  return logActivity({
    activityType: 'TIME_TRACKED',
    action: 'tracked',
    entityType: 'time_entry',
    entityId: params.entryId,
    clientId: params.clientId,
    description: `Tracked ${hours.toFixed(2)} hours for ${params.clientName} - ${params.serviceType}`,
    metadata: {
      duration: params.duration,
      hours,
      serviceType: params.serviceType,
      amount: params.amount,
    },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}
