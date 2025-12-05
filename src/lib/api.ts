/**
 * API Client for JP Shipping Hub
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://jp-fulfillment-tracker-bcf083e55b7a.herokuapp.com';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const url = `${API_BASE}${endpoint}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  
  return res.json();
}

// ========================================
// WALLET
// ========================================

export async function getWalletSummary() {
  return fetchAPI('/api/wallet');
}

export async function getWalletTransactions(params?: {
  type?: string;
  limit?: number;
  skip?: number;
}) {
  const query = new URLSearchParams();
  if (params?.type) query.append('type', params.type);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.skip) query.append('skip', params.skip.toString());
  
  return fetchAPI(`/api/wallet/transactions?${query}`);
}

export async function getWalletAnalytics(startDate?: string, endDate?: string) {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  
  return fetchAPI(`/api/wallet/analytics?${query}`);
}

// ========================================
// SHIPPING
// ========================================

export async function getDashboard() {
  return fetchAPI('/api/shipping/dashboard');
}

export async function getUnfulfilledOrders(limit = 50) {
  return fetchAPI(`/api/shipping/orders?limit=${limit}`);
}

export async function getShipments(params?: {
  status?: string;
  limit?: number;
  skip?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.append('status', params.status);
  if (params?.limit) query.append('limit', params.limit.toString());
  if (params?.skip) query.append('skip', params.skip.toString());
  
  return fetchAPI(`/api/shipping/shipments?${query}`);
}

export async function getRates(orderData: any) {
  return fetchAPI('/api/shipping/rates', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

export async function buyLabel(order: any, serviceCode = '03') {
  return fetchAPI('/api/shipping/buy', {
    method: 'POST',
    body: JSON.stringify({ order, serviceCode }),
  });
}

export async function buyBatchLabels(orders: any[], serviceCode = '03') {
  return fetchAPI('/api/shipping/buy-batch', {
    method: 'POST',
    body: JSON.stringify({ orders, serviceCode }),
  });
}

export async function voidLabel(trackingNumber: string, reason?: string) {
  return fetchAPI(`/api/shipping/void/${trackingNumber}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getShippingAnalytics(startDate?: string, endDate?: string) {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  
  return fetchAPI(`/api/shipping/analytics?${query}`);
}

// ========================================
// LABELS
// ========================================

export async function getPrintQueue() {
  return fetchAPI('/api/shipping/print-queue');
}

export async function markLabelsPrinted(shipmentIds: string[]) {
  return fetchAPI('/api/labels/mark-printed', {
    method: 'POST',
    body: JSON.stringify({ shipmentIds }),
  });
}

export function getLabelDownloadUrl(shipmentId: string) {
  return `${API_BASE}/api/labels/${shipmentId}`;
}

export function getBatchLabelsUrl() {
  return `${API_BASE}/api/labels/queue/download`;
}

// ========================================
// FULFILLMENT
// ========================================

export async function getFulfillmentStatus() {
  return fetchAPI('/api/fulfillment-status');
}
