import { adminFetch } from './api';

export async function fetchDashboardMetrics() {
  const response = await adminFetch('/dashboard/metrics');
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard metrics');
  }
  return response.json();
}

/** Full reminders view: every category with every matching cat (CR-100). */
export async function fetchAllReminders(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const response = await adminFetch(`/dashboard/reminders${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch reminders');
  }
  return response.json();
}
