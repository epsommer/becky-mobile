// Multi-service client management utilities
import { Client } from '../types/client';
import { clientManager } from './client-config';

// Service business line mappings
export const SERVICE_BUSINESS_MAPPING = {
  // Business service IDs to service line IDs
  'woodgreen': 'landscaping',
  'whiteknight': 'snow-removal', 
  'pupawalk': 'pet-services',
  'creative': 'creative'
} as const;

// Reverse mapping for legacy compatibility
export const LEGACY_SERVICE_MAPPING = {
  'landscaping': 'woodgreen',
  'snow-removal': 'whiteknight',
  'pet-services': 'pupawalk',
  'creative': 'creative'
} as const;

export interface MultiServiceClient extends Client {
  primaryService: string; // The main serviceId
  additionalServices: string[]; // Other services from serviceTypes array
  allServices: string[]; // Combined array of all services
}

/**
 * Enhanced client manager that handles multi-service assignments
 */
export class MultiServiceManager {
  
  /**
   * Get all clients for a specific service, including those with the service in their serviceTypes
   */
  static async getClientsForService(serviceId: string): Promise<Client[]> {
    const clients = await clientManager.getClients();
    return clients.filter(client =>
      client.serviceId === serviceId ||
      client.serviceTypes.includes(serviceId)
    );
  }

  /**
   * Get all services a client is associated with
   */
  static getClientServices(client: Client): string[] {
    const services = new Set([client.serviceId]);
    client.serviceTypes.forEach(service => services.add(service));
    return Array.from(services);
  }

  /**
   * Add a service to a client's service types
   */
  static async addServiceToClient(clientId: string, serviceId: string): Promise<boolean> {
    const client = await clientManager.getClient(clientId);
    if (!client) return false;

    if (!client.serviceTypes.includes(serviceId) && client.serviceId !== serviceId) {
      client.serviceTypes = [...client.serviceTypes, serviceId];
      client.updatedAt = new Date().toISOString();
      clientManager.saveClient(client);
      return true;
    }
    return false;
  }

  /**
   * Remove a service from a client's service types
   */
  static async removeServiceFromClient(clientId: string, serviceId: string): Promise<boolean> {
    const client = await clientManager.getClient(clientId);
    if (!client) return false;

    if (client.serviceId === serviceId) {
      // Cannot remove primary service
      return false;
    }

    const originalLength = client.serviceTypes.length;
    client.serviceTypes = client.serviceTypes.filter(service => service !== serviceId);
    
    if (client.serviceTypes.length !== originalLength) {
      client.updatedAt = new Date().toISOString();
      clientManager.saveClient(client);
      return true;
    }
    return false;
  }

  /**
   * Update client's primary service
   */
  static async updatePrimaryService(clientId: string, newPrimaryServiceId: string): Promise<boolean> {
    const client = await clientManager.getClient(clientId);
    if (!client) return false;

    const oldPrimaryService = client.serviceId;
    client.serviceId = newPrimaryServiceId;
    
    // Add old primary service to serviceTypes if not already there
    if (!client.serviceTypes.includes(oldPrimaryService)) {
      client.serviceTypes = [...client.serviceTypes, oldPrimaryService];
    }
    
    // Remove new primary service from serviceTypes if it was there
    client.serviceTypes = client.serviceTypes.filter(service => service !== newPrimaryServiceId);
    
    client.updatedAt = new Date().toISOString();
    clientManager.saveClient(client);
    return true;
  }

  /**
   * Get enhanced client info with multi-service details
   */
  static async getMultiServiceClient(clientId: string): Promise<MultiServiceClient | null> {
    const client = await clientManager.getClient(clientId);
    if (!client) return null;

    const allServices = this.getClientServices(client);
    
    return {
      ...client,
      primaryService: client.serviceId,
      additionalServices: client.serviceTypes,
      allServices
    };
  }

  /**
   * Get clients that have multiple services
   */
  static async getMultiServiceClients(): Promise<MultiServiceClient[]> {
    const clients = await clientManager.getClients();
    return clients
      .filter(client => client.serviceTypes.length > 0)
      .map(client => ({
        ...client,
        primaryService: client.serviceId,
        additionalServices: client.serviceTypes,
        allServices: this.getClientServices(client)
      }));
  }

  /**
   * Analyze conversation and suggest additional services for a client
   */
  static async suggestServicesFromConversation(clientId: string): Promise<string[]> {
    // This would integrate with the service detection API
    // For now, return empty array as a placeholder
    return [];
  }

  /**
   * Get service statistics including multi-service clients
   */
  static async getServiceStats() {
    const clients = await clientManager.getClients();
    const stats = {
      totalClients: clients.length,
      multiServiceClients: clients.filter(c => c.serviceTypes.length > 0).length,
      servicesBreakdown: {} as Record<string, {
        primaryClients: number;
        additionalClients: number;
        totalClients: number;
      }>
    };

    // Count clients per service
    ['woodgreen', 'whiteknight', 'pupawalk', 'creative'].forEach(serviceId => {
      const primaryClients = clients.filter(c => c.serviceId === serviceId).length;
      const additionalClients = clients.filter(c => 
        c.serviceId !== serviceId && c.serviceTypes.includes(serviceId)
      ).length;
      
      stats.servicesBreakdown[serviceId] = {
        primaryClients,
        additionalClients,
        totalClients: primaryClients + additionalClients
      };
    });

    return stats;
  }
}

/**
 * Hook for React components to manage multi-service clients
 */
export const useMultiService = () => {
  return {
    getClientsForService: MultiServiceManager.getClientsForService,
    getClientServices: MultiServiceManager.getClientServices,
    addServiceToClient: MultiServiceManager.addServiceToClient,
    removeServiceFromClient: MultiServiceManager.removeServiceFromClient,
    updatePrimaryService: MultiServiceManager.updatePrimaryService,
    getMultiServiceClient: MultiServiceManager.getMultiServiceClient,
    getMultiServiceClients: MultiServiceManager.getMultiServiceClients,
    getServiceStats: MultiServiceManager.getServiceStats
  };
};