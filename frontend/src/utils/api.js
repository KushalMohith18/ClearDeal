import axios from 'axios';

const BASE_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cd_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cd_token');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
