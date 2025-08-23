
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2, Download, Eye, CreditCard, Receipt, Bell, MailOpen, User, BookOpen, GraduationCap, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from 'date-fns';
import { config } from '@/config/env';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// Initialize Stripe with error handling
const stripePromise = (() => {
  const key = config.STRIPE_PUBLISHABLE_KEY;
  if (!key || key === 'pk_test_your_stripe_publishable_key_here') {
    console.warn('Stripe publishable key not configured. Please set VITE_STRIPE_PUBLISHABLE_KEY in your .env file');
    return null;
  }
  return loadStripe(key);
})();

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const { data: dashboardData, isLoading: isDashboardLoading, error: dashboardError } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: studentAPI.getDashboard,
    enabled: !!user && user.role === 'student',
  });

  const { data: paymentsData, isLoading: isPaymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['studentPayments'],
    queryFn: studentAPI.getPayments,
    enabled: !!user && user.role === 'student',
  });

  const { data: notificationsData, isLoading: isNotificationsLoading, error: notificationsError } = useQuery({
    queryKey: ['studentNotifications'],
    queryFn: studentAPI.getNotifications,
    enabled: !!user && user.role === 'student',
  });

  const { data: receiptsData, isLoading: isReceiptsLoading, error: receiptsError } = useQuery({
    queryKey: ['studentReceipts'],
    queryFn: studentAPI.getReceipts,
    enabled: !!user && user.role === 'student',
  });

  // Update form data when dashboard data loads
  React.useEffect(() => {
    if (dashboardData?.student) {
      setName(dashboardData.student.name);
      setEmail(user?.email || '');
    }
  }, [dashboardData, user]);

  const updateProfileMutation = useMutation({
    mutationFn: (updates: { name?: string; email?: string }) =>
      studentAPI.updateProfile(updates),
    onSuccess: (data) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Profile Update Failed",
        description: error.response?.data?.error || "An error occurred.",
        variant: "destructive",
      });
    },
  });

  const createCheckoutSessionMutation = useMutation({
    mutationFn: ({ invoiceId, amount }: { invoiceId: number; amount: number }) =>
      studentAPI.createCheckoutSession(invoiceId, amount),
    onSuccess: async (data) => {
      if (!stripePromise) {
        toast({
          title: "Payment Configuration Error",
          description: "Stripe is not properly configured. Please contact support.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        const stripe = await stripePromise;
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: data.data.checkout_url });
        }
      } catch (error) {
        toast({
          title: "Payment Failed",
          description: "An error occurred during checkout. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.response?.data?.error || "An error occurred during checkout.",
        variant: "destructive",
      });
    },
  });

  const markNotificationReadMutation = useMutation({
    mutationFn: (notificationId: number) => studentAPI.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentNotifications'] });
    },
    onError: (error: any) => {
      toast({
        title: "Mark Read Failed",
        description: error.response?.data?.error || "Failed to mark notification as read.",
        variant: "destructive",
      });
    },
  });

  if (isDashboardLoading || isPaymentsLoading || isNotificationsLoading || isReceiptsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (dashboardError || paymentsError || notificationsError || receiptsError) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-red-500">
          <h2 className="text-xl font-semibold mb-2">Error loading data</h2>
          <p>{(dashboardError || paymentsError || notificationsError || receiptsError as any)?.message || "An unexpected error occurred"}</p>
        </div>
      </div>
    );
  }

  const student = dashboardData?.student;
  const payments = paymentsData?.payments || [];
  const notifications = notificationsData?.notifications || [];
  const receipts = receiptsData?.receipts || [];

  const unreadNotificationsCount = notifications.filter((notif: any) => !notif.is_read).length;

  const handleUpdate = async () => {
    updateProfileMutation.mutate({ name, email });
  };

  const handlePayNow = async (invoiceId: number, amount: number) => {
    createCheckoutSessionMutation.mutate({
      invoiceId,
      amount,
    });
  };

  const handleDownloadReceipt = async (paymentId: number) => {
    try {
      const response = await studentAPI.getReceipt(paymentId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt_${paymentId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast({
        title: "Receipt Downloaded",
        description: "Your payment receipt has been downloaded.",
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.response?.data?.error || "Failed to download receipt.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsRead = (notificationId: number) => {
    markNotificationReadMutation.mutate(notificationId);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      paid: { color: 'bg-green-100 text-green-800', text: 'Paid' },
      partial: { color: 'bg-yellow-100 text-yellow-800', text: 'Partial' },
      pending: { color: 'bg-red-100 text-red-800', text: 'Pending' },
      overdue: { color: 'bg-red-100 text-red-800', text: 'Overdue' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    
    return (
      <Badge className={config.color}>
        {config.text}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 bg-background min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-6">Student Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              {isEditing ? (
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
              ) : (
                <p className="text-muted-foreground font-medium">{student?.name}</p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              {isEditing ? (
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
              ) : (
                <p className="text-muted-foreground font-medium">{user?.email}</p>
              )}
            </div>
            <div>
              <Label>USN</Label>
              <p className="text-muted-foreground font-medium">{student?.usn}</p>
            </div>
            <div>
              <Label>Department</Label>
              <p className="text-muted-foreground font-medium">{student?.dept}</p>
            </div>
            <div>
              <Label>Semester</Label>
              <p className="text-muted-foreground font-medium">{student?.semester}</p>
            </div>
            <div>
              <Label>Status</Label>
              <p className="text-muted-foreground font-medium">{student?.status}</p>
            </div>
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={updateProfileMutation.isLoading}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Fee Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Fee Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData?.fee_overview ? (
              <>
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment Progress</span>
                    <span className="font-medium">{dashboardData.fee_overview.progress_percentage}%</span>
                  </div>
                  <Progress value={dashboardData.fee_overview.progress_percentage} className="h-2" />
                </div>

                {/* Fee Summary */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm text-blue-600">Total Fee</span>
                    <span className="font-bold text-blue-600">₹{dashboardData.fee_overview.total_fee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm text-green-600">Paid Amount</span>
                    <span className="font-bold text-green-600">₹{dashboardData.fee_overview.paid_amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-600">Balance Amount</span>
                    <span className="font-bold text-red-600">₹{dashboardData.fee_overview.balance_amount.toLocaleString()}</span>
                  </div>
                </div>

                {/* Pay Now Button */}
                {dashboardData.fee_overview.balance_amount > 0 && (
                  <Button 
                    className="w-full"
                    onClick={() => {
                      const outstandingInvoice = dashboardData.invoices?.find(inv => inv.status !== 'paid');
                      if (outstandingInvoice) {
                        handlePayNow(outstandingInvoice.id, outstandingInvoice.balance_amount);
                      }
                    }}
                    disabled={createCheckoutSessionMutation.isPending}
                  >
                    {createCheckoutSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Pay Now
                  </Button>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">No fee information available.</p>
            )}
          </CardContent>
        </Card>

        {/* Fee Breakdown Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Fee Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.fee_breakdown ? (
              <div className="space-y-3">
                {Object.entries(dashboardData.fee_breakdown).map(([name, amount]) => (
                  <div key={name} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <span className="text-sm font-medium">{name}</span>
                    <span className="font-bold">₹{Number(amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No fee breakdown available.</p>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Invoice Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData?.invoices && dashboardData.invoices.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.invoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">Invoice #{invoice.id}</h3>
                        <p className="text-sm text-muted-foreground">Semester {invoice.semester}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">₹{invoice.total_amount.toLocaleString()}</div>
                        {getStatusBadge(invoice.status)}
                      </div>
                    </div>
                    
                    {/* Component Breakdown */}
                    <div className="space-y-2 mb-3">
                      {dashboardData?.fee_breakdown && Object.entries(dashboardData.fee_breakdown).map(([name, amount]) => {
                        const componentAmount = Number(amount);
                        const isPaid = invoice.paid_amount >= componentAmount;
                        const isPartiallyPaid = invoice.paid_amount > 0 && invoice.paid_amount < componentAmount;
                        
                        return (
                          <div key={name} className="flex justify-between items-center text-sm">
                            <span className={isPaid ? 'line-through text-green-600' : ''}>
                              {name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">₹{componentAmount.toLocaleString()}</span>
                              {isPaid && <Check className="h-4 w-4 text-green-600" />}
                              {isPartiallyPaid && <Badge variant="secondary" className="text-xs">Partial</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Payment Summary */}
                    <div className="grid grid-cols-3 gap-4 text-sm border-t pt-3">
                      <div>
                        <span className="text-muted-foreground">Total:</span>
                        <div className="font-semibold">₹{invoice.total_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Paid:</span>
                        <div className="font-semibold text-green-600">₹{invoice.paid_amount.toLocaleString()}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Balance:</span>
                        <div className="font-semibold text-red-600">₹{invoice.balance_amount.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end mt-3">
                      {invoice.balance_amount > 0 && (
                        <Button
                          size="sm"
                          onClick={() => handlePayNow(invoice.id, invoice.balance_amount)}
                          disabled={createCheckoutSessionMutation.isPending}
                        >
                          {createCheckoutSessionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Pay ₹{invoice.balance_amount.toLocaleString()}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No invoices found.</p>
            )}
          </CardContent>
        </Card>

        {/* Payment History Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>#{payment.id}</TableCell>
                      <TableCell>#{payment.invoice_id}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.mode}</TableCell>
                      <TableCell>{getStatusBadge(payment.status)}</TableCell>
                      <TableCell>{new Date(payment.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No payment history found.</p>
            )}
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3 space-y-0">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            {unreadNotificationsCount > 0 && (
              <Badge variant="secondary" className="bg-primary text-primary-foreground">
                {unreadNotificationsCount} new
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {notifications.length > 0 ? (
              <div className="space-y-4">
                {notifications.map((notification: any) => (
                  <div 
                    key={notification.id} 
                    className={`flex items-start gap-3 p-3 border rounded-lg 
                      ${notification.is_read ? 'bg-muted/30 text-muted-foreground' : 'bg-card text-foreground font-medium'}`}
                  >
                    <Bell className="h-5 w-5 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="flex-shrink-0"
                        disabled={markNotificationReadMutation.isPending}
                      >
                        <MailOpen className="h-4 w-4" />
                        <span className="sr-only">Mark as read</span>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No new notifications.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
