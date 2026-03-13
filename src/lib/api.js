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
  let rawText = '';

  try {
    rawText = await response.text();
    payload = rawText ? JSON.parse(rawText) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const validationErrors = payload?.errors && typeof payload.errors === 'object'
      ? Object.values(payload.errors).flat().join(' ')
      : '';
    const plainTextReason = typeof rawText === 'string' ? rawText.trim() : '';
    const reason = payload?.message || payload?.title || validationErrors || plainTextReason || `Request failed with status ${response.status}`;
    throw new Error(reason);
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

export async function fetchDoctors(token, clinicId) {
  const clinicQuery = clinicId ? `?clinicId=${clinicId}` : '';

  return request(`/Workers/doctors${clinicQuery}`, {
    method: 'GET',
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
