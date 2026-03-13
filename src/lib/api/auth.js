import { request } from './request';

export async function loginWorker(credentials) {
  return request('/Auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}