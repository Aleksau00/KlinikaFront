import { authorizedHeaders, request } from './request';

export async function fetchMySlots(token, fromDate, toDate) {
  const params = new URLSearchParams();

  if (fromDate) {
    params.set('fromDate', fromDate);
  }

  if (toDate) {
    params.set('toDate', toDate);
  }

  const query = params.toString();

  return request(`/AppointmentSlots/my-slots${query ? `?${query}` : ''}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function createSlot(token, date, startTime) {
  const params = new URLSearchParams({ date, startTime });

  return request(`/AppointmentSlots?${params}`, {
    method: 'POST',
    headers: authorizedHeaders(token),
  });
}

export async function createWeeklySlots(token) {
  return request('/AppointmentSlots/weekly', {
    method: 'POST',
    headers: authorizedHeaders(token),
  });
}

export async function createCustomSlots(token, payload) {
  return request('/AppointmentSlots/custom', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}

export async function markSlotUnavailable(token, id) {
  return request(`/AppointmentSlots/${id}/unavailable`, {
    method: 'PATCH',
    headers: authorizedHeaders(token),
  });
}

export async function deleteSlot(token, id) {
  return request(`/AppointmentSlots/${id}`, {
    method: 'DELETE',
    headers: authorizedHeaders(token),
  });
}
