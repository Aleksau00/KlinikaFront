const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

function buildHeaders(optionsHeaders) {
  const headers = {
    ...(optionsHeaders || {}),
  };

  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(options.headers),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Request failed with status ${response.status}`);
  }

  return payload;
}

function authorizedHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getApiBaseUrlLabel() {
  return API_BASE_URL === '/api' ? '/api via Vite proxy to https://localhost:7069' : API_BASE_URL;
}

export async function loginWorker(credentials) {
  return request('/Auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function fetchCurrentWorker(token) {
  return request('/Workers/me', {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function fetchWorkers(token) {
  return request('/Workers', {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function createWorker(token, payload) {
  return request('/Workers', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function fetchClinics() {
  return request('/Clinics', {
    method: 'GET',
  });
}

export async function updateWorker(token, id, payload) {
  return request(`/Workers/${id}`, {
    method: 'PUT',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function setWorkerActive(token, id, isActive) {
  return request(`/Workers/${id}/active`, {
    method: 'PATCH',
    headers: authorizedHeaders(token),
    body: JSON.stringify({ isActive }),
  });
}
