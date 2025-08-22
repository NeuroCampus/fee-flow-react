
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Settings, 
  FileText, 
  CreditCard, 
  BarChart3,
  Search,
  Plus,
  Edit,
  Download
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - replace with actual API calls
  const students = [
    { id: '1', usn: 'CS20001', name: 'John Doe', department: 'CSE', semester: 6, status: 'Active', balance: 15000 },
    { id: '2', usn: 'CS20002', name: 'Jane Smith', department: 'CSE', semester: 6, status: 'Active', balance: 0 },
  ];

  const feeComponents = [
    { id: '1', name: 'Tuition Fee', amount: 25000, type: 'Academic' },
    { id: '2', name: 'Lab Fee', amount: 5000, type: 'Academic' },
    { id: '3', name: 'Library Fee', amount: 2000, type: 'Academic' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-admin rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-admin-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Fee Management System</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => window.location.href = '/logout'}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
            <TabsTrigger value="students" className="flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="components" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Components</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Invoices</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Student Management</CardTitle>
                    <CardDescription>Manage student records and fee assignments</CardDescription>
                  </div>
                  <Button className="role-admin">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by USN, name, or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr className="table-header">
                        <th className="table-cell text-left">USN</th>
                        <th className="table-cell text-left">Name</th>
                        <th className="table-cell text-left">Department</th>
                        <th className="table-cell text-left">Semester</th>
                        <th className="table-cell text-left">Status</th>
                        <th className="table-cell text-left">Balance</th>
                        <th className="table-cell text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-muted/50">
                          <td className="table-cell font-medium">{student.usn}</td>
                          <td className="table-cell">{student.name}</td>
                          <td className="table-cell">{student.department}</td>
                          <td className="table-cell">{student.semester}</td>
                          <td className="table-cell">
                            <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                              {student.status}
                            </Badge>
                          </td>
                          <td className="table-cell">
                            <span className={student.balance > 0 ? 'text-warning' : 'text-success'}>
                              ₹{student.balance.toLocaleString()}
                            </span>
                          </td>
                          <td className="table-cell">
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="components">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Fee Components</CardTitle>
                    <CardDescription>Manage fee structure and components</CardDescription>
                  </div>
                  <Button className="role-admin">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Component
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {feeComponents.map((component) => (
                    <Card key={component.id} className="dashboard-card">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{component.name}</CardTitle>
                          <Button variant="ghost" size="sm">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Amount:</span>
                            <span className="font-semibold">₹{component.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Type:</span>
                            <Badge variant="outline">{component.type}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Invoice Management</CardTitle>
                    <CardDescription>Generate and manage student invoices</CardDescription>
                  </div>
                  <Button className="role-admin">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Invoices
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Invoice management interface will be implemented here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Management</CardTitle>
                <CardDescription>Track payments and add offline transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Payment management interface will be implemented here
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Reports & Analytics</CardTitle>
                    <CardDescription>Financial reports and collection analytics</CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center py-8">
                  Reports and analytics interface will be implemented here
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
