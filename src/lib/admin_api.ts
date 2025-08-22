import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default configuration
const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
adminApi.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh and error handling
adminApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const res = await axios.post(
            `${API_BASE_URL}/auth/token/refresh/`,
            { refresh: refreshToken }
          );
          
          localStorage.setItem('accessToken', res.data.access);
          adminApi.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
          
          // Retry the original request
          return adminApi(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// TypeScript interfaces for data structures
export interface Student {
  id?: number;
  name: string;
  usn: string;
  email: string;
  dept: string;
  semester: number;
  status: 'active' | 'inactive' | 'graduated';
  phone?: string;
  address?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  admission_date?: string;
  academic_year?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeComponent {
  id?: number;
  name: string;
  description?: string;
  amount: number;
  is_optional: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FeeTemplate {
  id?: number;
  name: string;
  description?: string;
  dept: string;
  semester: number;
  components: FeeComponent[];
  total_amount: number;
  academic_year: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeeAssignment {
  id?: number;
  student_id: number;
  template_id: number;
  assigned_date: string;
  due_date: string;
  status: 'pending' | 'active' | 'completed';
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Invoice {
  id: number;
  student_id: number;
  student_name: string;
  usn: string;
  invoice_number: string;
  fee_assignment_id: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  student_id: number;
  amount: number;
  mode: 'online' | 'offline' | 'scholarship' | 'waiver';
  transaction_id?: string;
  stripe_payment_intent_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentWebhook {
  id: string;
  type: 'payment_intent.succeeded' | 'payment_intent.payment_failed' | 'invoice.payment_succeeded';
  data: {
    object: {
      id: string;
      amount: number;
      status: string;
      metadata?: Record<string, string>;
    };
  };
  created: number;
}

export interface OutstandingReport {
  total_outstanding: number;
  total_students: number;
  overdue_amount: number;
  overdue_students: number;
  department_wise: Array<{
    dept: string;
    outstanding: number;
    student_count: number;
  }>;
  semester_wise: Array<{
    semester: number;
    outstanding: number;
    student_count: number;
  }>;
  students: Array<{
    id: number;
    name: string;
    usn: string;
    dept: string;
    semester: number;
    outstanding_amount: number;
    due_date: string;
    days_overdue: number;
  }>;
}

export interface Notification {
  id: number;
  student_id: number;
  student_name: string;
  usn: string;
  message: string;
  type: 'reminder' | 'warning' | 'payment_confirmation' | 'due_date_alert';
  priority: 'low' | 'medium' | 'high';
  is_sent: boolean;
  sent_at?: string;
  created_at: string;
}

export interface BulkOperationResult {
  success_count: number;
  failure_count: number;
  errors: Array<{
    student_id: number;
    student_name: string;
    error: string;
  }>;
  success_list: Array<{
    student_id: number;
    student_name: string;
    message: string;
  }>;
}

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Student Management API functions
export const studentAPI = {
  // GET /admin/students/ - Get all students with optional filtering
  getStudents: async (params?: {
    search?: string;
    dept?: string;
    semester?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Student>> => {
    try {
      const response = await adminApi.get('/admin/students/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  // POST /admin/students/ - Add new student
  addStudent: async (studentData: Omit<Student, 'id' | 'created_at' | 'updated_at'>): Promise<Student> => {
    try {
      const response = await adminApi.post('/admin/students/', studentData);
      return response.data;
    } catch (error) {
      console.error('Error adding student:', error);
      throw error;
    }
  },

  // PATCH /admin/students/:id/ - Edit existing student
  editStudent: async (id: number, studentData: Partial<Student>): Promise<Student> => {
    try {
      const response = await adminApi.patch(`/admin/students/${id}/`, studentData);
      return response.data;
    } catch (error) {
      console.error('Error editing student:', error);
      throw error;
    }
  },

  // DELETE /admin/students/:id/ - Delete student
  deleteStudent: async (id: number): Promise<void> => {
    try {
      await adminApi.delete(`/admin/students/${id}/`);
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  // Get student by ID
  getStudentById: async (id: number): Promise<Student> => {
    try {
      const response = await adminApi.get(`/admin/students/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  },

  // Bulk import students from Excel/CSV
  bulkImportStudents: async (file: File): Promise<BulkOperationResult> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await adminApi.post('/admin/students/bulk-import/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk importing students:', error);
      throw error;
    }
  },

  // Bulk update student departments/semesters
  bulkUpdateStudents: async (updates: Array<{
    student_id: number;
    dept?: string;
    semester?: number;
    status?: string;
  }>): Promise<BulkOperationResult> => {
    try {
      const response = await adminApi.post('/admin/students/bulk-update/', { updates });
      return response.data;
    } catch (error) {
      console.error('Error bulk updating students:', error);
      throw error;
    }
  },

  // Get student statistics
  getStudentStats: async (): Promise<{
    total_students: number;
    active_students: number;
    inactive_students: number;
    graduated_students: number;
    dept_distribution: Array<{
      dept: string;
      count: number;
    }>;
    semester_distribution: Array<{
      semester: number;
      count: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/students/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching student stats:', error);
      throw error;
    }
  },

  // Search students with advanced filters
  searchStudents: async (params: {
    query?: string;
    dept?: string;
    semester?: number;
    status?: string;
    academic_year?: string;
    admission_date_from?: string;
    admission_date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Student>> => {
    try {
      const response = await adminApi.get('/admin/students/search/', { params });
      return response.data;
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  },
};

// Fee Template Management API functions
export const feeTemplateAPI = {
  // GET /admin/fee-templates/ - Get all fee templates
  getFeeTemplates: async (params?: {
    dept?: string;
    semester?: number;
    academic_year?: string;
  }): Promise<FeeTemplate[]> => {
    try {
      const response = await adminApi.get('/admin/fee-templates/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching fee templates:', error);
      throw error;
    }
  },

  // POST /admin/fee-template/ - Create new fee template
  createFeeTemplate: async (templateData: Omit<FeeTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<FeeTemplate> => {
    try {
      const response = await adminApi.post('/admin/fee-template/', templateData);
      return response.data;
    } catch (error) {
      console.error('Error creating fee template:', error);
      throw error;
    }
  },

  // PATCH /admin/fee-templates/:id/ - Edit existing fee template
  editFeeTemplate: async (id: number, templateData: Partial<FeeTemplate>): Promise<FeeTemplate> => {
    try {
      const response = await adminApi.patch(`/admin/fee-templates/${id}/`, templateData);
      return response.data;
    } catch (error) {
      console.error('Error editing fee template:', error);
      throw error;
    }
  },

  // DELETE /admin/fee-templates/:id/ - Delete fee template
  deleteFeeTemplate: async (id: number): Promise<void> => {
    try {
      await adminApi.delete(`/admin/fee-templates/${id}/`);
    } catch (error) {
      console.error('Error deleting fee template:', error);
      throw error;
    }
  },

  // Get fee template by ID
  getFeeTemplateById: async (id: number): Promise<FeeTemplate> => {
    try {
      const response = await adminApi.get(`/admin/fee-templates/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching fee template:', error);
      throw error;
    }
  },

  // Duplicate fee template
  duplicateFeeTemplate: async (id: number, newName: string): Promise<FeeTemplate> => {
    try {
      const response = await adminApi.post(`/admin/fee-templates/${id}/duplicate/`, {
        new_name: newName
      });
      return response.data;
    } catch (error) {
      console.error('Error duplicating fee template:', error);
      throw error;
    }
  },

  // Get fee template statistics
  getFeeTemplateStats: async (): Promise<{
    total_templates: number;
    active_templates: number;
    total_revenue: number;
    dept_wise_templates: Array<{
      dept: string;
      count: number;
      total_amount: number;
    }>;
    semester_wise_templates: Array<{
      semester: number;
      count: number;
      total_amount: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/fee-templates/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fee template stats:', error);
      throw error;
    }
  },

  // Bulk create fee templates
  bulkCreateFeeTemplates: async (templates: Array<{
    name: string;
    dept: string;
    semester: number;
    academic_year: string;
    components: Array<{
      name: string;
      amount: number;
      is_optional: boolean;
    }>;
  }>): Promise<FeeTemplate[]> => {
    try {
      const response = await adminApi.post('/admin/fee-templates/bulk-create/', { templates });
      return response.data;
    } catch (error) {
      console.error('Error bulk creating fee templates:', error);
      throw error;
    }
  },
};

// Fee Assignment Management API functions
export const feeAssignmentAPI = {
  // GET /admin/fee-assignments/ - Get all fee assignments
  getFeeAssignments: async (params?: {
    student_id?: number;
    template_id?: number;
    status?: string;
    dept?: string;
    semester?: number;
  }): Promise<FeeAssignment[]> => {
    try {
      const response = await adminApi.get('/admin/fee-assignments/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching fee assignments:', error);
      throw error;
    }
  },

  // POST /admin/assign-fee/ - Assign fee template to student
  assignFeeTemplate: async (assignmentData: Omit<FeeAssignment, 'id' | 'created_at' | 'updated_at'>): Promise<FeeAssignment> => {
    try {
      const response = await adminApi.post('/admin/assign-fee/', assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error assigning fee template:', error);
      throw error;
    }
  },

  // PATCH /admin/fee-assignments/:id/ - Edit existing fee assignment
  editFeeAssignment: async (id: number, assignmentData: Partial<FeeAssignment>): Promise<FeeAssignment> => {
    try {
      const response = await adminApi.patch(`/admin/fee-assignments/${id}/`, assignmentData);
      return response.data;
    } catch (error) {
      console.error('Error editing fee assignment:', error);
      throw error;
    }
  },

  // DELETE /admin/fee-assignments/:id/ - Delete fee assignment
  deleteFeeAssignment: async (id: number): Promise<void> => {
    try {
      await adminApi.delete(`/admin/fee-assignments/${id}/`);
    } catch (error) {
      console.error('Error deleting fee assignment:', error);
      throw error;
    }
  },

  // Get fee assignment by ID
  getFeeAssignmentById: async (id: number): Promise<FeeAssignment> => {
    try {
      const response = await adminApi.get(`/admin/fee-assignments/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching fee assignment:', error);
      throw error;
    }
  },

  // Bulk assign fee templates to multiple students
  bulkAssignFeeTemplate: async (assignments: Array<{
    student_id: number;
    template_id: number;
    due_date: string;
  }>): Promise<FeeAssignment[]> => {
    try {
      const response = await adminApi.post('/admin/assign-fee/bulk/', { assignments });
      return response.data;
    } catch (error) {
      console.error('Error bulk assigning fee templates:', error);
      throw error;
    }
  },

  // Auto-generate invoices for fee assignments
  generateInvoices: async (assignmentIds: number[]): Promise<{
    generated_count: number;
    invoices: Invoice[];
  }> => {
    try {
      const response = await adminApi.post('/admin/fee-assignments/generate-invoices/', {
        assignment_ids: assignmentIds
      });
      return response.data;
    } catch (error) {
      console.error('Error generating invoices:', error);
      throw error;
    }
  },

  // Get fee assignment statistics
  getFeeAssignmentStats: async (): Promise<{
    total_assignments: number;
    active_assignments: number;
    completed_assignments: number;
    total_revenue: number;
    collected_revenue: number;
    outstanding_revenue: number;
  }> => {
    try {
      const response = await adminApi.get('/admin/fee-assignments/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fee assignment stats:', error);
      throw error;
    }
  },
};

// Fee Component Management API functions
export const feeComponentAPI = {
  // GET /admin/fee-components/ - Get all fee components
  getFeeComponents: async (): Promise<FeeComponent[]> => {
    try {
      const response = await adminApi.get('/admin/fee-components/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fee components:', error);
      throw error;
    }
  },

  // POST /admin/fee-components/ - Create new fee component
  createFeeComponent: async (componentData: Omit<FeeComponent, 'id' | 'created_at' | 'updated_at'>): Promise<FeeComponent> => {
    try {
      const response = await adminApi.post('/admin/fee-components/', componentData);
      return response.data;
    } catch (error) {
      console.error('Error creating fee component:', error);
      throw error;
    }
  },

  // PATCH /admin/fee-components/:id/ - Edit existing fee component
  editFeeComponent: async (id: number, componentData: Partial<FeeComponent>): Promise<FeeComponent> => {
    try {
      const response = await adminApi.patch(`/admin/fee-components/${id}/`, componentData);
      return response.data;
    } catch (error) {
      console.error('Error editing fee component:', error);
      throw error;
    }
  },

  // DELETE /admin/fee-components/:id/ - Delete fee component
  deleteFeeComponent: async (id: number): Promise<void> => {
    try {
      await adminApi.delete(`/admin/fee-components/${id}/`);
    } catch (error) {
      console.error('Error deleting fee component:', error);
      throw error;
    }
  },

  // Get fee component statistics
  getFeeComponentStats: async (): Promise<{
    total_components: number;
    total_amount: number;
    most_used_components: Array<{
      name: string;
      usage_count: number;
      total_amount: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/fee-components/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fee component stats:', error);
      throw error;
    }
  },
};

// Invoice Management API functions
export const invoiceAPI = {
  // GET /admin/invoices/ - Get all invoices with filtering
  getInvoices: async (params?: {
    student_id?: number;
    dept?: string;
    semester?: number;
    status?: string;
    due_date_from?: string;
    due_date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Invoice>> => {
    try {
      const response = await adminApi.get('/admin/invoices/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }
  },

  // Get invoice by ID
  getInvoiceById: async (id: number): Promise<Invoice> => {
    try {
      const response = await adminApi.get(`/admin/invoices/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },

  // Update invoice
  updateInvoice: async (id: number, data: Partial<Invoice>): Promise<Invoice> => {
    try {
      const response = await adminApi.patch(`/admin/invoices/${id}/`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  },

  // Delete invoice
  deleteInvoice: async (id: number): Promise<void> => {
    try {
      await adminApi.delete(`/admin/invoices/${id}/`);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  },

  // Download invoice PDF
  downloadInvoice: async (id: number): Promise<Blob> => {
    try {
      const response = await adminApi.get(`/admin/invoices/${id}/download/`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  },

  // Bulk download invoices
  bulkDownloadInvoices: async (invoiceIds: number[]): Promise<Blob> => {
    try {
      const response = await adminApi.post('/admin/invoices/bulk-download/', {
        invoice_ids: invoiceIds
      }, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk downloading invoices:', error);
      throw error;
    }
  },

  // Get invoice statistics
  getInvoiceStats: async (): Promise<{
    total_invoices: number;
    pending_invoices: number;
    paid_invoices: number;
    overdue_invoices: number;
    total_amount: number;
    collected_amount: number;
    outstanding_amount: number;
  }> => {
    try {
      const response = await adminApi.get('/admin/invoices/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice stats:', error);
      throw error;
    }
  },
};

// Payment Management API functions
export const paymentAPI = {
  // GET /admin/payments/ - Get all payments with filtering
  getPayments: async (params?: {
    student_id?: number;
    invoice_id?: number;
    status?: string;
    mode?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Payment>> => {
    try {
      const response = await adminApi.get('/admin/payments/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }
  },

  // Get payment by ID
  getPaymentById: async (id: number): Promise<Payment> => {
    try {
      const response = await adminApi.get(`/admin/payments/${id}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  },

  // Add offline payment
  addOfflinePayment: async (data: {
    invoice_id: number;
    amount: number;
    mode: 'offline' | 'scholarship' | 'waiver';
    transaction_id?: string;
    notes?: string;
  }): Promise<Payment> => {
    try {
      const response = await adminApi.post('/admin/payments/offline/', data);
      return response.data;
    } catch (error) {
      console.error('Error adding offline payment:', error);
      throw error;
    }
  },

  // Update payment status
  updatePaymentStatus: async (id: number, status: string, notes?: string): Promise<Payment> => {
    try {
      const response = await adminApi.patch(`/admin/payments/${id}/status/`, {
        status,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw error;
    }
  },

  // Process Stripe webhook
  processStripeWebhook: async (webhookData: PaymentWebhook): Promise<{
    success: boolean;
    message: string;
    payment?: Payment;
  }> => {
    try {
      const response = await adminApi.post('/admin/payments/stripe-webhook/', webhookData);
      return response.data;
    } catch (error) {
      console.error('Error processing Stripe webhook:', error);
      throw error;
    }
  },

  // Get payment statistics
  getPaymentStats: async (): Promise<{
    total_payments: number;
    successful_payments: number;
    failed_payments: number;
    total_amount: number;
    mode_distribution: Array<{
      mode: string;
      count: number;
      amount: number;
    }>;
    daily_trends: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/payments/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      throw error;
    }
  },
};

// Reports API functions
export const reportsAPI = {
  // Get outstanding collections report
  getOutstandingReport: async (params?: {
    dept?: string;
    semester?: number;
    status?: string;
    due_date_from?: string;
    due_date_to?: string;
  }): Promise<OutstandingReport> => {
    try {
      const response = await adminApi.get('/admin/reports/outstanding/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching outstanding report:', error);
      throw error;
    }
  },

  // Download outstanding report as Excel
  downloadOutstandingReportExcel: async (params?: {
    dept?: string;
    semester?: number;
    status?: string;
  }): Promise<Blob> => {
    try {
      const response = await adminApi.get('/admin/reports/outstanding/excel/', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading outstanding report Excel:', error);
      throw error;
    }
  },

  // Download outstanding report as PDF
  downloadOutstandingReportPDF: async (params?: {
    dept?: string;
    semester?: number;
    status?: string;
  }): Promise<Blob> => {
    try {
      const response = await adminApi.get('/admin/reports/outstanding/pdf/', {
        params,
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading outstanding report PDF:', error);
      throw error;
    }
  },

  // Get revenue report
  getRevenueReport: async (params?: {
    date_from: string;
    date_to: string;
    dept?: string;
    semester?: number;
  }): Promise<{
    total_revenue: number;
    total_payments: number;
    dept_wise_revenue: Array<{
      dept: string;
      revenue: number;
      payment_count: number;
    }>;
    daily_revenue: Array<{
      date: string;
      revenue: number;
      payment_count: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/reports/revenue/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue report:', error);
      throw error;
    }
  },

  // Get dashboard analytics
  getDashboardAnalytics: async (): Promise<{
    total_students: number;
    total_revenue: number;
    collected_revenue: number;
    outstanding_revenue: number;
    recent_payments: Payment[];
    overdue_invoices: Invoice[];
    payment_trends: Array<{
      date: string;
      amount: number;
      count: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/dashboard/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  },
};

// Notifications API functions
export const notificationsAPI = {
  // Get all notifications
  getNotifications: async (params?: {
    student_id?: number;
    type?: string;
    priority?: string;
    is_sent?: boolean;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    try {
      const response = await adminApi.get('/admin/notifications/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Create notification
  createNotification: async (data: {
    student_id: number;
    message: string;
    type: string;
    priority: string;
  }): Promise<Notification> => {
    try {
      const response = await adminApi.post('/admin/notifications/', data);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Send due date reminders
  sendDueDateReminders: async (params?: {
    dept?: string;
    semester?: number;
    days_before_due?: number;
  }): Promise<{
    sent_count: number;
    failed_count: number;
    notifications: Notification[];
  }> => {
    try {
      const response = await adminApi.post('/admin/notifications/send-reminders/', params);
      return response.data;
    } catch (error) {
      console.error('Error sending due date reminders:', error);
      throw error;
    }
  },

  // Bulk send notifications
  bulkSendNotifications: async (notifications: Array<{
    student_id: number;
    message: string;
    type: string;
    priority: string;
  }>): Promise<{
    success_count: number;
    failure_count: number;
    results: Array<{
      student_id: number;
      success: boolean;
      message: string;
    }>;
  }> => {
    try {
      const response = await adminApi.post('/admin/notifications/bulk-send/', {
        notifications
      });
      return response.data;
    } catch (error) {
      console.error('Error bulk sending notifications:', error);
      throw error;
    }
  },

  // Get notification statistics
  getNotificationStats: async (): Promise<{
    total_notifications: number;
    sent_notifications: number;
    pending_notifications: number;
    type_distribution: Array<{
      type: string;
      count: number;
    }>;
    priority_distribution: Array<{
      priority: string;
      count: number;
    }>;
  }> => {
    try {
      const response = await adminApi.get('/admin/notifications/stats/');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification stats:', error);
      throw error;
    }
  },
};

// Utility functions for common operations
export const adminUtils = {
  // Calculate total amount for a fee template
  calculateTemplateTotal: (components: FeeComponent[]): number => {
    return components.reduce((total, component) => total + component.amount, 0);
  },

  // Format currency
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  },

  // Validate student data
  validateStudentData: (data: Partial<Student>): string[] => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) errors.push('Name is required');
    if (!data.usn?.trim()) errors.push('USN is required');
    if (!data.email?.trim()) errors.push('Email is required');
    if (!data.dept?.trim()) errors.push('Department is required');
    if (!data.semester || data.semester < 1 || data.semester > 8) {
      errors.push('Semester must be between 1 and 8');
    }
    
    return errors;
  },

  // Validate fee template data
  validateFeeTemplateData: (data: Partial<FeeTemplate>): string[] => {
    const errors: string[] = [];
    
    if (!data.name?.trim()) errors.push('Template name is required');
    if (!data.dept?.trim()) errors.push('Department is required');
    if (!data.semester || data.semester < 1 || data.semester > 8) {
      errors.push('Semester must be between 1 and 8');
    }
    if (!data.academic_year?.trim()) errors.push('Academic year is required');
    if (!data.components?.length) errors.push('At least one fee component is required');
    
    return errors;
  },

  // Calculate outstanding amount
  calculateOutstanding: (totalAmount: number, paidAmount: number): number => {
    return Math.max(0, totalAmount - paidAmount);
  },

  // Check if payment is overdue
  isOverdue: (dueDate: string): boolean => {
    const due = new Date(dueDate);
    const now = new Date();
    return due < now;
  },

  // Get days until due
  getDaysUntilDue: (dueDate: string): number => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  },

  // Format date
  formatDate: (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // Get payment status color
  getPaymentStatusColor: (status: string): string => {
    switch (status) {
      case 'paid': return 'text-green-600';
      case 'partial': return 'text-yellow-600';
      case 'pending': return 'text-blue-600';
      case 'overdue': return 'text-red-600';
      default: return 'text-gray-600';
    }
  },

  // Get payment status badge
  getPaymentStatusBadge: (status: string): string => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  },

  // Generate invoice number
  generateInvoiceNumber: (): string => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `INV-${timestamp}-${random}`;
  },

  // Validate USN format
  validateUSN: (usn: string): boolean => {
    // Example: 1MS20CS001 (1MS + Year + Dept + Number)
    const usnRegex = /^1MS\d{2}[A-Z]{2}\d{3}$/;
    return usnRegex.test(usn);
  },

  // Export data to Excel
  exportToExcel: (data: any[], filename: string): void => {
    // This would typically use a library like xlsx
    console.log('Exporting to Excel:', filename, data);
  },

  // Export data to PDF
  exportToPDF: (data: any[], filename: string): void => {
    // This would typically use a library like jsPDF
    console.log('Exporting to PDF:', filename, data);
  },
};

// Export all APIs as a single object for convenience
export const adminAPI = {
  students: studentAPI,
  feeTemplates: feeTemplateAPI,
  feeAssignments: feeAssignmentAPI,
  feeComponents: feeComponentAPI,
  invoices: invoiceAPI,
  payments: paymentAPI,
  reports: reportsAPI,
  notifications: notificationsAPI,
  utils: adminUtils,
};

export default adminAPI;
