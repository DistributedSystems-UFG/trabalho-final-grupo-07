import apiClient from './client';

export const updateUser = ({ name, password }) => {
  const payload = {};
  if (name) payload.name = name;
  if (password) payload.password = password;
  return apiClient.put('/users/me', payload);
};

export const getUserStats = () => {
  return apiClient.get('/users/me/stats');
};