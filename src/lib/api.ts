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
// BILLING (Weekly UPS tracking)
// ========================================

export async function getCurrentBillingWeek() {
  return fetchAPI('/api/billing/current');
}

export async function getBillingHistory(weeks = 12) {
  return fetchAPI(`/api/billing/history?weeks=${weeks}`);
}

export async function getBillingWeekDetail(weekId: string) {
  return fetchAPI(`/api/billing/week/${weekId}`);
}

export async function enterUPSInvoice(data: {
  weekId?: string;
  weekStart?: string;
  invoiceNumber: string;
  invoiceDate?: string;
  dueDate?: string;
  baseCharges: number;
  fuelSurcharge: number;
  residentialSurcharge?: number;
  otherCharges?: number;
  adjustments?: number;
  totalBilled: number;
  notes?: string;
}) {
  return fetchAPI('/api/billing/invoice', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function markWeekPaid(weekId: string, data: {
  amount: number;
  method?: string;
  reference?: string;
}) {
  return fetchAPI(`/api/billing/pay/${weekId}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

// ========================================
// SHIPPING
// ========================================

export async function getDashboard() {
  return fetchAPI('/api/shipping/dashboard');
}

export async function getUnfulfilledOrders(params?: {
  page?: number;
  perPage?: number;
  refresh?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.append('page', params.page.toString());
  if (params?.perPage) query.append('perPage', params.perPage.toString());
  if (params?.refresh) query.append('refresh', '1');
  
  return fetchAPI(`/api/shipping/orders?${query}`);
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

// Get shipping rates for an order
export async function getRates(orderData: any) {
  return fetchAPI('/api/shipping/rates', {
    method: 'POST',
    body: JSON.stringify({ order: orderData }),  // ← FIXED: wrap in { order: ... }
  });
}

// Get rates for multiple orders
export async function getBatchRates(orders: any[]) {
  return fetchAPI('/api/shipping/rates-batch', {
    method: 'POST',
    body: JSON.stringify({ orders }),
  });
}

// Buy a single label
export async function buyLabel(order: any, serviceCode = '03') {
  return fetchAPI('/api/shipping/buy', {
    method: 'POST',
    body: JSON.stringify({ order, serviceCode }),  // ← Already correct
  });
}

// Buy multiple labels
export async function buyBatchLabels(orders: any[], serviceCode = '03') {
  return fetchAPI('/api/shipping/buy-batch', {
    method: 'POST',
    body: JSON.stringify({ orders, serviceCode }),  // ← Already correct
  });
}

// Void a label
export async function voidLabel(trackingNumber: string, reason?: string) {
  return fetchAPI(`/api/shipping/void/${trackingNumber}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// Get shipping analytics
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
  return fetchAPI('/api/shipping/print-queue/mark-printed', {
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