
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  User, 
  IndianRupee, 
  FileText, 
  CreditCard, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { studentAPI } from '@/lib/api';

interface Invoice {
  id: string;
  semester: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  dueDate: string;
  components: FeeComponent[];
}

interface FeeComponent {
  name: string;
  amount: number;
  paid: number;
  balance: number;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dashboardData, setDashboardData] = useState({
    totalDue: 0,
    totalPaid: 0,
    totalBalance: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardResponse, invoicesResponse] = await Promise.all([
        studentAPI.getDashboard(),
        studentAPI.getInvoices()
      ]);
      setDashboardData(dashboardResponse.data);
      setInvoices(invoicesResponse.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async (invoiceId: string, amount: number) => {
    try {
      const response = await studentAPI.createCheckoutSession(invoiceId, amount);
      window.open(response.data.url, '_blank');
    } catch (error) {
      console.error('Payment error:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'status-paid';
      case 'pending': return 'status-pending';
      case 'overdue': return 'status-overdue';
      default: return 'status-pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

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
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-student rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-student-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">{user?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {user?.usn} • {user?.department} • Semester {user?.semester}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="stat-card bg-gradient-to-r from-success/10 to-success/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-success" />
                <span className="text-2xl font-bold text-success">
                  ₹{dashboardData.totalPaid.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card bg-gradient-to-r from-warning/10 to-warning/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balance Due</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-warning" />
                <span className="text-2xl font-bold text-warning">
                  ₹{dashboardData.totalBalance.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <IndianRupee className="w-5 h-5 text-primary" />
                <span className="text-2xl font-bold text-primary">
                  ₹{dashboardData.totalDue.toLocaleString()}
                </span>
              </div>
              <Progress 
                value={(dashboardData.totalPaid / dashboardData.totalDue) * 100} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Fee Invoices</span>
            </CardTitle>
            <CardDescription>
              Your semester-wise fee breakdown and payment status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">Semester {invoice.semester}</h3>
                        <Badge className={getStatusColor(invoice.status)}>
                          {getStatusIcon(invoice.status)}
                          <span className="ml-1 capitalize">{invoice.status}</span>
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                        <span>Total: ₹{invoice.totalAmount.toLocaleString()}</span>
                        <span className="text-success">Paid: ₹{invoice.paidAmount.toLocaleString()}</span>
                        <span className="text-warning">Balance: ₹{invoice.balanceAmount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Due Date: {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      {invoice.balanceAmount > 0 && (
                        <Button 
                          onClick={() => handlePayment(invoice.id, invoice.balanceAmount)}
                          className="role-student"
                        >
                          <CreditCard className="w-4 h-4 mr-2" />
                          Pay Now
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                  
                  {invoice.components && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <h4 className="text-sm font-medium mb-2">Fee Breakdown</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {invoice.components.map((component, index) => (
                          <div key={index} className="flex justify-between">
                            <span className="text-muted-foreground">{component.name}:</span>
                            <span>₹{component.amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
