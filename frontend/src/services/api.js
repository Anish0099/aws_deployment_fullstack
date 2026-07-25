import axios from 'axios';

// Base URL configuration:
// In production (AWS): It falls back to '/api', which routes through your Nginx proxy.
// In local development: You can create a .env file and set VITE_API_URL=http://localhost:8080/api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============ Employee API ============

export const getAllEmployees = () => {
  return api.get('/employees');
};

export const getEmployeeById = (id) => {
  return api.get(`/employees/${id}`);
};

export const createEmployee = (employee) => {
  return api.post('/employees', employee);
};

export const updateEmployee = (id, employee) => {
  return api.put(`/employees/${id}`, employee);
};

export const deleteEmployee = (id) => {
  return api.delete(`/employees/${id}`);
};

export default api;