import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentAPI } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, Download, Loader2, AlertCircle, Receipt, ArrowLeft, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from "@/components/ui/alert";

const PaymentSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');
  
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  
  // Query payment status
  const { data: paymentStatus, isLoading, error } = useQuery({
    queryKey: ['paymentStatus', sessionId],
    queryFn: () => {
      console.log('Fetching payment status for session:', sessionId);
      console.log('API base URL:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000');
      setPollCount(prev => prev + 1);
      return sessionId ? studentAPI.getPaymentStatus(sessionId) : Promise.resolve(null);
    },
    enabled: !!sessionId && !paymentVerified && pollCount < 20, // Stop after 20 attempts
    refetchInterval: paymentVerified ? false : 5000, // Poll every 5 seconds until verified
    retry: 3, // Retry 3 times on failure
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Set a timeout for loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoading && !paymentVerified) {
        setLoadingTimeout(true);
      }
    }, 30000); // 30 seconds timeout

    return () => clearTimeout(timer);
  }, [isLoading, paymentVerified]);  // Log errors for debugging
  useEffect(() => {
    if (error) {
      console.error('Payment status query error:', error);
    }
    if (paymentStatus) {
      console.log('Payment status response:', paymentStatus);
      const status = paymentStatus as any;
      console.log('Payment status details:', {
        payment_status: status?.payment_status,
        status: status?.status,
        amount_total: status?.amount_total,
        session_id: status?.session_id
      });
    }
  }, [error, paymentStatus]);

  // Check if payment is completed
  useEffect(() => {
    const status = paymentStatus as any;
    console.log('Checking payment completion:', {
      payment_status: status?.payment_status,
      status: status?.status,
      paymentVerified,
      pollCount
    });
    
    // If Stripe shows payment as paid, consider it successful regardless of our database status
    if (status?.payment_status === 'paid') {
      setPaymentVerified(true);
      toast({
        title: "Payment Successful!",
        description: "Your fee payment has been processed successfully.",
      });
    }
  }, [paymentStatus]);

  if (pollCount >= 20 && !paymentVerified) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Payment verification is taking longer than expected. Your payment may still be processing. Please check your dashboard in a few minutes or contact support.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex gap-3">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid payment session. Please try again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to verify payment status: {error.message || 'Unknown error'}. Please contact support if the issue persists.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (loadingTimeout || (isLoading && !paymentVerified)) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            {loadingTimeout ? (
              <>
                <AlertCircle className="h-12 w-12 text-orange-500 mb-4" />
                <h2 className="text-xl font-semibold mb-2">Payment Verification Taking Longer</h2>
                <p className="text-muted-foreground text-center mb-4">
                  We're still verifying your payment. This might take a few minutes.
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => window.location.reload()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Return to Dashboard
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
                <p className="text-muted-foreground text-center">
                  Please wait while we confirm your payment...
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = paymentStatus as any;
  const isPaymentSuccessful = status?.payment_status === 'paid';
  const isPaymentPending = status?.payment_status === 'unpaid' || (!status?.payment_status && status?.status === 'pending');

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isPaymentSuccessful ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : isPaymentPending ? (
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
            ) : (
              <AlertCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isPaymentSuccessful ? 'Payment Successful!' : 
             isPaymentPending ? 'Payment Processing...' : 
             'Payment Status'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Details */}
          {status && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Session ID:</span>
                  <p className="font-mono text-xs break-all">{sessionId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <p className="font-semibold">₹{status.amount_total?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Invoice ID:</span>
                  <p className="font-semibold">#{status.invoice_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant={isPaymentSuccessful ? "default" : isPaymentPending ? "secondary" : "destructive"}
                  >
                    {isPaymentSuccessful ? 'Completed' : 
                     isPaymentPending ? 'Processing' : 
                     'Failed'}
                  </Badge>
                </div>
              </div>

              {status.customer_email && (
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium">{status.customer_email}</p>
                </div>
              )}

              {/* Transaction Time */}
              {status.created && (
                <div>
                  <span className="text-muted-foreground">Transaction Time:</span>
                  <p className="font-medium">
                    {new Date(status.created * 1000).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Status-specific messages */}
          {isPaymentSuccessful && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your payment has been successfully processed. A receipt has been generated and you should receive a notification shortly.
              </AlertDescription>
            </Alert>
          )}

          {isPaymentPending && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Your payment is being processed. This may take a few moments. Please do not close this window.
              </AlertDescription>
            </Alert>
          )}

          {!isPaymentSuccessful && !isPaymentPending && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                There was an issue with your payment. Please try again or contact support for assistance.
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={() => navigate('/dashboard')} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
            
            {isPaymentSuccessful && status?.payment_id && (
              <Button 
                variant="outline" 
                onClick={async () => {
                  try {
                    const response = await studentAPI.getReceipt(status.payment_id);
                    const blob = new Blob([response.data], { type: 'application/pdf' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `receipt_${status.payment_id}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    
                    toast({
                      title: "Receipt Downloaded",
                      description: "Your payment receipt has been downloaded.",
                    });
                  } catch (error) {
                    toast({
                      title: "Download Failed",
                      description: "Failed to download receipt. Please try again.",
                      variant: "destructive",
                    });
                  }
                }}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Receipt
              </Button>
            )}
          </div>

          {/* Additional Information */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>Need help? Contact support at support@yourschool.edu</p>
            <p className="mt-1">Reference ID: {sessionId}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
