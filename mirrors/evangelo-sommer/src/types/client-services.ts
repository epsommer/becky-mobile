// Client Services API Types
import { ServiceType } from '@prisma/client';

export interface ClientService {
  id: string;
  type: ServiceType;
  name: string;
  status: 'active' | 'inactive' | 'pending';
  lastServiceDate?: string;
  nextScheduledDate?: string;
  frequency?: string;
}

export interface ClientServicesData {
  clientId: string;
  clientName: string;
  services: ClientService[];
}

export interface ClientServicesResponse {
  success: boolean;
  data?: ClientServicesData;
  error?: string;
}

// Extended service type option for form usage
export interface ServiceTypeOption {
  value: ServiceType;
  label: string;
  frequency?: string;
  lastService?: string;
}