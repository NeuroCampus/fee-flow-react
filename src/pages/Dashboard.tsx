
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import AdminDashboard from './AdminDashboard';
import HODDashboard from './HODDashboard';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';


const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  // Add backend status check for debugging
  const showBackendStatus = import.meta.env.DEV; // Only show in development

  return (
    <div>
      <header className="flex items-center justify-end gap-4 p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => logout()} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>
      
      
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
