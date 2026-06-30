import { authFetch } from './authApi';

const API_BASE = '/api';
const SERVER_BASE = '';

export async function adminFetch(path, options = {}) {
  return authFetch(path, options);
}

async function readApiError(response, fallback) {
  try {
    const data = await response.json();
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export async function publicFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

async function adminRequest(path) {
  try {
    const response = await adminFetch(path);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return [];
  }
}

export function fetchKittens() {
  return adminRequest('/kittens');
}

export async function fetchDashboardStats() {
  try {
    const response = await adminFetch('/kittens/dashboard/stats');
    if (!response.ok) throw new Error('Failed to fetch dashboard stats');
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return { activeKittens: 0, availableForAdoption: 0, pendingAdoptions: 0, activeFosters: 0, adoptionsThisYear: 0 };
  }
}

export async function createKitten(kittenData) {
  let response;
  try {
    response = await adminFetch('/kittens', {
      method: 'POST',
      body: JSON.stringify(kittenData),
    });
  } catch {
    throw new Error('Cannot reach the API server. Start the backend with: cd server && npm run dev');
  }

  if (!response.ok) {
    throw new Error(await readApiError(response, 'Failed to create kitten'));
  }

  return response.json();
}

export async function fetchKittenById(id) {
  const response = await adminFetch(`/kittens/${id}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'Kitten not found' : 'Failed to fetch kitten');
  return response.json();
}

export function fetchFosters() {
  return adminRequest('/fosters');
}

export async function createFoster(fosterData) {
  const response = await adminFetch('/fosters', {
    method: 'POST',
    body: JSON.stringify(fosterData),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create foster'));
  return response.json();
}

export async function fetchFosterById(id) {
  const response = await adminFetch(`/fosters/${id}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'Foster not found' : 'Failed to fetch foster');
  return response.json();
}

export async function fetchFosterPlacements(fosterId) {
  const response = await adminFetch(`/fosters/${fosterId}/placements`);
  if (!response.ok) throw new Error('Failed to load foster placements');
  return response.json();
}

export async function createFosterPlacement(fosterId, data) {
  const response = await adminFetch(`/fosters/${fosterId}/placements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create placement'));
  return response.json();
}

export async function fetchKittenPlacements(kittenId) {
  const response = await adminFetch(`/kittens/${kittenId}/placements`);
  if (!response.ok) throw new Error('Failed to load kitten placements');
  return response.json();
}

export function fetchLitters() {
  return adminRequest('/litters');
}

export async function createLitter(litterData) {
  const response = await adminFetch('/litters', {
    method: 'POST',
    body: JSON.stringify(litterData),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create litter'));
  return response.json();
}

export async function fetchLitterById(id) {
  const response = await adminFetch(`/litters/${id}`);
  if (!response.ok) throw new Error(response.status === 404 ? 'Litter not found' : 'Failed to fetch litter');
  return response.json();
}

export async function fetchMedicalRecords(kittenId) {
  try {
    const response = await adminFetch(`/medical/kitten/${kittenId}`);
    if (!response.ok) throw new Error('Failed to fetch medical records');
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    return { vaccines: [], medications: [], vetAppointments: [] };
  }
}

export async function createVaccine(recordData) {
  const response = await adminFetch('/medical/vaccines', {
    method: 'POST',
    body: JSON.stringify(recordData),
  });
  return response.json();
}

export async function createMedication(recordData) {
  const response = await adminFetch('/medical/medications', {
    method: 'POST',
    body: JSON.stringify(recordData),
  });
  return response.json();
}

export async function createVetAppointment(recordData) {
  const response = await adminFetch('/medical/vet-appointments', {
    method: 'POST',
    body: JSON.stringify(recordData),
  });
  return response.json();
}

export function fetchWeightLogs(kittenId) {
  return adminRequest(`/weights/kitten/${kittenId}`);
}

export async function createWeightLog(logData) {
  const response = await adminFetch('/weights', {
    method: 'POST',
    body: JSON.stringify(logData),
  });
  return response.json();
}

export async function fetchApplications(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const response = await adminFetch(`/applications${query}`);
  if (!response.ok) throw new Error('Failed to load applications');
  return response.json();
}

export async function createApplication(data) {
  const response = await adminFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateApplicationStatus(id, payload) {
  const response = await adminFetch(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update application status'));
  return response.json();
}

export function fetchDocuments(kittenId) {
  return adminRequest(`/kittens/${kittenId}/documents`);
}

export function fetchKittenPhotos(kittenId) {
  return adminFetch(`/kittens/${kittenId}/documents/photos`).then(async (response) => {
    if (!response.ok) throw new Error('Failed to load photos');
    return response.json();
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the selected photo'));
    reader.readAsDataURL(file);
  });
}

export async function uploadKittenPhoto(kittenId, file, { setAsPrimary = false } = {}) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Photo is too large. Max 5MB.');
  }

  const imageData = await readFileAsDataUrl(file);
  const response = await adminFetch(`/kittens/${kittenId}/documents/photos`, {
    method: 'POST',
    body: JSON.stringify({
      imageData,
      fileName: file.name,
      mimeType: file.type,
      setAsPrimary,
    }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Photo upload failed'));
  return response.json();
}

export async function setKittenPrimaryPhoto(kittenId, documentId) {
  const response = await adminFetch(`/kittens/${kittenId}/documents/${documentId}/set-primary`, {
    method: 'PATCH',
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to set profile photo'));
  return response.json();
}

export async function uploadDocument(kittenId, { file, docType, description }) {
  const formData = new FormData();
  formData.append('file', file);
  if (docType) formData.append('docType', docType);
  if (description) formData.append('description', description);
  const response = await adminFetch(`/kittens/${kittenId}/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}

export async function uploadPrimaryPhoto(kittenId, file) {
  const result = await uploadKittenPhoto(kittenId, file, { setAsPrimary: true });
  return fetchKittenById(kittenId);
}

export async function updateKitten(id, data) {
  const response = await adminFetch(`/kittens/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update kitten');
  return response.json();
}

export async function deleteDocument(kittenId, documentId) {
  await adminFetch(`/kittens/${kittenId}/documents/${documentId}`, { method: 'DELETE' });
}

export function fetchContent() {
  return adminRequest('/content');
}

export async function createContentItem(data) {
  const response = await adminFetch('/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateContentItem(id, data) {
  const response = await adminFetch(`/content/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteContentItem(id) {
  await adminFetch(`/content/${id}`, { method: 'DELETE' });
}

export function fetchSponsorships(kittenId) {
  return adminRequest(`/kittens/${kittenId}/sponsorships`);
}

export async function createSponsorship(kittenId, data) {
  const response = await adminFetch(`/kittens/${kittenId}/sponsorships`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export function fetchEvents() {
  return adminRequest('/events');
}

export async function createEvent(data) {
  const response = await adminFetch('/events', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function updateEvent(id, data) {
  const response = await adminFetch(`/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

export async function deleteEvent(id) {
  await adminFetch(`/events/${id}`, { method: 'DELETE' });
}

export function getFileUrl(path) {
  if (!path) return '#';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${SERVER_BASE}${path}`;
}

export function fetchKittenUpdates(kittenId) {
  return adminRequest(`/kittens/${kittenId}/updates`);
}

export async function createKittenUpdate(kittenId, data) {
  const response = await adminFetch(`/kittens/${kittenId}/updates`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create update');
  return response.json();
}

export async function createSocialMediaPost(kittenId, data) {
  const response = await adminFetch(`/kittens/${kittenId}/updates/social`, {
    method: 'POST',
    body: JSON.stringify({
      content: data.content,
      publishTargets: data.publishTargets || data.platforms || [],
    }),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to post to social platforms'));
  return response.json();
}

export async function updateKittenUpdate(kittenId, updateId, data) {
  const response = await adminFetch(`/kittens/${kittenId}/updates/${updateId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to update milestone');
  return response.json();
}

export async function deleteKittenUpdate(kittenId, updateId) {
  await adminFetch(`/kittens/${kittenId}/updates/${updateId}`, { method: 'DELETE' });
}

export async function fetchSettings() {
  const response = await adminFetch('/settings');
  if (!response.ok) throw new Error('Failed to load settings');
  return response.json();
}

export async function updateSettings(data) {
  const response = await adminFetch('/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update settings'));
  return response.json();
}

export async function fetchFinanceStats() {
  const response = await adminFetch('/transactions/stats');
  if (!response.ok) throw new Error('Failed to load finance stats');
  return response.json();
}

export async function fetchTransactions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.startDate) params.set('startDate', filters.startDate);
  if (filters.endDate) params.set('endDate', filters.endDate);
  const query = params.toString();
  const response = await adminFetch(`/transactions${query ? `?${query}` : ''}`);
  if (!response.ok) throw new Error('Failed to load transactions');
  return response.json();
}

export async function createTransaction(data) {
  const response = await adminFetch('/transactions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create transaction'));
  return response.json();
}

export async function deleteTransaction(id) {
  const response = await adminFetch(`/transactions/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to delete transaction'));
}

export async function fetchEmailTemplates() {
  const response = await adminFetch('/email-templates');
  if (!response.ok) throw new Error('Failed to load email templates');
  return response.json();
}

export async function createEmailTemplate(data) {
  const response = await adminFetch('/email-templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to create email template'));
  return response.json();
}

export async function updateEmailTemplate(id, data) {
  const response = await adminFetch(`/email-templates/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update email template'));
  return response.json();
}

export async function deleteEmailTemplate(id) {
  const response = await adminFetch(`/email-templates/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to delete email template'));
}

export async function fetchEmailLogs(limit = 50) {
  const response = await adminFetch(`/email-templates/logs?limit=${limit}`);
  if (!response.ok) throw new Error('Failed to load email logs');
  return response.json();
}

export async function updateEmailSettings(data) {
  const response = await adminFetch('/email-templates/settings', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(await readApiError(response, 'Failed to update email settings'));
  return response.json();
}
