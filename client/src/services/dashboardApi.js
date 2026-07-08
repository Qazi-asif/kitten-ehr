import { adminFetch } from './api';

export async function fetchDashboardMetrics() {
  const response = await adminFetch('/dashboard/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
}
