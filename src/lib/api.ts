
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// API endpoints
export const authAPI = {
  login: (credentials: { email: string; password: string }) =>
    api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  register: (userData: any) => api.post('/auth/register', userData),
};

export const studentAPI = {
  getDashboard: () => api.get('/me/dashboard'),
  getInvoices: () => api.get('/invoices'),
  getInvoiceDetail: (id: string) => api.get(`/invoices/${id}`),
  createCheckoutSession: (invoiceId: string, amount: number) =>
    api.post(`/invoices/${invoiceId}/create-checkout-session`, { amount }),
  getPayments: () => api.get('/payments'),
  getReceipt: (id: string) => api.get(`/receipts/${id}`),
};

export const adminAPI = {
  // Students
  getStudents: (query?: string) => api.get(`/students${query ? `?query=${query}` : ''}`),
  addStudent: (student: any) => api.post('/students', student),
  updateStudent: (id: string, updates: any) => api.patch(`/students/${id}`, updates),
  
  // Fee Components
  getFeeComponents: () => api.get('/fee/components'),
  addFeeComponent: (component: any) => api.post('/fee/components', component),
  updateFeeComponent: (id: string, updates: any) => api.patch(`/fee/components/${id}`, updates),
  
  // Fee Templates
  getFeeTemplates: () => api.get('/fee/templates'),
  addFeeTemplate: (template: any) => api.post('/fee/templates', template),
  updateFeeTemplate: (id: string, updates: any) => api.patch(`/fee/templates/${id}`, updates),
  
  // Fee Assignments
  assignFeeTemplate: (assignment: any) => api.post('/fee/assignments', assignment),
  updateFeeAssignment: (id: string, updates: any) => api.patch(`/fee/assignments/${id}`, updates),
  
  // Invoices
  generateInvoices: (data: any) => api.post('/invoices/generate', data),
  getInvoices: (params?: any) => api.get('/invoices', { params }),
  updateInvoice: (id: string, updates: any) => api.patch(`/invoices/${id}`, updates),
  
  // Payments
  getPayments: (params?: any) => api.get('/payments', { params }),
  addOfflinePayment: (payment: any) => api.post('/payments/offline', payment),
  
  // Reports
  getCollectionReports: (params: any) => api.get('/reports/collections', { params }),
  getOutstandingReports: (params: any) => api.get('/reports/outstanding', { params }),
};

export const hodAPI = {
  getDepartmentStudents: () => api.get('/hod/students'),
  getDepartmentReports: () => api.get('/hod/reports'),
};
