
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

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'hod':
      return <HODDashboard />;
    default:
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Invalid user role</p>
        </div>
      );
  }
};

export default Dashboard;
