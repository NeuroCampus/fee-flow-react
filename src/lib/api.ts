
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
  dues: number;
  total_fee: number;
  paid_amount: number;
  invoices: Invoice[];
}

interface AuthResponse {
  refresh: string;
  access: string;
  user: User;
}

interface LoginCredentials {
  email: string;
  password?: string;
}

interface RegisterData extends LoginCredentials {
  role?: 'student' | 'admin' | 'hod';
  name?: string;
  usn?: string;
  dept?: string;
  semester?: number;
  status?: string;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use(
  (config) => {
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
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL}/auth/token/refresh/`,
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
  me: (accessToken: string) => api.get<User>('/auth/me/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }),
};

const studentAPI = {
  getDashboard: () => api.get<StudentDashboardData>('/student/dashboard/'),
  updateProfile: (data: Partial<StudentProfile>) => api.patch<StudentProfile>('/student/me/profile/', data),
  createCheckoutSession: (invoiceId: number, amount: number) => api.post<{ checkout_url: string }>(`/payments/${invoiceId}/create-checkout-session/`, { amount }),
  getPayments: () => api.get<{ payments: Payment[] }>('/student/payments/'),
  getReceipt: (paymentId: number) => api.get(`/student/payments/${paymentId}/receipt/`, { responseType: 'arraybuffer' }),
  getNotifications: () => api.get<{ notifications: Notification[] }>('/student/notifications/'),
  markNotificationRead: (notificationId: number) => api.post(`/student/notifications/${notificationId}/mark-read/`),
};

const adminAPI = {
  // Student Management
  getStudents: (query?: string) => api.get<{ students: StudentProfile[] }>(`/admin/students/`, { params: { query } }),
  addStudent: (data: any) => api.post<StudentProfile>(`/admin/students/`, data),
  updateStudent: (id: number, data: Partial<StudentProfile>) => api.patch<StudentProfile>(`/admin/students/${id}/`, data),
  deleteStudent: (id: number) => api.delete(`/admin/students/${id}/`),

  // Fee Components
  getFeeComponents: () => api.get<FeeComponent[]>(`/admin/fee-components/`),
  addFeeComponent: (data: Omit<FeeComponent, 'id'>) => api.post<FeeComponent>(`/admin/fee-components/`, data),
  updateFeeComponent: (id: number, data: Partial<Omit<FeeComponent, 'id'>>) => api.patch<FeeComponent>(`/admin/fee-components/${id}/`, data),
  deleteFeeComponent: (id: number) => api.delete(`/admin/fee-components/${id}/`),

  // Fee Templates
  getFeeTemplates: () => api.get<FeeTemplate[]>(`/admin/fee-templates/`),
  addFeeTemplate: (data: Omit<FeeTemplate, 'id' | 'components'>) => api.post<FeeTemplate>(`/admin/fee-templates/`, data),
  updateFeeTemplate: (id: number, data: Partial<Omit<FeeTemplate, 'id' | 'components'>>) => api.patch<FeeTemplate>(`/admin/fee-templates/${id}/`, data),
  deleteFeeTemplate: (id: number) => api.delete(`/admin/fee-templates/${id}/`),

  // Fee Assignments
  getFeeAssignments: () => api.get<FeeAssignment[]>(`/admin/fee-assignments/`),
  addFeeAssignment: (data: Omit<FeeAssignment, 'id'>) => api.post<FeeAssignment>(`/admin/fee-assignments/`, data),
  updateFeeAssignment: (id: number, data: Partial<FeeAssignment>) => api.patch<FeeAssignment>(`/admin/fee-assignments/${id}/`, data),
  deleteFeeAssignment: (id: number) => api.delete(`/admin/fee-assignments/${id}/`),

  // Invoices
  getInvoices: (studentId?: number, semester?: number) => api.get<Invoice[]>(`/admin/invoices/`, { params: { student_id: studentId, semester: semester } }),
  updateInvoice: (id: number, data: Partial<Invoice>) => api.patch<Invoice>(`/admin/invoices/${id}/`, data),
  
  // Payments
  getPayments: (studentId?: number) => api.get<Payment[]>(`/admin/payments/`, { params: { student_id: studentId } }),
  addOfflinePayment: (data: { invoice_id: number; amount: number; mode: string; transaction_id?: string }) => api.post<Payment>(`/admin/offline-payment/`, data),

  // Reports
  getOutstandingReports: (dept?: string, semester?: number) => api.get<{
    outstanding_invoices: Invoice[];
    total_outstanding_amount: number;
  }>(`/admin/reports/outstanding/`, { params: { dept, semester } }),
};

export { authAPI, studentAPI, adminAPI };
