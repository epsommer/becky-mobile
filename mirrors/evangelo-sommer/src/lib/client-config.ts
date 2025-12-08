// src/lib/client-config.ts
import {
  Client,
  Document,
  DocumentFilters,
  SortOptions,
  DocumentStats,
} from "../types/client";
import { generateMessageId } from "./message-utils";

export class ClientManager {
  private storageKey = "crm-clients";
  // Note: Conversations now managed via database API
  private documentsKey = "crm-documents";

  // ===== CLIENT METHODS =====
  async getClients(): Promise<Client[]> {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/clients`);
      if (!response.ok) {
        console.error('Failed to fetch clients:', response.status);
        return [];
      }
      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching clients:', error);
      return [];
    }
  }

  async getClient(id: string): Promise<Client | null> {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const url = `${baseUrl}/api/clients/${id}`;
      console.log('[ClientManager] Fetching client from:', url);

      const response = await fetch(url);
      console.log('[ClientManager] Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ClientManager] Failed to fetch client ${id}:`, response.status, errorText);
        return null;
      }

      const result = await response.json();
      console.log('[ClientManager] Fetch result:', { success: result.success, hasData: !!result.data });

      if (result.success && result.data) {
        console.log('[ClientManager] Client data:', {
          id: result.data.id,
          name: result.data.name,
          email: result.data.email
        });
      }

      return result.success ? result.data : null;
    } catch (error) {
      console.error(`[ClientManager] Error fetching client ${id}:`, error);
      console.error('[ClientManager] Error stack:', (error as Error).stack);
      return null;
    }
  }

  async saveClient(client: Client): Promise<Client | null> {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';

      // Try to create new client first (most common case)
      const createResponse = await fetch(`${baseUrl}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });

      if (createResponse.ok) {
        const result = await createResponse.json();
        return result.success ? result.data : null;
      }

      // If creation failed with 409 (conflict), try updating instead
      if (createResponse.status === 409) {
        const updateResponse = await fetch(`${baseUrl}/api/clients/${client.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client)
        });

        if (!updateResponse.ok) {
          console.error(`Failed to update client ${client.id}:`, updateResponse.status);
          return null;
        }

        const result = await updateResponse.json();
        return result.success ? result.data : null;
      }

      // Other error occurred
      console.error('Failed to create client:', createResponse.status);
      const errorText = await createResponse.text();
      console.error('Error response:', errorText);
      return null;

    } catch (error) {
      console.error('Error saving client:', error);
      return null;
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    try {
      const baseUrl = typeof window !== 'undefined' ? '' : 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/clients/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        console.error(`Failed to delete client ${id}:`, response.status);
        return false;
      }
      const result = await response.json();
      
      // Also delete client documents
      if (result.success) {
        await this.deleteClientDocuments(id);
      }
      
      return result.success;
    } catch (error) {
      console.error(`Error deleting client ${id}:`, error);
      return false;
    }
  }

  async getClientsByService(serviceId: string): Promise<Client[]> {
    try {
      const clients = await this.getClients();
      return clients.filter((client) => 
        client.serviceId === serviceId || 
        client.serviceTypes?.includes(serviceId)
      );
    } catch (error) {
      console.error('Error fetching clients by service:', error);
      return [];
    }
  }

  async searchClients(query: string, serviceId?: string): Promise<Client[]> {
    let clients = await this.getClients();

    if (serviceId) {
      clients = clients.filter((client) => client.serviceId === serviceId);
    }

    const lowerQuery = query.toLowerCase();
    return clients.filter((client) => {
      if (client.name.toLowerCase().includes(lowerQuery)) return true;
      if (client.email?.toLowerCase().includes(lowerQuery)) return true;
      if (client.company?.toLowerCase().includes(lowerQuery)) return true;
      if (client.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
        return true;
      if (client.phone?.toLowerCase().includes(lowerQuery)) return true;
      if (client.projectType?.toLowerCase().includes(lowerQuery)) return true;
      return false;
    });
  }

  // ===== CONVERSATION METHODS =====
  // Note: Conversations are now managed via database API at /api/conversations
  // Use the useConversations hook for conversation operations

  // ===== DOCUMENT METHODS =====
  getDocuments(clientId: string): Document[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(this.documentsKey);
    const allDocuments = data ? JSON.parse(data) : [];
    return allDocuments.filter((doc: Document) => doc.clientId === clientId);
  }

  getAllDocuments(): Document[] {
    if (typeof window === "undefined") return [];
    const data = localStorage.getItem(this.documentsKey);
    return data ? JSON.parse(data) : [];
  }

  saveDocument(document: Document): void {
    const documents = this.getAllDocuments();
    const existingIndex = documents.findIndex((d) => d.id === document.id);

    if (existingIndex >= 0) {
      documents[existingIndex] = {
        ...document,
        updatedAt: new Date().toISOString(),
      };
    } else {
      documents.push({
        ...document,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    localStorage.setItem(this.documentsKey, JSON.stringify(documents));
  }

  deleteDocument(documentId: string): void {
    const documents = this.getAllDocuments().filter(
      (doc) => doc.id !== documentId,
    );
    localStorage.setItem(this.documentsKey, JSON.stringify(documents));
  }

  deleteClientDocuments(clientId: string): void {
    const documents = this.getAllDocuments().filter(
      (doc) => doc.clientId !== clientId,
    );
    localStorage.setItem(this.documentsKey, JSON.stringify(documents));
  }

  searchDocuments(clientId: string, query: string): Document[] {
    const documents = this.getDocuments(clientId);
    if (!query) return documents;

    const lowerQuery = query.toLowerCase();
    return documents.filter(
      (doc) =>
        doc.name.toLowerCase().includes(lowerQuery) ||
        doc.content.toLowerCase().includes(lowerQuery) ||
        doc.metadata?.notes?.toLowerCase().includes(lowerQuery) ||
        doc.metadata?.invoiceNumber?.toLowerCase().includes(lowerQuery) ||
        doc.metadata?.quoteNumber?.toLowerCase().includes(lowerQuery),
    );
  }

  filterDocuments(clientId: string, filters: DocumentFilters): Document[] {
    let documents = this.getDocuments(clientId);

    if (filters.type && filters.type !== "all") {
      documents = documents.filter((doc) => doc.type === filters.type);
    }

    if (filters.status && filters.status !== "all") {
      documents = documents.filter((doc) => doc.status === filters.status);
    }

    if (filters.isPaid !== undefined) {
      if (filters.isPaid) {
        documents = documents.filter((doc) => doc.status === "paid");
      } else {
        documents = documents.filter((doc) => doc.status !== "paid");
      }
    }

    if (filters.isOverdue) {
      const now = new Date();
      documents = documents.filter((doc) => {
        if (!doc.dueDate) return false;
        return new Date(doc.dueDate) < now && doc.status !== "paid";
      });
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      documents = documents.filter((doc) => {
        const docDate = new Date(doc.createdAt);
        return docDate >= start && docDate <= end;
      });
    }

    if (filters.amountRange) {
      documents = documents.filter((doc) => {
        if (!doc.amount) return false;
        return (
          doc.amount >= filters.amountRange!.min &&
          doc.amount <= filters.amountRange!.max
        );
      });
    }

    return documents;
  }

  sortDocuments(documents: Document[], sort: SortOptions): Document[] {
    return [...documents].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;

      switch (sort.field) {
        case "date":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        case "amount":
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "type":
          aValue = a.type;
          bValue = b.type;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "dueDate":
          aValue = a.dueDate ? new Date(a.dueDate) : new Date("1900-01-01");
          bValue = b.dueDate ? new Date(b.dueDate) : new Date("1900-01-01");
          break;
        default:
          aValue = new Date(a.updatedAt);
          bValue = new Date(b.updatedAt);
      }

      if (sort.direction === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }

  getDocumentStats(clientId: string): DocumentStats {
    const documents = this.getDocuments(clientId);

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let totalValue = 0;
    let paidValue = 0;
    let overdueCount = 0;

    const now = new Date();

    documents.forEach((doc) => {
      byType[doc.type] = (byType[doc.type] || 0) + 1;
      byStatus[doc.status] = (byStatus[doc.status] || 0) + 1;

      if (doc.amount) {
        totalValue += doc.amount;
        if (doc.status === "paid") {
          paidValue += doc.amount;
        }
      }

      if (doc.dueDate && new Date(doc.dueDate) < now && doc.status !== "paid") {
        overdueCount++;
      }
    });

    return {
      total: documents.length,
      byType,
      byStatus,
      totalValue,
      paidValue,
      outstandingValue: totalValue - paidValue,
      overdueCount,
    };
  }

  // ===== UTILITY METHODS =====
  generateClientId(): string {
    return "client_" + Math.random().toString(36).substr(2, 9);
  }

  generateConversationId(): string {
    return "conv_" + Math.random().toString(36).substr(2, 9);
  }

  generateMessageId(): string {
    return generateMessageId();
  }

  generateDocumentId(): string {
    return "doc_" + Math.random().toString(36).substr(2, 9);
  }

  // ===== LEGACY METHODS (keeping for compatibility) =====
  async searchClientsByContactInfo(hasEmail: boolean, hasPhone: boolean): Promise<Client[]> {
    const clients = await this.getClients();
    return clients.filter((client) => {
      if (hasEmail && hasPhone) {
        return client.email && client.phone;
      } else if (hasEmail) {
        return client.email && client.email.includes("@");
      } else if (hasPhone) {
        return client.phone && client.phone.length >= 10;
      }
      return true;
    });
  }

  async getAutomationEnabledClients(serviceId?: string): Promise<Client[]> {
    let clients = await this.getClients();

    if (serviceId) {
      clients = clients.filter((client) => client.serviceId === serviceId);
    }

    return clients.filter(
      (client) =>
        client.email &&
        client.email.includes("@") &&
        (client.contactPreferences?.autoInvoicing ||
          client.contactPreferences?.autoReceipts),
    );
  }

  async getIncompleteClients(serviceId?: string): Promise<Client[]> {
    let clients = await this.getClients();

    if (serviceId) {
      clients = clients.filter((client) => client.serviceId === serviceId);
    }

    return clients.filter(
      (client) => !client.email || !client.phone || !client.address?.street,
    );
  }

  async updateClientContactPreferences(
    clientId: string,
    preferences: Client["contactPreferences"],
  ): Promise<void> {
    const client = await this.getClient(clientId);
    if (client) {
      client.contactPreferences = preferences;
      client.updatedAt = new Date().toISOString();
      this.saveClient(client);
    }
  }

  async canReceiveAutomatedEmails(clientId: string): Promise<boolean> {
    const client = await this.getClient(clientId);
    return !!(
      client?.email &&
      client.email.includes("@") &&
      client.contactPreferences?.canReceiveEmails
    );
  }

  async canReceiveAutomatedTexts(clientId: string): Promise<boolean> {
    const client = await this.getClient(clientId);
    return !!(
      client?.phone &&
      client.phone.length >= 10 &&
      client.contactPreferences?.canReceiveTexts
    );
  }

  async getClientStats(serviceId?: string) {
    let clients = await this.getClients();

    if (serviceId) {
      clients = clients.filter((client) => client.serviceId === serviceId);
    }

    return {
      total: clients.length,
      active: clients.filter((c) => c.status === "active").length,
      prospects: clients.filter((c) => c.status === "prospect").length,
      completed: clients.filter((c) => c.status === "completed").length,
      withEmail: clients.filter((c) => c.email && c.email.includes("@")).length,
      withPhone: clients.filter((c) => c.phone && c.phone.length >= 10).length,
      automationEnabled: clients.filter(
        (c) =>
          c.email &&
          c.email.includes("@") &&
          (c.contactPreferences?.autoInvoicing ||
            c.contactPreferences?.autoReceipts),
      ).length,
      totalValue: clients.reduce(
        (sum, client) => sum + (client.budget || 0),
        0,
      ),
    };
  }
}

export const clientManager = new ClientManager();
