import { authorizedHeaders, request } from './request';

export async function fetchAllergens(token) {
  return request('/Allergens', {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function addPatientAllergen(token, patientId, allergenId, diagnosedDate, notes) {
  return request('/Allergens/patient', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify({ patientId, allergenId, diagnosedDate, notes: notes || null }),
  });
}

export async function removePatientAllergen(token, patientId, allergenId) {
  return request(`/Allergens/patient/${patientId}/allergen/${allergenId}`, {
    method: 'DELETE',
    headers: authorizedHeaders(token),
  });
}
