import { authorizedHeaders, request } from './request';

export async function searchPatients(token, term) {
  const query = term ? `?term=${encodeURIComponent(term)}` : '';

  return request(`/Patients${query}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function createPatient(token, payload) {
  return request('/Patients', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function fetchPatientAppointments(token, patientId) {
  return request(`/Appointments/patient/${patientId}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}