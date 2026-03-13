import { authorizedHeaders, request } from './request';

export async function fetchDoctorAppointments(token, doctorId, fromDate, toDate) {
  const params = new URLSearchParams();

  if (fromDate) {
    params.set('fromDate', fromDate);
  }

  if (toDate) {
    params.set('toDate', toDate);
  }

  const query = params.toString();

  return request(`/Appointments/doctor/${doctorId}${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function bookAppointment(token, payload) {
  return request('/Appointments', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function checkInAppointment(token, appointmentId) {
  return request(`/Appointments/${appointmentId}/check-in`, {
    method: 'PUT',
    headers: authorizedHeaders(token),
  });
}

export async function cancelAppointment(token, appointmentId, reason) {
  const normalizedReason = String(reason || '').trim();

  return request(`/Appointments/${appointmentId}`, {
    method: 'DELETE',
    headers: authorizedHeaders(token),
    body: JSON.stringify({ reason: normalizedReason }),
  });
}

export async function markAppointmentNoShow(token, appointmentId) {
  return request(`/Appointments/${appointmentId}/mark-noshow`, {
    method: 'PUT',
    headers: authorizedHeaders(token),
  });
}

export async function fetchDoctorAvailableSlots(token, doctorId, fromDate, toDate) {
  const params = new URLSearchParams();

  if (fromDate) {
    params.set('fromDate', fromDate);
  }

  if (toDate) {
    params.set('toDate', toDate);
  }

  const query = params.toString();

  return request(`/AppointmentSlots/doctor/${doctorId}/available${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}