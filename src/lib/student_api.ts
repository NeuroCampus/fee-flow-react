import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance with default configuration
const studentApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
studentApi.interceptors.request.use(
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
studentApi.interceptors.response.use(
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
          studentApi.defaults.headers.common['Authorization'] = `Bearer ${res.data.access}`;
          
          // Retry the original request
          return studentApi(originalRequest);
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
export interface StudentProfile {
  id: number;
  name: string;
  usn: string;
  email: string;
  dept: string;
  semester: number;
  status: 'active' | 'inactive' | 'graduated';
  phone?: string;
  address?: string;
  date_of_birth?: string;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  created_at: string;
  updated_at: string;
}

export interface FeeComponent {
  id: number;
  name: string;
  description?: string;
  amount: number;
  is_optional: boolean;
}

export interface FeeTemplate {
  id: number;
  name: string;
  description?: string;
  dept: string;
  semester: number;
  components: FeeComponent[];
  total_amount: number;
  academic_year: string;
}

export interface FeeAssignment {
  id: number;
  template: FeeTemplate;
  assigned_date: string;
  due_date: string;
  status: 'pending' | 'active' | 'completed';
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
}

export interface Invoice {
  id: number;
  fee_assignment: number;
  invoice_number: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: number;
  invoice_id: number;
  amount: number;
  mode: 'online' | 'offline' | 'scholarship' | 'waiver';
  transaction_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface StudentFeesData {
  fee_assignments: FeeAssignment[];
  invoices: Invoice[];
  total_outstanding: number;
  total_paid: number;
  upcoming_due_date?: string;
  fee_breakdown: {
    tuition_fee: number;
    lab_fee: number;
    book_fee: number;
    hostel_fee: number;
    other_fees: number;
  };
  semester_fees: Array<{
    semester: number;
    total_amount: number;
    paid_amount: number;
    outstanding: number;
    due_date: string;
    status: 'pending' | 'partial' | 'paid' | 'overdue';
  }>;
}

export interface StudentPaymentsData {
  payments: Payment[];
  total_payments: number;
  total_amount_paid: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'reminder';
  is_read: boolean;
  created_at: string;
  action_url?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  amount: number;
  currency: string;
  status: 'open' | 'complete' | 'expired';
  payment_intent_id?: string;
}

export interface PaymentReceipt {
  receipt_number: string;
  student_name: string;
  usn: string;
  payment_date: string;
  amount: number;
  payment_mode: string;
  transaction_id: string;
  invoice_number: string;
  fee_details: Array<{
    component: string;
    amount: number;
  }>;
}

// Student Profile Management API functions
export const studentProfileAPI = {
  // GET /student/profile/ - Get student profile
  getProfile: async (): Promise<StudentProfile> => {
    try {
      const response = await studentApi.get('/student/profile/');
      return response.data;
    } catch (error) {
      console.error('Error fetching student profile:', error);
      throw error;
    }
  },

  // PATCH /student/profile/update/ - Update student profile
  updateProfile: async (profileData: Partial<StudentProfile>): Promise<StudentProfile> => {
    try {
      const response = await studentApi.patch('/student/profile/update/', profileData);
      return response.data;
    } catch (error) {
      console.error('Error updating student profile:', error);
      throw error;
    }
  },
};

// Student Fees Management API functions
export const studentFeesAPI = {
  // GET /student/fees/ - Get assigned fees and invoices
  getFees: async (params?: {
    status?: string;
    academic_year?: string;
    semester?: number;
  }): Promise<StudentFeesData> => {
    try {
      const response = await studentApi.get('/student/fees/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching student fees:', error);
      throw error;
    }
  },

  // Get specific fee assignment details
  getFeeAssignment: async (assignmentId: number): Promise<FeeAssignment> => {
    try {
      const response = await studentApi.get(`/student/fees/assignments/${assignmentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching fee assignment:', error);
      throw error;
    }
  },

  // Get specific invoice details
  getInvoice: async (invoiceId: number): Promise<Invoice> => {
    try {
      const response = await studentApi.get(`/student/fees/invoices/${invoiceId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  },

  // Download invoice PDF
  downloadInvoice: async (invoiceId: number): Promise<Blob> => {
    try {
      const response = await studentApi.get(`/student/fees/invoices/${invoiceId}/download/`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading invoice:', error);
      throw error;
    }
  },

  // Get fee breakdown by component
  getFeeBreakdown: async (semester?: number): Promise<{
    components: Array<{
      name: string;
      amount: number;
      paid_amount: number;
      outstanding: number;
      is_optional: boolean;
    }>;
    total: number;
    paid: number;
    outstanding: number;
  }> => {
    try {
      const response = await studentApi.get('/student/fees/breakdown/', {
        params: { semester }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching fee breakdown:', error);
      throw error;
    }
  },

  // Get upcoming due dates
  getUpcomingDues: async (): Promise<Array<{
    invoice_id: number;
    invoice_number: string;
    amount: number;
    due_date: string;
    days_remaining: number;
    is_overdue: boolean;
  }>> => {
    try {
      const response = await studentApi.get('/student/fees/upcoming-dues/');
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming dues:', error);
      throw error;
    }
  },
};

// Student Payments Management API functions
export const studentPaymentsAPI = {
  // GET /student/payments/ - Get payment history
  getPayments: async (params?: {
    status?: string;
    mode?: string;
    start_date?: string;
    end_date?: string;
    page?: number;
    page_size?: number;
  }): Promise<StudentPaymentsData> => {
    try {
      const response = await studentApi.get('/student/payments/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching student payments:', error);
      throw error;
    }
  },

  // Get specific payment details
  getPayment: async (paymentId: number): Promise<Payment> => {
    try {
      const response = await studentApi.get(`/student/payments/${paymentId}/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw error;
    }
  },

  // Download payment receipt
  downloadReceipt: async (paymentId: number): Promise<Blob> => {
    try {
      const response = await studentApi.get(`/student/payments/${paymentId}/receipt/`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading receipt:', error);
      throw error;
    }
  },

  // Create payment intent for online payment
  createPaymentIntent: async (invoiceId: number, amount: number): Promise<{
    payment_intent_id: string;
    client_secret: string;
    amount: number;
  }> => {
    try {
      const response = await studentApi.post(`/student/payments/${invoiceId}/create-intent/`, {
        amount
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  },

  // Create Stripe Checkout Session
  createStripeCheckoutSession: async (invoiceId: number, amount: number): Promise<StripeCheckoutSession> => {
    try {
      const response = await studentApi.post(`/student/payments/${invoiceId}/create-checkout-session/`, {
        amount,
        success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${window.location.origin}/payment/cancel`
      });
      return response.data;
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw error;
    }
  },

  // Confirm payment
  confirmPayment: async (paymentIntentId: string, paymentMethodId: string): Promise<Payment> => {
    try {
      const response = await studentApi.post('/student/payments/confirm/', {
        payment_intent_id: paymentIntentId,
        payment_method_id: paymentMethodId
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  },

  // Get payment receipt
  getPaymentReceipt: async (paymentId: number): Promise<PaymentReceipt> => {
    try {
      const response = await studentApi.get(`/student/payments/${paymentId}/receipt-data/`);
      return response.data;
    } catch (error) {
      console.error('Error fetching payment receipt:', error);
      throw error;
    }
  },

  // Verify payment status
  verifyPaymentStatus: async (sessionId: string): Promise<{
    status: 'success' | 'pending' | 'failed';
    payment: Payment;
    message: string;
  }> => {
    try {
      const response = await studentApi.get(`/student/payments/verify/${sessionId}/`);
      return response.data;
    } catch (error) {
      console.error('Error verifying payment status:', error);
      throw error;
    }
  },
};

// Student Dashboard API functions
export const studentDashboardAPI = {
  // Get comprehensive dashboard data
  getDashboard: async (): Promise<{
    profile: StudentProfile;
    fees_summary: {
      total_assigned: number;
      total_paid: number;
      total_outstanding: number;
      upcoming_due_date?: string;
      overdue_count: number;
      next_due_amount: number;
      days_until_next_due: number;
    };
    recent_invoices: Invoice[];
    recent_payments: Payment[];
    notifications: Notification[];
    quick_actions: Array<{
      id: string;
      title: string;
      description: string;
      action_url: string;
      icon: string;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> => {
    try {
      const response = await studentApi.get('/student/dashboard/');
      return response.data;
    } catch (error) {
      console.error('Error fetching student dashboard:', error);
      throw error;
    }
  },

  // Get academic progress
  getAcademicProgress: async (): Promise<{
    current_semester: number;
    total_credits_earned: number;
    total_credits_required: number;
    gpa: number;
    attendance_percentage: number;
    fee_status: 'clear' | 'pending' | 'overdue';
    academic_standing: 'good' | 'warning' | 'probation';
    next_semester_fees: number;
  }> => {
    try {
      const response = await studentApi.get('/student/academic-progress/');
      return response.data;
    } catch (error) {
      console.error('Error fetching academic progress:', error);
      throw error;
    }
  },

  // Get dashboard analytics
  getDashboardAnalytics: async (): Promise<{
    payment_trends: Array<{
      month: string;
      amount_paid: number;
      invoices_count: number;
    }>;
    fee_distribution: {
      tuition: number;
      lab: number;
      books: number;
      hostel: number;
      other: number;
    };
    upcoming_deadlines: Array<{
      type: 'fee_due' | 'document_submission' | 'exam_registration';
      title: string;
      due_date: string;
      days_remaining: number;
      priority: 'high' | 'medium' | 'low';
    }>;
  }> => {
    try {
      const response = await studentApi.get('/student/dashboard/analytics/');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      throw error;
    }
  },
};

// Student Notifications API functions
export const studentNotificationsAPI = {
  // Get all notifications
  getNotifications: async (params?: {
    type?: string;
    is_read?: boolean;
    priority?: string;
    page?: number;
    page_size?: number;
  }): Promise<{
    notifications: Notification[];
    total_count: number;
    unread_count: number;
  }> => {
    try {
      const response = await studentApi.get('/student/notifications/', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId: number): Promise<void> => {
    try {
      await studentApi.post(`/student/notifications/${notificationId}/mark-read/`);
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (): Promise<void> => {
    try {
      await studentApi.post('/student/notifications/mark-all-read/');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId: number): Promise<void> => {
    try {
      await studentApi.delete(`/student/notifications/${notificationId}/`);
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Get notification preferences
  getNotificationPreferences: async (): Promise<{
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    due_date_reminders: boolean;
    payment_confirmation: boolean;
    academic_updates: boolean;
  }> => {
    try {
      const response = await studentApi.get('/student/notifications/preferences/');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  },

  // Update notification preferences
  updateNotificationPreferences: async (preferences: Partial<{
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    due_date_reminders: boolean;
    payment_confirmation: boolean;
    academic_updates: boolean;
  }>): Promise<void> => {
    try {
      await studentApi.patch('/student/notifications/preferences/', preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },
};

// Utility functions for common operations
export const studentUtils = {
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

  // Format currency
  formatCurrency: (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
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

  // Validate profile update data
  validateProfileData: (data: Partial<StudentProfile>): string[] => {
    const errors: string[] = [];
    
    if (data.phone && !/^[0-9]{10}$/.test(data.phone)) {
      errors.push('Phone number must be 10 digits');
    }
    
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Invalid email format');
    }
    
    if (data.date_of_birth) {
      const dob = new Date(data.date_of_birth);
      const now = new Date();
      if (dob > now) {
        errors.push('Date of birth cannot be in the future');
      }
    }
    
    return errors;
  },

  // Generate payment summary
  generatePaymentSummary: (payments: Payment[]): {
    total_paid: number;
    online_payments: number;
    offline_payments: number;
    scholarship_amount: number;
    waiver_amount: number;
  } => {
    return payments.reduce((summary, payment) => {
      summary.total_paid += payment.amount;
      
      switch (payment.mode) {
        case 'online':
          summary.online_payments += payment.amount;
          break;
        case 'offline':
          summary.offline_payments += payment.amount;
          break;
        case 'scholarship':
          summary.scholarship_amount += payment.amount;
          break;
        case 'waiver':
          summary.waiver_amount += payment.amount;
          break;
      }
      
      return summary;
    }, {
      total_paid: 0,
      online_payments: 0,
      offline_payments: 0,
      scholarship_amount: 0,
      waiver_amount: 0
    });
  },

  // Calculate fee summary
  calculateFeeSummary: (feeData: StudentFeesData): {
    total_assigned: number;
    total_paid: number;
    total_outstanding: number;
    payment_percentage: number;
    overdue_amount: number;
    next_due_info?: {
      amount: number;
      due_date: string;
      days_remaining: number;
    };
  } => {
    const total_assigned = feeData.fee_assignments.reduce((sum, assignment) => sum + assignment.total_amount, 0);
    const total_paid = feeData.total_paid;
    const total_outstanding = feeData.total_outstanding;
    const payment_percentage = total_assigned > 0 ? (total_paid / total_assigned) * 100 : 0;
    
    const overdue_invoices = feeData.invoices.filter(invoice => 
      new Date(invoice.due_date) < new Date() && invoice.status !== 'paid'
    );
    const overdue_amount = overdue_invoices.reduce((sum, invoice) => sum + invoice.balance_amount, 0);
    
    let next_due_info;
    if (feeData.upcoming_due_date) {
      const dueDate = new Date(feeData.upcoming_due_date);
      const now = new Date();
      const daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      const nextDueInvoice = feeData.invoices.find(invoice => 
        invoice.due_date === feeData.upcoming_due_date
      );
      
      if (nextDueInvoice) {
        next_due_info = {
          amount: nextDueInvoice.balance_amount,
          due_date: feeData.upcoming_due_date,
          days_remaining: daysRemaining
        };
      }
    }
    
    return {
      total_assigned,
      total_paid,
      total_outstanding,
      payment_percentage: Math.round(payment_percentage * 100) / 100,
      overdue_amount,
      next_due_info
    };
  },

  // Format file size for downloads
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Get priority color for notifications
  getPriorityColor: (priority: string): string => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  },

  // Get notification icon
  getNotificationIcon: (type: string): string => {
    switch (type) {
      case 'reminder': return '⏰';
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  },
};

// Export all APIs as a single object for convenience
export const studentAPI = {
  profile: studentProfileAPI,
  fees: studentFeesAPI,
  payments: studentPaymentsAPI,
  dashboard: studentDashboardAPI,
  notifications: studentNotificationsAPI,
  utils: studentUtils,
};

export default studentAPI;
