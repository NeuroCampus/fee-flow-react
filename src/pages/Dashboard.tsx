
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import HODDashboard from './HODDashboard';


const Dashboard = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Add backend status check for debugging
  const showBackendStatus = import.meta.env.DEV; // Only show in development

  return (
    <div>
      
      
      {user.role === 'student' && <StudentDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
      {user.role === 'hod' && <HODDashboard />}
      {!['student', 'admin', 'hod'].includes(user.role) && (
        <div className="min-h-screen flex items-center justify-center">
          <p>Invalid user role: {user.role}</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
