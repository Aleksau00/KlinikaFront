import { authorizedHeaders, request } from './request';

export async function searchGuardians(token, term) {
  const query = term ? `?term=${encodeURIComponent(term)}` : '';

  return request(`/Guardians${query}`, {
    method: 'GET',
    headers: authorizedHeaders(token),
  });
}

export async function createGuardian(token, payload) {
  return request('/Guardians', {
    method: 'POST',
    headers: authorizedHeaders(token),
    body: JSON.stringify(payload),
  });
}
