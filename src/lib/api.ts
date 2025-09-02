
import axios from 'axios';

interface User {
  id: number;
  email: string;
  role: 'student' | 'admin' | 'hod';
  is_staff: boolean;
  is_superuser: boolean;
  dept?: string;
  status?: string;
}

interface StudentProfile {
  id: number;
  name: string;
  usn: string;
  dept: string;
  semester: number;
  status: string;
  user: number; // User ID
}

interface FeeComponent {
  id: number;
  name: string;
  amount: number;
}

interface FeeTemplateComponent {
  id: number;
  component: FeeComponent;
  component_id: number;
  amount_override: number | null;
}

interface FeeTemplate {
  id: number;
  name: string;
  dept: string;
  semester: number;
  components: FeeTemplateComponent[];
  component_ids?: number[]; // For sending to backend
}

interface FeeAssignment {
  id: number;
  student: number;
  template: number;
  overrides: Record<string, number>;
}

interface Invoice {
  id: number;
  student_id: number;
  semester: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
}

interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  mode: string;
  status: string;
  timestamp: string;
}

interface Notification {
  id: number;
  user: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface StudentDashboardData {
  student: StudentProfile;
  fee_overview: {
    total_fee: number;
    paid_amount: number;
    balance_amount: number;
    progress_percentage: number;
  };
  fee_breakdown: Record<string, number>;
  recent_payments: Payment[];
  invoices: Invoice[];
}

// Stripe-related interfaces
interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  payment_id: number;
  amount: number;
  expires_at?: number;
}

interface PaymentStatusResponse {
  payment_id: number;
  session_id: string;
  payment_status: 'paid' | 'unpaid' | 'no_payment_required';
  amount_total: number;
  currency: string;
  customer_email?: string;
  created: number;
  expires_at?: number;
  invoice_id: number;
  status: 'pending' | 'success' | 'failed' | 'refunded';
}

interface RefundRequest {
  amount?: number;
  reason?: string;
}

interface RefundResponse {
  refund_id: string;
  amount: number;
  status: string;
  reason: string;
}

interface AuthResponse {
  refresh: string;
  access: string;
  user: User;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  role?: 'student' | 'admin' | 'hod';
  name?: string;
  usn?: string;
  dept?: string;
  semester?: number;
  status?: string;
}

interface CustomFeeStructure {
  id: number;
  student: number;
  components: Record<string, number>;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

interface Receipt {
  id: number;
  payment: number;
  receipt_number: string;
  amount: number;
  generated_at: string;
}

interface OutstandingReport {
  invoice_id: number;
  student_name: string;
  student_usn: string;
  department: string;
  semester: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  due_date: string;
  status: string;
}

interface CollectionsReport {
  total_collections: number;
  total_students: number;
  collection_rate: number;
  outstanding_amount: number;
}

interface HODReport {
  department: string;
  total_students: number;
  total_collections: number;
  collection_rate: number;
  outstanding_amount: number;
  semester_breakdown: Array<{
    semester: number;
    students: number;
    collected: number;
    pending: number;
    amount: number;
  }>;
}

import { config } from '@/config/env';

const api = axios.create({
  baseURL: config.API_BASE_URL,
});

// Test backend connectivity
api.interceptors.request.use(
  (config) => {
    // Add a test call to verify backend is running
    if (config.url === '/test/') {
      console.log('Testing backend connectivity...');
    }
    
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
                  const res = await axios.post(
          `${config.API_BASE_URL}/auth/token/refresh/`,
          { refresh: refreshToken }
        );
          localStorage.setItem('accessToken', res.data.access);
          api.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
          return api(originalRequest);
        } else {
          // No refresh token, or refresh failed, clear all tokens and redirect to login
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      } catch (refreshError) {
        console.error('Failed to refresh token', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

const authAPI = {
  login: (credentials: LoginCredentials) => api.post<AuthResponse>('/auth/login/', credentials),
  register: (userData: RegisterData) => api.post('/auth/register/', userData),
  me: () => api.get<User>('/auth/me/'),
  logout: () => api.post('/auth/logout/'),
  test: () => api.get('/test/'), // Test backend connectivity
};

const studentAPI = {
  getDashboard: () => api.get<StudentDashboardData>('/api/student/dashboard/').then(res => res.data),
  updateProfile: (data: Partial<StudentProfile>) => api.patch<StudentProfile>('/api/student/profile/edit/', data).then(res => res.data),
  
  // Enhanced Stripe payment methods
  createCheckoutSession: (invoiceId: number, amount?: number) => 
    api.post<CheckoutSessionResponse>(`/invoices/${invoiceId}/create-checkout-session/`, { amount }).then(res => res.data),
  
  getPaymentStatus: (sessionId: string) => 
    api.get<PaymentStatusResponse>(`/payments/${sessionId}/status/`).then(res => res.data),
  
  getPayments: () => api.get<{ payments: Payment[] }>('/api/student/payments/').then(res => res.data),
  getReceipt: (paymentId: number) => api.get(`/api/student/payments/${paymentId}/receipt/`, { responseType: 'arraybuffer' }),
  getNotifications: () => api.get<{ notifications: Notification[] }>('/notifications/').then(res => res.data),
  markNotificationRead: (notificationId: number) => api.post(`/notifications/${notificationId}/mark-read/`).then(res => res.data),
  getReceipts: () => api.get<{ receipts: Receipt[] }>('/api/student/receipts/').then(res => res.data),
};

const adminAPI = {
  // Student Management
  getStudents: (query?: string) => api.get<{ students: StudentProfile[] }>(`/students/`, { params: { query } }).then(res => res.data),
  addStudent: (data: Omit<StudentProfile, 'id'> & { email: string; password: string }) => api.post<StudentProfile>(`/students/`, data).then(res => res.data),
  updateStudent: (id: number, data: Partial<StudentProfile>) => api.patch<StudentProfile>(`/students/${id}/`, data).then(res => res.data),
  deleteStudent: (id: number) => api.delete(`/students/${id}/`),
  getStudentDetail: (id: number) => api.get<StudentProfile>(`/students/${id}/`).then(res => res.data),

  // Fee Components
  getFeeComponents: () => api.get<FeeComponent[]>(`/fee/components/`).then(res => res.data),
  addFeeComponent: (data: Omit<FeeComponent, 'id'>) => api.post<FeeComponent>(`/fee/components/`, data).then(res => res.data),
  updateFeeComponent: (id: number, data: Partial<Omit<FeeComponent, 'id'>>) => api.patch<FeeComponent>(`/fee/components/${id}/`, data).then(res => res.data),
  deleteFeeComponent: (id: number) => api.delete(`/fee/components/${id}/`),

  // Fee Templates
  getFeeTemplates: () => api.get<FeeTemplate[]>(`/fee/templates/`).then(res => res.data),
  addFeeTemplate: (data: Omit<FeeTemplate, 'id' | 'components'>) => api.post<FeeTemplate>(`/fee/templates/`, data).then(res => res.data),
  updateFeeTemplate: (id: number, data: Partial<Omit<FeeTemplate, 'id' | 'components'>>) => api.patch<FeeTemplate>(`/fee/templates/${id}/`, data).then(res => res.data),
  deleteFeeTemplate: (id: number) => api.delete(`/fee/templates/${id}/`),

  // Fee Assignments
  getFeeAssignments: () => api.get<FeeAssignment[]>(`/admin/fee-assignments/`).then(res => res.data),
  addFeeAssignment: (data: Omit<FeeAssignment, 'id'>) => api.post<FeeAssignment>(`/admin/fee-assignments/`, data).then(res => res.data),
  updateFeeAssignment: (id: number, data: Partial<FeeAssignment>) => api.patch<FeeAssignment>(`/admin/fee-assignments/${id}/`, data).then(res => res.data),
  deleteFeeAssignment: (id: number) => api.delete(`/admin/fee-assignments/${id}/`),

  // Individual Fee Assignment (NEW)
  getIndividualFeeAssignment: (studentId: number) => api.get<any>(`/admin/students/${studentId}/individual-fees/`).then(res => res.data),
  assignIndividualFees: (studentId: number, data: { components: Record<string, number> }) => api.post<any>(`/admin/students/${studentId}/individual-fees/`, data).then(res => res.data),
  getStudentFeeBreakdown: (studentId: number) => api.get<any>(`/admin/students/${studentId}/fee-breakdown/`).then(res => res.data),

  // Invoices
  getInvoices: (studentId?: number, semester?: number) => api.get<{ invoices: Invoice[] }>(`/admin/invoices/`, { params: { student_id: studentId, semester: semester } }).then(res => res.data.invoices),
  updateInvoice: (id: number, data: Partial<Invoice>) => api.patch<Invoice>(`/admin/invoices/${id}/`, data).then(res => res.data),
  
  // Payments
  getPayments: (studentId?: number) => api.get<{ payments: Payment[] }>(`/payments/`, { params: { student_id: studentId } }).then(res => res.data.payments),
  addOfflinePayment: (data: { invoice_id: number; amount: number; mode: string; transaction_id?: string }) => api.post<Payment>(`/payments/offline/`, data).then(res => res.data),
  
  // Enhanced Stripe Admin Functions
  refundPayment: (paymentId: number, data: RefundRequest) => api.post<RefundResponse>(`/payments/${paymentId}/refund/`, data).then(res => res.data),

  // Reports
  getOutstandingReports: (dept?: string, semester?: number) => api.get<{
    outstanding_invoices: OutstandingReport[];
    total_outstanding_amount: number;
  }>(`/admin/reports/outstanding/`, { params: { dept, semester } }).then(res => res.data),
  
  getCollectionsReport: (dept?: string, semester?: number) => api.get<CollectionsReport>(`/admin/reports/collections/`, { params: { dept, semester } }).then(res => res.data),

  // Student Fee Management
  getStudentFeeProfile: (studentId: number) => api.get<{ fee_profile: any }>(`/admin/students/${studentId}/fee-profile/`).then(res => res.data),
  getCustomFeeStructure: (studentId: number) => api.get<CustomFeeStructure>(`/admin/students/${studentId}/custom-fees/`).then(res => res.data),
  updateCustomFeeStructure: (studentId: number, data: { components: Record<string, number> }) => api.post<CustomFeeStructure>(`/admin/students/${studentId}/custom-fees/`, data).then(res => res.data),
  
  // Student Status Dashboard
  getStudentStatusDashboard: () => api.get<{ status_breakdown: any }>(`/admin/student-status-dashboard/`).then(res => res.data),
};

const hodAPI = {
  getStudents: (dept?: string) => api.get<{ students: StudentProfile[] }>(`/hod/students/`, { params: { dept } }).then(res => res.data),
  getReports: (dept?: string) => api.get<HODReport>(`/hod/reports/`, { params: { dept } }).then(res => res.data),
};

export { authAPI, studentAPI, adminAPI, hodAPI };
export type { 
  User, 
  StudentProfile, 
  FeeComponent, 
  FeeTemplate, 
  FeeAssignment, 
  Invoice, 
  Payment, 
  Notification,
  StudentDashboardData,
  CustomFeeStructure,
  Receipt,
  OutstandingReport,
  CollectionsReport,
  HODReport,
  CheckoutSessionResponse,
  PaymentStatusResponse,
  RefundRequest,
  RefundResponse
};
