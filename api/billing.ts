// api/billing.ts
import Constants from "expo-constants";
import { Receipt, CreateReceiptData, ServiceLine } from "../types/billing";

function getApiBaseUrl(): string {
  const envUrl = process.env.BECKY_API_URL || (global as any).BECKY_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  const manifestUrl =
    (Constants.expoConfig?.extra?.backendUrl || Constants.manifest?.extra?.backendUrl) ??
    (Constants.manifest?.packagerOpts?.hostUri
      ? `http://${Constants.manifest.packagerOpts.hostUri.split(":")[0]}:3000`
      : null);

  if (manifestUrl) {
    return manifestUrl.replace(/\/+$/, "");
  }

  return "https://evangelosommer.com";
}

const API_BASE = getApiBaseUrl();

// Receipt API functions
export async function getReceipts(includeArchived: boolean = false): Promise<Receipt[]> {
  const url = `${API_BASE}/api/billing/receipts${includeArchived ? '?includeArchived=true' : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to fetch receipts: ${response.statusText}`);
  }

  const data = await response.json();

  // Transform date strings to Date objects
  const receipts = (data.receipts || data.data || data).map((receipt: any) => ({
    ...receipt,
    paymentDate: new Date(receipt.paymentDate),
    serviceDate: new Date(receipt.serviceDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    emailSentAt: receipt.emailSentAt ? new Date(receipt.emailSentAt) : undefined,
    emailDeliveredAt: receipt.emailDeliveredAt ? new Date(receipt.emailDeliveredAt) : undefined,
    archivedAt: receipt.archivedAt ? new Date(receipt.archivedAt) : undefined,
  }));

  return receipts;
}

export async function getReceipt(receiptId: string): Promise<Receipt> {
  const response = await fetch(`${API_BASE}/api/billing/receipts/${receiptId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to fetch receipt: ${response.statusText}`);
  }

  const data = await response.json();
  const receipt = data.receipt || data;

  // Transform date strings to Date objects
  return {
    ...receipt,
    paymentDate: new Date(receipt.paymentDate),
    serviceDate: new Date(receipt.serviceDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    emailSentAt: receipt.emailSentAt ? new Date(receipt.emailSentAt) : undefined,
    emailDeliveredAt: receipt.emailDeliveredAt ? new Date(receipt.emailDeliveredAt) : undefined,
    archivedAt: receipt.archivedAt ? new Date(receipt.archivedAt) : undefined,
  };
}

export async function createReceipt(data: CreateReceiptData): Promise<Receipt> {
  const response = await fetch(`${API_BASE}/api/billing/receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      paymentDate: data.paymentDate?.toISOString(),
      serviceDate: data.serviceDate?.toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to create receipt: ${response.statusText}`);
  }

  const result = await response.json();
  const receipt = result.receipt || result;

  // Transform date strings to Date objects
  return {
    ...receipt,
    paymentDate: new Date(receipt.paymentDate),
    serviceDate: new Date(receipt.serviceDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    emailSentAt: receipt.emailSentAt ? new Date(receipt.emailSentAt) : undefined,
    emailDeliveredAt: receipt.emailDeliveredAt ? new Date(receipt.emailDeliveredAt) : undefined,
  };
}

export async function updateReceipt(receiptId: string, data: Partial<CreateReceiptData>): Promise<Receipt> {
  const response = await fetch(`${API_BASE}/api/billing/receipts/${receiptId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...data,
      paymentDate: data.paymentDate?.toISOString(),
      serviceDate: data.serviceDate?.toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to update receipt: ${response.statusText}`);
  }

  const result = await response.json();
  const receipt = result.receipt || result;

  // Transform date strings to Date objects
  return {
    ...receipt,
    paymentDate: new Date(receipt.paymentDate),
    serviceDate: new Date(receipt.serviceDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    emailSentAt: receipt.emailSentAt ? new Date(receipt.emailSentAt) : undefined,
    emailDeliveredAt: receipt.emailDeliveredAt ? new Date(receipt.emailDeliveredAt) : undefined,
  };
}

export async function sendReceiptEmail(receiptId: string, clientEmail: string, clientName: string): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(`${API_BASE}/api/billing/receipts/${receiptId}/send-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      clientEmail,
      clientName,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    return {
      success: false,
      error: error.error || `Failed to send email: ${response.statusText}`
    };
  }

  const result = await response.json();
  return result;
}

export async function getReceiptsByClientId(clientId: string): Promise<Receipt[]> {
  const response = await fetch(`${API_BASE}/api/billing/receipts?clientId=${clientId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to fetch receipts for client: ${response.statusText}`);
  }

  const data = await response.json();
  const receipts = (data.receipts || data.data || data).map((receipt: any) => ({
    ...receipt,
    paymentDate: new Date(receipt.paymentDate),
    serviceDate: new Date(receipt.serviceDate),
    createdAt: new Date(receipt.createdAt),
    updatedAt: new Date(receipt.updatedAt),
    emailSentAt: receipt.emailSentAt ? new Date(receipt.emailSentAt) : undefined,
    emailDeliveredAt: receipt.emailDeliveredAt ? new Date(receipt.emailDeliveredAt) : undefined,
  }));

  return receipts;
}

// Service Lines API functions
export async function getServiceLines(): Promise<ServiceLine[]> {
  const response = await fetch(`${API_BASE}/api/service-lines`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Failed to fetch service lines: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data.serviceLines || data;
}

export async function getServiceTemplates(serviceLineSlug: string): Promise<any[]> {
  // This would fetch service templates for a given service line
  // For now, returning empty array - implement based on backend API
  // May need to query service-config or similar endpoint
  return [];
}
