
import axios from 'axios';

interface User {
  id: number;
  email: string;
  role: 'student' | 'admin' | 'hod';
  is_staff: boolean;
  is_superuser: boolean;
  name?: string;
  usn?: string;
  dept?: string;
  semester?: number;
  admission_mode?: string;
  status?: string;
}

/**
 * Enhanced Fee Management API
 * 
 * This API provides comprehensive fee management functionality including:
 * - Component-based partial payments
 * - Bulk and auto fee assignments with dry run support
 * - Enhanced security and validation
 * - Professional receipt generation
 * - Real-time payment status tracking
 * 
 * Key Features:
 * 1. Students can pay specific fee components (tuition, library, exam fees, etc.)
 * 2. Partial payments with component selection
 * 3. Dry run mode for testing assignments
 * 4. Enhanced security with rate limiting and validation
 * 5. Professional receipt generation with component breakdown
 */

interface StudentProfile {
  id: number;
  name: string;
  usn: string;
  dept: string;
  semester: number;
  status: string;
  user: number; // User ID
  admission_mode?: string;
  email?: string;
  password?: string;
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
  admission_mode?: string;
  dept?: string;
  fee_type: string;
  academic_year: string;
  semester?: number;
  total_amount?: number;
  is_active: boolean;
  components: FeeTemplateComponent[];
  component_ids?: number[]; // For sending to backend
}

interface FeeAssignment {
  id: number;
  student: number;
  template: number;
  academic_year: string;
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

interface InvoiceComponent {
  id: number;
  component_name: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  is_payable: boolean;
  payment_percentage: number;
}

interface InvoiceComponentsResponse {
  invoice_id: number;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  components: InvoiceComponent[];
  total_payable: number;
  can_pay_partial: boolean;
}

interface ComponentPaymentRequest {
  component_payments: Array<{
    component_id: number;
    amount: number;
  }>;
  dry_run?: boolean;
}

interface ComponentPaymentResponse {
  checkout_url: string;
  session_id: string;
  payment_id: number;
  amount: number;
  components_selected: number;
  expires_at: number;
  is_partial_payment: boolean;
}

interface BulkAssignmentRequest {
  admission_mode: string;
  department: string;
  template_id: number;
  academic_year?: string;
  dry_run?: boolean;
}

interface BulkAssignmentResponse {
  message: string;
  assignments_created: number;
  invoices_created: number;
  students_processed: number;
  dry_run: boolean;
  template_used: {
    id: number;
    name: string;
    total_amount: number;
    admission_mode: string;
    department: string;
  };
}

interface AutoAssignmentRequest {
  admission_modes: string[];
  departments?: string[];
  academic_year?: string;
  dry_run?: boolean;
}

interface AutoAssignmentResponse {
  message: string;
  total_assignments_created: number;
  total_invoices_created: number;
  results: Record<string, {
    students_processed: number;
    assignments_created: number;
    invoices_created: number;
    template_used: string;
    dry_run: boolean;
  }>;
  dry_run: boolean;
}

interface BulkAssignmentStats {
  bulk_assignment_stats: Array<{
    admission_mode: string;
    admission_mode_name: string;
    department: string;
    total_students: number;
    assigned_students: number;
    unassigned_students: number;
    available_templates: Array<{
      id: number;
      name: string;
      total_amount: number;
      fee_type: string;
    }>;
  }>;
}

interface AutoAssignmentPreview {
  auto_assignment_rules: Record<string, {
    template_pattern: string;
    auto_assign: boolean;
  }>;
  statistics: Array<{
    admission_mode: string;
    department: string;
    rule: {
      template_pattern: string;
      auto_assign: boolean;
    };
    total_students: number;
    assigned_students: number;
    unassigned_students: number;
    matching_templates: Array<{
      id: number;
      name: string;
      total_amount: number;
      fee_type: string;
    }>;
  }>;
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
  
  // Component-based payment functions
  getInvoiceComponents: (invoiceId: number) => 
    api.get<InvoiceComponentsResponse>(`/invoices/${invoiceId}/components/`).then(res => res.data),
  
  createComponentPayment: (invoiceId: number, data: ComponentPaymentRequest) => 
    api.post<ComponentPaymentResponse>(`/invoices/${invoiceId}/component-payment/`, data).then(res => res.data),
  
  // Enhanced invoice and payment functions
  getInvoiceDetail: (invoiceId: number) => 
    api.get<Invoice & { components: InvoiceComponent[] }>(`/api/student/invoices/${invoiceId}/`).then(res => res.data),
  
  getPaymentDetail: (paymentId: number) => 
    api.get<Payment & { invoice: Invoice; components: InvoiceComponent[] }>(`/api/student/payments/${paymentId}/`).then(res => res.data),
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
  getFeeAssignments: () => api.get<FeeAssignment[]>(`/fee/assignments/`).then(res => res.data),
  addFeeAssignment: (data: Omit<FeeAssignment, 'id'>) => api.post<FeeAssignment>(`/fee/assignments/`, data).then(res => res.data),
  updateFeeAssignment: (id: number, data: Partial<FeeAssignment>) => api.patch<FeeAssignment>(`/fee/assignments/${id}/`, data).then(res => res.data),
  deleteFeeAssignment: (id: number) => api.delete(`/fee/assignments/${id}/`),

  // Individual Fee Assignment (NEW)
  getIndividualFeeAssignment: (studentId: number) => api.get<any>(`/admin/students/${studentId}/individual-fees/`).then(res => res.data),
  assignIndividualFees: (studentId: number, data: { components: Record<string, number> }) => api.post<any>(`/admin/students/${studentId}/individual-fees/`, data).then(res => res.data),
  getStudentFeeBreakdown: (studentId: number) => api.get<any>(`/admin/students/${studentId}/fee-breakdown/`).then(res => res.data),

  // Invoices
  getInvoices: (studentId?: number, semester?: number) => api.get<{ invoices: Invoice[] }>(`/invoices/`, { params: { student_id: studentId, semester: semester } }).then(res => res.data.invoices),
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
  }>(`/reports/outstanding/`, { params: { dept, semester } }).then(res => res.data),
  
  getCollectionsReport: (dept?: string, semester?: number) => api.get<CollectionsReport>(`/reports/collections/`, { params: { dept, semester } }).then(res => res.data),

  // Student Fee Management
  getStudentFeeProfile: (studentId: number) => api.get<{ fee_profile: any }>(`/admin/students/${studentId}/fee-profile/`).then(res => res.data),
  getCustomFeeStructure: (studentId: number) => api.get<CustomFeeStructure>(`/admin/students/${studentId}/custom-fees/`).then(res => res.data),
  updateCustomFeeStructure: (studentId: number, data: { components: Record<string, number> }) => api.post<CustomFeeStructure>(`/admin/students/${studentId}/custom-fees/`, data).then(res => res.data),
  
  // Student Status Dashboard
  getStudentStatusDashboard: () => api.get<{ status_breakdown: any }>(`/admin/student-status-dashboard/`).then(res => res.data),

  // Enhanced Bulk Fee Assignment with dry run support
  getBulkAssignmentStats: () => api.get<BulkAssignmentStats>(`/bulk-fee-assignment/`).then(res => res.data),
  bulkAssignFees: (data: BulkAssignmentRequest) => 
    api.post<BulkAssignmentResponse>(`/bulk-fee-assignment/`, data).then(res => res.data),

  // Enhanced Auto Fee Assignment with dry run support
  getAutoAssignmentPreview: () => api.get<AutoAssignmentPreview>(`/auto-assign-fees/`).then(res => res.data),
  executeAutoAssignment: (data: AutoAssignmentRequest) => 
    api.post<AutoAssignmentResponse>(`/auto-assign-fees/`, data).then(res => res.data),
  
  // Component-based payment management for admin
  getInvoiceComponentsAdmin: (invoiceId: number) => 
    api.get<InvoiceComponentsResponse>(`/invoices/${invoiceId}/components/`).then(res => res.data),
  
  // Enhanced reporting with component details
  getDetailedCollectionsReport: (params?: { dept?: string; semester?: number; admission_mode?: string }) => 
    api.get<CollectionsReport & { component_breakdown: any[] }>(`/reports/collections/`, { params }).then(res => res.data),
  
  getPaymentComponentBreakdown: (paymentId: number) => 
    api.get<{ payment: Payment; components: InvoiceComponent[] }>(`/payments/${paymentId}/components/`).then(res => res.data),
};

const hodAPI = {
  getStudents: (dept?: string) => api.get<{ students: StudentProfile[] }>(`/hod/students/`, { params: { dept } }).then(res => res.data),
  getReports: (dept?: string) => api.get<HODReport>(`/hod/reports/`, { params: { dept } }).then(res => res.data),
};

// Utility functions for payment calculations and formatting
const paymentUtils = {
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  },

  calculatePaymentSummary: (components: InvoiceComponent[]) => {
    const totalAmount = components.reduce((sum, comp) => sum + comp.total_amount, 0);
    const paidAmount = components.reduce((sum, comp) => sum + comp.paid_amount, 0);
    const balanceAmount = components.reduce((sum, comp) => sum + comp.balance_amount, 0);
    const payableComponents = components.filter(comp => comp.is_payable);
    
    return {
      totalAmount,
      paidAmount,
      balanceAmount,
      payableComponents: payableComponents.length,
      paymentProgress: totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0
    };
  },

  validateComponentPayments: (components: InvoiceComponent[], payments: ComponentPaymentRequest['component_payments']) => {
    const errors: string[] = [];
    
    for (const payment of payments) {
      const component = components.find(c => c.id === payment.component_id);
      
      if (!component) {
        errors.push(`Component with ID ${payment.component_id} not found`);
        continue;
      }
      
      if (payment.amount <= 0) {
        errors.push(`Payment amount for ${component.component_name} must be greater than 0`);
        continue;
      }
      
      if (payment.amount > component.balance_amount) {
        errors.push(`Payment amount for ${component.component_name} exceeds balance (₹${component.balance_amount})`);
        continue;
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  getPaymentStatusColor: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'success':
      case 'paid':
        return '#10b981'; // green
      case 'pending':
        return '#f59e0b'; // yellow
      case 'failed':
        return '#ef4444'; // red
      case 'refunded':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  },

  getPaymentStatusText: (status: string): string => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'Payment Successful';
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Payment Pending';
      case 'failed':
        return 'Payment Failed';
      case 'refunded':
        return 'Refunded';
      default:
        return status;
    }
  }
};

export { authAPI, studentAPI, adminAPI, hodAPI, paymentUtils };
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
  RefundResponse,
  InvoiceComponent,
  InvoiceComponentsResponse,
  ComponentPaymentRequest,
  ComponentPaymentResponse,
  BulkAssignmentRequest,
  BulkAssignmentResponse,
  AutoAssignmentRequest,
  AutoAssignmentResponse,
  BulkAssignmentStats,
  AutoAssignmentPreview
};
