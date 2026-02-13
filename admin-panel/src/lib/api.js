// src/lib/api.js
import axios from 'axios';

// Helper to get cookie value
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
  return null;
}

const api = axios.create({
  baseURL: '/api/admin/',               // using proxy in vite.config.js or package.json
  withCredentials: true,                // REQUIRED for session cookies
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add CSRF token to unsafe methods (POST/PUT/DELETE)
api.interceptors.request.use((config) => {
  // Only add X-CSRFToken for methods that require it
  if (['post', 'put', 'delete', 'patch'].includes(config.method)) {
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
      config.headers['X-CSRFToken'] = csrfToken;
    }
  }
  return config;
}, (error) => Promise.reject(error));

// Handle 401 globally (optional – can be removed if you handle per request)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      // You can redirect or set auth state to null here
      console.warn('Auth error → probably need to login again');
      // window.location.href = '/login';   // ← uncomment only if you want auto-redirect
    }
    return Promise.reject(error);
  }
);

// API group exports
export const auth = {
  login: (phone_number, password) =>
    api.post('auth/login/', { phone_number, password }),

  logout: () =>
    api.post('auth/logout/'),

  getProfile: () =>
    api.get('auth/profile/'),
};

export const difficulty = {
  getAll: () => api.get('difficulty/'),
  create: (data) => api.post('difficulty/', data),
  update: (id, data) => api.put(`difficulty/${id}/`, data),
  delete: (id) => api.delete(`difficulty/${id}/`),
};

export const gameConfig = {
  get: () => api.get('config/'),
  update: (data) => api.put('config/', data),
};

export const cards = {
  fruits: {
    getAll: () => api.get('cards/fruits/'),
    create: (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      return api.post('cards/fruits/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    update: (id, data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      return api.put(`cards/fruits/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    delete: (id) => api.delete(`cards/fruits/${id}/`),
  },
  texts: {
    getAll: () => api.get('cards/texts/'),
    create: (data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      return api.post('cards/texts/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    update: (id, data) => {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      return api.put(`cards/texts/${id}/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    delete: (id) => api.delete(`cards/texts/${id}/`),
  },
};

export const analytics = {
  overview: (days = 30) => api.get(`analytics/overview/?days=${days}`),
  players: () => api.get('analytics/players/'),
};

export const players = {
  list: (params = {}) => api.get('players/', { params }),
  update: (id, data) => api.put(`players/${id}/`, data),
};

export const promos = {
  list: () => api.get('promos/'),
  generate: (count = 1) => api.post('promos/', { count }),
};

export const preview = {
  simulate: (settings) => api.post('preview/settings/', settings),
};

export default api;