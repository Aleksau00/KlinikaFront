import { authorizedHeaders, request } from './request';

export async function fetchPatientVaccinationRecords(token, patientId) {
  return request(`/Vaccinations/records/patient/${patientId}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function fetchPatientAllergens(token, patientId) {
  return request(`/Allergens/patient/${patientId}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}