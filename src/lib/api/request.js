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

export async function request(path, options = {}) {
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

export function authorizedHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export function getApiBaseUrlLabel() {
  return API_BASE_URL === '/api' ? '/api via Vite proxy to https://localhost:7069' : API_BASE_URL;
}