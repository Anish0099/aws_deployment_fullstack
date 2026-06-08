import axios from 'axios';

// Base URL — points to Spring Boot backend
// In development: http://localhost:8080
// In production: update this to your EC2 public IP or domain
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

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
