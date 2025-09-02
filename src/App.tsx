
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import StudentDashboard from "@/pages/StudentDashboard";
import Unauthorized from "@/pages/Unauthorized";
import NotFound from "@/pages/NotFound";
import AdminDashboard from './pages/AdminDashboard';
import HODDashboard from './pages/HODDashboard';
import AdminLayout from './layouts/AdminLayout';
import Dashboard from './pages/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';

const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RouterContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const RouterContent = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  let landingRoute = '/login';
  if (user) {
    if (user.role === 'admin') {
      landingRoute = '/admin/students';
    } else if (user.role === 'hod') {
      landingRoute = '/hod-dashboard';
    } else {
      landingRoute = '/student-dashboard';
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      {/* General Dashboard Route */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute requiredRoles={['student', 'admin', 'hod']}>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Student Dashboard */}
      <Route 
        path="/student-dashboard" 
        element={
          <ProtectedRoute requiredRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="students" replace />} />
        <Route path="students" element={<AdminDashboard />} />
        <Route path="fee-components" element={<AdminDashboard />} />
        <Route path="fee-templates" element={<AdminDashboard />} />
        <Route path="fee-assignments" element={<AdminDashboard />} />
        <Route path="payments" element={<AdminDashboard />} />
        <Route path="reports" element={<AdminDashboard />} />
      </Route>
      
      {/* HOD Dashboard */}
      <Route 
        path="/hod-dashboard" 
        element={
          <ProtectedRoute requiredRoles={['hod']}>
            <HODDashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Payment Routes */}
      <Route path="/payment/success" element={<PaymentSuccess />} />
      <Route path="/payment/cancel" element={<PaymentCancel />} />
      
      {/* Other Routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/" element={<Navigate to={landingRoute} replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
