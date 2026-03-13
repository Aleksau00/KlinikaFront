import { authorizedHeaders, request } from './request';

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

export async function fetchDoctors(token, clinicId) {
  const clinicQuery = clinicId ? `?clinicId=${clinicId}` : '';

  return request(`/Workers/doctors${clinicQuery}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}