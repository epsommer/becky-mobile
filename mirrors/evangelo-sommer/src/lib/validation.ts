// API Input Validation Schemas using Zod
import { z } from 'zod';

// Common validation patterns
const emailSchema = z.string().email('Invalid email format').optional().or(z.literal(''));
const phoneSchema = z.string()
  .regex(/^(\+?1?\s?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));
const urlSchema = z.string().url('Invalid URL format').optional().or(z.literal(''));
const dateSchema = z.string().datetime().optional().or(z.literal(''));

// Address sub-schema
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
}).optional();

// Contact preferences sub-schema
const contactPreferencesSchema = z.object({
  preferredMethod: z.string().optional(),
  canReceiveEmails: z.boolean().optional(),
  canReceiveTexts: z.boolean().optional(),
  autoInvoicing: z.boolean().optional(),
  autoReceipts: z.boolean().optional(),
}).optional();

// Client validation schemas
export const createClientSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .max(255, 'Client name must be less than 255 characters')
    .trim(),
  email: emailSchema,
  phone: phoneSchema,
  company: z.string().max(255, 'Company name must be less than 255 characters').optional(),
  address: addressSchema,
  serviceId: z.string().optional(),
  services: z.array(z.string()).optional(),
  serviceTypes: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive', 'prospect', 'completed', 'ACTIVE', 'INACTIVE', 'PENDING', 'PROSPECT', 'COMPLETED']).optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
  projectType: z.string().optional(),
  budget: z.number().optional(),
  timeline: z.string().optional(),
  contactPreferences: contactPreferencesSchema,
  metadata: z.record(z.string(), z.any()).optional(),
  personalInfo: z.record(z.string(), z.any()).optional(),
  serviceProfile: z.record(z.string(), z.any()).optional(),
  billingInfo: z.record(z.string(), z.any()).optional(),
  relationshipData: z.record(z.string(), z.any()).optional(),
  seasonalContract: z.boolean().optional(),
  recurringService: z.string().optional(),
}).passthrough(); // Allow extra fields like id, createdAt, updatedAt, household, etc.

export const updateClientSchema = z.object({
  name: z.string()
    .min(1, 'Client name is required')
    .max(255, 'Client name must be less than 255 characters')
    .trim()
    .optional(),
  email: emailSchema,
  phone: phoneSchema,
  company: z.string().max(255, 'Company name must be less than 255 characters').optional(),
  address: z.string().max(500, 'Address must be less than 500 characters').optional(),
  services: z.array(z.string()).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'PENDING']).optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

// Conversation validation schemas
export const createConversationSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject must be less than 500 characters')
    .trim(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

export const updateConversationSchema = z.object({
  subject: z.string()
    .min(1, 'Subject is required')
    .max(500, 'Subject must be less than 500 characters')
    .trim()
    .optional(),
  status: z.enum(['OPEN', 'CLOSED', 'PENDING']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
});

// Message validation schema
export const createMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID format'),
  content: z.string()
    .min(1, 'Message content is required')
    .max(10000, 'Message must be less than 10000 characters')
    .trim(),
  type: z.enum(['EMAIL', 'SMS', 'NOTE', 'SYSTEM']).optional(),
  senderId: z.string().optional(),
});

// Participant validation schema
export const createParticipantSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID format'),
  email: z.string().email('Invalid email format'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  role: z.enum(['CLIENT', 'ADMIN', 'STAFF']).optional(),
});

// Service validation schemas
export const createServiceSchema = z.object({
  name: z.string()
    .min(1, 'Service name is required')
    .max(255, 'Service name must be less than 255 characters')
    .trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  price: z.number().min(0, 'Price must be positive').optional(),
  duration: z.number().min(0, 'Duration must be positive').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// Billing validation schemas
export const createReceiptSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  amount: z.number().min(0, 'Amount must be positive'),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  serviceType: z.string().max(100, 'Service type must be less than 100 characters').optional(),
  paymentMethod: z.enum(['CASH', 'CHECK', 'CREDIT_CARD', 'E_TRANSFER', 'OTHER']).optional(),
  status: z.enum(['DRAFT', 'SENT', 'PAID', 'CANCELLED']).optional(),
  dueDate: dateSchema,
});

// Time entry validation schema
export const createTimeEntrySchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  billable: z.boolean().optional(),
  rate: z.number().min(0, 'Rate must be positive').optional(),
});

// Calendar event validation schema
export const createCalendarEventSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  startTime: z.string().datetime('Invalid start time format'),
  endTime: z.string().datetime('Invalid end time format'),
  location: z.string().max(500, 'Location must be less than 500 characters').optional(),
  clientId: z.string().uuid('Invalid client ID format').optional(),
  attendees: z.array(emailSchema).optional(),
});

// Follow-up validation schema
export const createFollowUpSchema = z.object({
  clientId: z.string().uuid('Invalid client ID format'),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  dueDate: z.string().datetime('Invalid due date format'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
});

// Validation helper function
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }

  return {
    success: true,
    data: result.data,
  };
}

// Sanitize error messages for production
export function sanitizeError(error: unknown, isDevelopment: boolean = false): string {
  if (isDevelopment && error instanceof Error) {
    return error.message;
  }

  // Generic error messages for production
  if (error instanceof z.ZodError) {
    return 'Validation failed. Please check your input.';
  }

  return 'An error occurred. Please try again later.';
}
