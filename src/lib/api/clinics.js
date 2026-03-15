import { authorizedHeaders, request } from './request';

export async function fetchClinics() {
  return request('/Clinics', {
    method: 'GET',
  });
}

export async function fetchCities() {
  return request('/Cities', {
    method: 'GET',
  });
}

export async function createClinic(token, payload) {
  return request('/Clinics', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function updateClinic(token, clinicId, payload) {
  return request(`/Clinics/${clinicId}`, {
    method: 'PUT',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function deleteClinic(token, clinicId) {
  return request(`/Clinics/${clinicId}`, {
    method: 'DELETE',
    headers: authorizedHeaders(token),
  });
}