
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, MailOpen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const StudentDashboard: React.FC = () => {
  const { user, login } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');

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

  const updateProfileMutation = useMutation({
    mutationFn: (updates: { name?: string; email?: string }) =>
      studentAPI.updateProfile(updates),
    onSuccess: (data) => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      queryClient.invalidateQueries(['studentDashboard']);
      queryClient.invalidateQueries(['me']);
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
    mutationFn: ({ invoiceId, amount }: { invoiceId: string; amount: number }) =>
      studentAPI.createCheckoutSession(invoiceId, amount),
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (stripe) {
        // The checkout_url received from the backend is actually the session ID
        await stripe.redirectToCheckout({ sessionId: data.checkout_url });
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
    mutationFn: (notificationId: string) => studentAPI.markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries(['studentNotifications']);
    },
    onError: (error: any) => {
      toast({
        title: "Mark Read Failed",
        description: error.response?.data?.error || "Failed to mark notification as read.",
        variant: "destructive",
      });
    },
  });

  if (isDashboardLoading || isPaymentsLoading || isNotificationsLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (dashboardError || paymentsError || notificationsError) {
    return <div className="text-red-500 text-center">Error loading data: {(dashboardError || paymentsError || notificationsError as any).message}</div>;
  }

  const student = dashboardData?.student;
  const payments = paymentsData?.payments || [];
  const notifications = notificationsData?.results || []; // Assuming notifications come in `results` array

  const unreadNotificationsCount = notifications.filter((notif: any) => !notif.is_read).length;

  const handleUpdate = async () => {
    updateProfileMutation.mutate({ name, email });
  };

  const handlePayNow = async () => {
    const outstandingInvoice = dashboardData?.invoices?.find((inv: any) => inv.status !== 'paid');
    
    if (outstandingInvoice) {
      createCheckoutSessionMutation.mutate({
        invoiceId: outstandingInvoice.id,
        amount: outstandingInvoice.balance_amount,
      });
    } else {
      toast({
        title: "No Outstanding Dues",
        description: "You currently have no outstanding fees to pay.",
        variant: "default",
      });
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
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

  const handleMarkAsRead = (notificationId: string) => {
    markNotificationReadMutation.mutate(notificationId);
  };

  return (
    <div className="container mx-auto p-6 bg-background min-h-screen">
      <h1 className="text-3xl font-bold text-foreground mb-6">Student Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">My Profile</CardTitle>
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
                  <Button onClick={handleUpdate} disabled={updateProfileMutation.isLoading}>
                    {updateProfileMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update
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
            <CardTitle className="text-xl font-semibold">Fee Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Fee overview details will be displayed here.</p>
            <p className="text-muted-foreground">Total Fee: ₹{dashboardData?.total_fee ? dashboardData.total_fee.toLocaleString() : '0.00'}</p>
            <p className="text-muted-foreground">Paid Amount: ₹{dashboardData?.paid_amount ? dashboardData.paid_amount.toLocaleString() : '0.00'}</p>
            <p className="text-muted-foreground">Outstanding Balance: ₹{dashboardData?.dues ? dashboardData.dues.toLocaleString() : '0.00'}</p>
            <Button 
              className="mt-4"
              onClick={handlePayNow}
              disabled={!dashboardData?.dues || dashboardData.dues <= 0 || createCheckoutSessionMutation.isLoading}
            >
              {createCheckoutSessionMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pay Now
            </Button>
          </CardContent>
        </Card>

        {/* Payment History Card */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-xl font-semibold">Payment History</CardTitle>
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
                      <TableCell>{payment.id}</TableCell>
                      <TableCell>{payment.invoice_id}</TableCell>
                      <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                      <TableCell>{payment.mode}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                      <TableCell>{new Date(payment.timestamp).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(payment.id)}>
                          Download Receipt
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
            <CardTitle className="text-xl font-semibold">Notifications</CardTitle>
            {unreadNotificationsCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                {unreadNotificationsCount}
              </span>
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
                        disabled={markNotificationReadMutation.isLoading}
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
