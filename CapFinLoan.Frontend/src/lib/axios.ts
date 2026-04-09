import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5021/gateway',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('capfinloan_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor for 401s (token expired/invalid)
api.interceptors.response.use((response) => response, (error) => {
  if (error.response && error.response.status === 401) {
    localStorage.removeItem('capfinloan_token');
    localStorage.removeItem('capfinloan_user');
    window.location.href = '/login';
  }
  return Promise.reject(error);
});

export default api;
