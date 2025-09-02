import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';

const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const sessionId = searchParams.get('session_id');
  const invoiceId = searchParams.get('invoice_id');

  const handleRetryPayment = () => {
    // Navigate back to dashboard where they can retry payment
    navigate('/dashboard');
  };

  const handleContactSupport = () => {
    // You can customize this based on your support system
    window.open('mailto:support@yourschool.edu?subject=Payment%20Issue&body=I%20encountered%20an%20issue%20with%20payment%20session:%20' + sessionId);
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-600">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Your payment was cancelled or interrupted. No charges have been made to your account.
            </AlertDescription>
          </Alert>

          {/* Session Details */}
          {sessionId && (
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold text-sm text-muted-foreground mb-2">Session Details</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Session ID:</span>
                  <p className="font-mono text-xs break-all">{sessionId}</p>
                </div>
                {invoiceId && (
                  <div>
                    <span className="text-muted-foreground">Invoice ID:</span>
                    <p className="font-semibold">#{invoiceId}</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <p>{new Date().toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Possible Reasons */}
          <div className="space-y-3">
            <h3 className="font-semibold">Possible reasons for cancellation:</h3>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• You clicked the back button during payment</li>
              <li>• Payment window was closed before completion</li>
              <li>• Session timeout occurred</li>
              <li>• Network connectivity issues</li>
              <li>• Payment method was declined</li>
            </ul>
          </div>

          {/* Next Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold">What you can do:</h3>
            <div className="grid gap-3">
              <Alert>
                <RefreshCw className="h-4 w-4" />
                <AlertDescription>
                  <strong>Try Again:</strong> Return to your dashboard and restart the payment process with the same or different payment method.
                </AlertDescription>
              </Alert>
              
              <Alert>
                <HelpCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Need Help?</strong> If you continue to experience issues, contact our support team for assistance.
                </AlertDescription>
              </Alert>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={handleRetryPayment} className="flex-1">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Payment Again
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </div>

          <div className="flex justify-center">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleContactSupport}
              className="text-muted-foreground"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>

          {/* Additional Information */}
          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>Your fee payment is still pending. You can retry the payment at any time.</p>
            {sessionId && (
              <p className="mt-1">Reference ID: {sessionId}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentCancel;
