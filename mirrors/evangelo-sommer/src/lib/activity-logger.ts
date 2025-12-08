// Activity Logger - Centralized activity tracking utility
import { PrismaClient, ActivityType } from '@prisma/client';

const prisma = new PrismaClient();

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
 * Log an activity to the database
 */
export async function logActivity(params: LogActivityParams) {
  try {
    const activity = await prisma.activityLog.create({
      data: {
        activityType: params.activityType,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        clientId: params.clientId,
        description: params.description,
        metadata: params.metadata || {},
        userId: params.userId,
        userName: params.userName,
        userRole: params.userRole,
        deploymentInfo: params.deploymentInfo,
      },
    });

    return { success: true, activity };
  } catch (error) {
    console.error('Failed to log activity:', error);
    return { success: false, error };
  }
}

/**
 * Get recent activities
 */
export async function getRecentActivities(limit: number = 20, clientId?: string) {
  try {
    const activities = await prisma.activityLog.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, activities };
  } catch (error) {
    console.error('Failed to fetch activities:', error);
    return { success: false, error, activities: [] };
  }
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(
  activityType: ActivityType,
  limit: number = 20
) {
  try {
    const activities = await prisma.activityLog.findMany({
      where: { activityType },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, activities };
  } catch (error) {
    console.error('Failed to fetch activities by type:', error);
    return { success: false, error, activities: [] };
  }
}

/**
 * Get activities for a specific client
 */
export async function getClientActivities(clientId: string, limit: number = 50) {
  try {
    const activities = await prisma.activityLog.findMany({
      where: { clientId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return { success: true, activities };
  } catch (error) {
    console.error('Failed to fetch client activities:', error);
    return { success: false, error, activities: [] };
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
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'TESTIMONIAL_RECEIVED',
    action: 'received',
    entityType: 'testimonial',
    entityId: params.testimonialId,
    clientId: params.clientId,
    description: `Received testimonial from ${params.clientName} (${params.rating} stars)`,
    metadata: { rating: params.rating },
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

export async function logTestimonialRequested(params: {
  testimonialId: string;
  clientId: string;
  clientName: string;
  serviceName: string;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'MESSAGE_SENT', // Using MESSAGE_SENT for testimonial requests
    action: 'sent',
    entityType: 'testimonial_request',
    entityId: params.testimonialId,
    clientId: params.clientId,
    description: `Sent testimonial request to ${params.clientName} for ${params.serviceName}`,
    metadata: { serviceName: params.serviceName, type: 'testimonial_request' },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logReceiptSent(params: {
  receiptId: string;
  receiptNumber: string;
  clientId: string;
  clientName: string;
  amount: number;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'MESSAGE_SENT', // Using MESSAGE_SENT for receipt emails
    action: 'sent',
    entityType: 'receipt',
    entityId: params.receiptId,
    clientId: params.clientId,
    description: `Sent receipt ${params.receiptNumber} to ${params.clientName} - $${params.amount.toFixed(2)}`,
    metadata: {
      amount: params.amount,
      receiptNumber: params.receiptNumber,
      type: 'receipt_email'
    },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logQuoteCreated(params: {
  quoteId: string;
  clientId: string;
  clientName: string;
  amount: number;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'QUOTE_CREATED',
    action: 'created',
    entityType: 'quote',
    entityId: params.quoteId,
    clientId: params.clientId,
    description: `Created quote for ${params.clientName} - $${params.amount.toFixed(2)}`,
    metadata: { amount: params.amount },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}

export async function logInvoiceCreated(params: {
  invoiceId: string;
  clientId: string;
  clientName: string;
  amount: number;
  userId?: string;
  userName?: string;
}) {
  return logActivity({
    activityType: 'INVOICE_CREATED',
    action: 'created',
    entityType: 'invoice',
    entityId: params.invoiceId,
    clientId: params.clientId,
    description: `Created invoice for ${params.clientName} - $${params.amount.toFixed(2)}`,
    metadata: { amount: params.amount },
    userId: params.userId,
    userName: params.userName,
    userRole: params.userId ? 'admin' : undefined,
  });
}
