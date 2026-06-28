import apiClient from './client';

export const registerUser = (name, password) => {
  return apiClient.post('/auth/register', { name, password });
};

export const loginUser = (name, password) => {
  return apiClient.post('/auth/login', { name, password });
};