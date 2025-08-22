import axios, { AxiosInstance } from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance for authentication
const authApi: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interface for user data extracted from JWT
export interface User {
  id: number;
  role: 'admin' | 'finance' | 'hod' | 'student';
  usn?: string; // For students
  email?: string; // For all users
  permissions?: string[]; // Optional permissions array
}

// Interface for login response
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

// Interface for permission configuration
export interface PermissionConfig {
  [key: string]: string[]; // e.g., { 'admin': ['create_student', 'delete_student'], 'staff': ['view_student'] }
}

// Permission map for RBAC
const permissionMap: PermissionConfig = {
  admin: [
    'create_student',
    'edit_student',
    'delete_student',
    'view_all',
    'manage_fees',
    'manage_invoices',
    'manage_payments',
    'manage_reports',
    'manage_notifications',
  ],
  finance: [
    'view_all',
    'manage_fees',
    'manage_invoices',
    'manage_payments',
    'manage_reports',
    'manage_notifications',
  ],
  hod: [
    'view_all',
    'edit_student',
    'manage_fees',
    'view_invoices',
    'view_payments',
    'view_reports',
    'manage_notifications',
  ],
  student: ['view_own_data', 'view_own_fees', 'view_own_invoices', 'view_own_payments'],
};

// Authentication service
export const authService = {
  // Student login with USN or email and password
  studentLogin: async (credentials: { usnOrEmail: string; password: string }): Promise<LoginResponse> => {
    try {
      const response = await authApi.post('/auth/student/login/', {
        usn_or_email: credentials.usnOrEmail,
        password: credentials.password,
      });
      const { access, refresh, user } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      return {
        accessToken: access,
        refreshToken: refresh,
        user: {
          id: user.id,
          role: user.role,
          usn: user.usn,
          email: user.email,
          permissions: user.permissions || [],
        },
      };
    } catch (error) {
      console.error('Student login failed:', error);
      throw error;
    }
  },

  // Admin login (for Admin, Finance, HOD) with email and password
  adminLogin: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    try {
      const response = await authApi.post('/auth/admin/login/', {
        email: credentials.email,
        password: credentials.password,
      });
      const { access, refresh, user } = response.data;
      localStorage.setItem('accessToken', access);
      localStorage.setItem('refreshToken', refresh);
      return {
        accessToken: access,
        refreshToken: refresh,
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          permissions: user.permissions || [],
        },
      };
    } catch (error) {
      console.error('Admin login failed:', error);
      throw error;
    }
  },

  // Decode JWT to get user data
  getUser: (): User | null => {
    const accessToken = localStorage.getItem('accessToken');
    if (accessToken) {
      try {
        const payload = JSON.parse(atob(accessToken.split('.')[1]));
        return {
          id: payload.sub || payload.id,
          role: payload.role,
          usn: payload.usn,
          email: payload.email,
          permissions: payload.permissions || [],
        };
      } catch (e) {
        console.error('Error decoding token:', e);
        return null;
      }
    }
    return null;
  },

  // Check if user has a specific permission
  hasPermission: (permission: string): boolean => {
    const user = authService.getUser();
    if (!user) return false;
    // Check permissions from JWT or role-based permission map
    return (
      user.permissions?.includes(permission) ||
      permissionMap[user.role]?.includes(permission) ||
      false
    );
  },

  // Check if user has a specific role
  hasRole: (role: string): boolean => {
    const user = authService.getUser();
    return user?.role === role || false;
  },

  // Refresh token
  refreshToken: async (): Promise<string | null> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      });
      const newAccessToken = response.data.access;
      localStorage.setItem('accessToken', newAccessToken);
      return newAccessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return null;
    }
  },

  // Logout
  logout: (): void => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },

  // Check permissions for a specific endpoint
  checkEndpointPermission: (method: string, endpoint: string): boolean => {
    const user = authService.getUser();
    if (!user) return false;

    // Normalize endpoint to extract the resource (e.g., '/admin/students/' -> 'students')
    const endpointKey = endpoint.split('/').filter(Boolean).pop() || '';
    const requiredPermission = `${method.toLowerCase()}_${endpointKey}`;
    
    // Special case for student role: restrict to own data
    if (user.role === 'student' && endpointKey === 'students') {
      return requiredPermission === 'get_students' && user.permissions?.includes('view_own_data');
    }
    
    return (
      permissionMap[user.role]?.includes(requiredPermission) ||
      user.permissions?.includes(requiredPermission) ||
      false
    );
  },
};

// Setup Axios interceptors for authentication and RBAC
// Setup Axios interceptors for authentication and RBAC
export const setupAuthInterceptors = (apiInstance: AxiosInstance) => {
  // Remove all existing request interceptors
  (apiInstance.interceptors.request as any).handlers?.slice().forEach((interceptor: any) => {
    apiInstance.interceptors.request.eject(interceptor.id);
  });
  // Remove all existing response interceptors
  (apiInstance.interceptors.response as any).handlers?.slice().forEach((interceptor: any) => {
    apiInstance.interceptors.response.eject(interceptor.id);
  });

  apiInstance.interceptors.request.use(
    (config) => {
      const accessToken = localStorage.getItem('accessToken');
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Skip RBAC for auth endpoints
      if (config.url?.includes('/auth/')) {
        return config;
      }

      // Check endpoint permissions
      const endpoint = config.url?.split(apiInstance.defaults.baseURL || '')[1] || '';
      if (!authService.checkEndpointPermission(config.method || '', endpoint)) {
        throw new Error(`Unauthorized: Insufficient permissions for ${config.method} ${endpoint}`);
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  apiInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await authService.refreshToken();
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiInstance(originalRequest);
        }
      }
      return Promise.reject(error);
    }
  );
};
