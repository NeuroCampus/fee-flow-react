
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { studentAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  GraduationCap, 
  Calendar, 
  CreditCard, 
  Receipt, 
  Download,
  LogOut,
  IndianRupee
} from 'lucide-react';

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: studentAPI.getDashboard,
  });

  const { data: invoicesData } = useQuery({
    queryKey: ['student-invoices'],
    queryFn: studentAPI.getInvoices,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <GraduationCap className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Student Portal</h1>
                <p className="text-sm text-muted-foreground">Fee Management System</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Student Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-foreground">{user?.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">USN</p>
                <p className="text-foreground">{user?.usn}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Department</p>
                <p className="text-foreground">{user?.department}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Semester</p>
                <p className="text-foreground">{user?.semester}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="h-4 w-4 text-destructive" />
                <span className="text-2xl font-bold text-destructive">₹45,000</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold text-green-600">₹30,000</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="h-4 w-4 text-orange-600" />
                <span className="text-2xl font-bold text-orange-600">₹15,000</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Fee Invoices
            </CardTitle>
            <CardDescription>
              View and pay your semester fees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock Invoice Data */}
              {[
                { semester: 6, amount: 25000, paid: 15000, status: 'Partial', dueDate: '2024-03-15' },
                { semester: 5, amount: 25000, paid: 25000, status: 'Paid', dueDate: '2023-09-15' },
                { semester: 4, amount: 20000, paid: 20000, status: 'Paid', dueDate: '2023-03-15' },
              ].map((invoice, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Semester {invoice.semester}</span>
                    </div>
                    <Badge variant={
                      invoice.status === 'Paid' ? 'default' : 
                      invoice.status === 'Partial' ? 'secondary' : 'destructive'
                    }>
                      {invoice.status}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">₹{invoice.amount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Paid</p>
                      <p className="font-medium text-green-600">₹{invoice.paid.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Balance</p>
                      <p className="font-medium text-orange-600">₹{(invoice.amount - invoice.paid).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due Date</p>
                      <p className="font-medium">{invoice.dueDate}</p>
                    </div>
                  </div>
                  
                  <Separator className="my-3" />
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button size="sm" className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      View Details
                    </Button>
                    {invoice.status !== 'Paid' && (
                      <Button size="sm" variant="outline" className="flex items-center gap-2">
                        <IndianRupee className="h-4 w-4" />
                        Pay Now
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Receipt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
