import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { authAPI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const BackendStatus: React.FC = () => {
  const { data: testResult, isLoading, error, refetch } = useQuery({
    queryKey: ['backendTest'],
    queryFn: authAPI.test,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Testing...';
    if (error) return 'Backend Unreachable';
    return 'Backend Connected';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-yellow-600';
    if (error) return 'text-red-600';
    return 'text-green-600';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Backend Status
          {getStatusIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`text-lg font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </div>
        
        {testResult && (
          <div className="text-sm text-gray-600">
            <p>Response: {JSON.stringify(testResult)}</p>
          </div>
        )}
        
        {error && (
          <div className="text-sm text-red-600">
            <p>Error: {(error as any)?.message || 'Unknown error'}</p>
            <p>Check if Django server is running on port 8001</p>
          </div>
        )}
        
        <Button onClick={() => refetch()} variant="outline" size="sm">
          Test Again
        </Button>
      </CardContent>
    </Card>
  );
};

export default BackendStatus;
