import { request } from './request';

export async function fetchClinics() {
  return request('/Clinics', {
    method: 'GET',
  });
}