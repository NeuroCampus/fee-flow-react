
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  GraduationCap, 
  Users, 
  IndianRupee, 
  TrendingUp,
  Download,
  Eye
} from 'lucide-react';

const HODDashboard = () => {
  const { user } = useAuth();

  // Mock data - replace with actual API calls
  const departmentStats = {
    totalStudents: 120,
    totalDue: 1800000,
    totalPaid: 1200000,
    totalBalance: 600000,
    collectionPercentage: 67
  };

  const students = [
    { id: '1', usn: 'CS20001', name: 'John Doe', semester: 6, totalDue: 32000, paid: 32000, balance: 0, status: 'paid' },
    { id: '2', usn: 'CS20002', name: 'Jane Smith', semester: 6, totalDue: 32000, paid: 17000, balance: 15000, status: 'partial' },
    { id: '3', usn: 'CS20003', name: 'Bob Johnson', semester: 6, totalDue: 32000, paid: 0, balance: 32000, status: 'pending' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'partial': return 'status-pending';
      case 'pending': return 'status-overdue';
      default: return 'status-pending';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-hod rounded-full flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-hod-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">HOD Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.department} Department Overview
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/logout'}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-primary">
                {departmentStats.totalStudents}
              </span>
            </CardContent>
          </Card>

          <Card className="stat-card bg-gradient-to-r from-success/10 to-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <IndianRupee className="w-4 h-4 mr-2" />
                Total Collected
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-success">
                ₹{(departmentStats.totalPaid / 100000).toFixed(1)}L
              </span>
            </CardContent>
          </Card>

          <Card className="stat-card bg-gradient-to-r from-warning/10 to-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <IndianRupee className="w-4 h-4 mr-2" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-warning">
                ₹{(departmentStats.totalBalance / 100000).toFixed(1)}L
              </span>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Collection %
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold text-primary">
                {departmentStats.collectionPercentage}%
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Department Students */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Department Students Overview</CardTitle>
                <CardDescription>Fee collection status for all students</CardDescription>
              </div>
              <Button variant="outline" className="role-hod">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr className="table-header">
                    <th className="table-cell text-left">USN</th>
                    <th className="table-cell text-left">Name</th>
                    <th className="table-cell text-left">Semester</th>
                    <th className="table-cell text-left">Total Due</th>
                    <th className="table-cell text-left">Paid</th>
                    <th className="table-cell text-left">Balance</th>
                    <th className="table-cell text-left">Status</th>
                    <th className="table-cell text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-muted/50">
                      <td className="table-cell font-medium">{student.usn}</td>
                      <td className="table-cell">{student.name}</td>
                      <td className="table-cell">{student.semester}</td>
                      <td className="table-cell">₹{student.totalDue.toLocaleString()}</td>
                      <td className="table-cell text-success">₹{student.paid.toLocaleString()}</td>
                      <td className="table-cell">
                        <span className={student.balance > 0 ? 'text-warning' : 'text-success'}>
                          ₹{student.balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="table-cell">
                        <Badge className={getStatusColor(student.status)}>
                          {student.status}
                        </Badge>
                      </td>
                      <td className="table-cell">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Collection Summary</CardTitle>
              <CardDescription>Monthly collection trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current Month</span>
                  <span className="font-semibold text-success">₹4.2L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Previous Month</span>
                  <span className="font-semibold">₹3.8L</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Growth</span>
                  <span className="font-semibold text-success">+10.5%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Outstanding Analysis</CardTitle>
              <CardDescription>Students with pending payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Fully Paid</span>
                  <span className="font-semibold text-success">80 students</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Partial Payment</span>
                  <span className="font-semibold text-warning">25 students</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">No Payment</span>
                  <span className="font-semibold text-destructive">15 students</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HODDashboard;
