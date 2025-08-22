
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  LogOut,
  Download,
  Users,
  IndianRupee,
  TrendingUp
} from 'lucide-react';

const HODDashboard = () => {
  const { user, logout } = useAuth();

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
                <h1 className="text-xl font-semibold text-foreground">HOD Portal</h1>
                <p className="text-sm text-muted-foreground">{user?.department} Department</p>
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
        {/* Department Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">348</div>
              <p className="text-xs text-muted-foreground">Active students in department</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Total Collection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">₹87.5L</div>
              <p className="text-xs text-muted-foreground">This academic year</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">94.2%</div>
              <p className="text-xs text-muted-foreground">Above target of 90%</p>
            </CardContent>
          </Card>
        </div>

        {/* Department Students */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Department Students</CardTitle>
                <CardDescription>Fee collection status by semester</CardDescription>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Mock Semester Data */}
              {[
                { semester: 8, students: 45, collected: 98, pending: 2, amount: '11.2L' },
                { semester: 6, students: 52, collected: 92, pending: 8, amount: '13.0L' },
                { semester: 4, students: 58, collected: 89, pending: 11, amount: '14.5L' },
                { semester: 2, students: 63, collected: 95, pending: 5, amount: '15.8L' },
              ].map((sem) => (
                <div key={sem.semester} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Semester {sem.semester}</h3>
                    <span className="text-sm font-medium text-green-600">₹{sem.amount}</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Total Students</p>
                      <p className="font-medium">{sem.students}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fees Collected</p>
                      <p className="font-medium text-green-600">{sem.collected}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pending</p>
                      <p className="font-medium text-orange-600">{sem.pending}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Collection</p>
                      <p className="font-medium">₹{sem.amount}</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full" 
                        style={{ width: `${sem.collected}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Amounts</CardTitle>
            <CardDescription>Students with pending fee payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 space-y-4">
              <div className="text-2xl font-bold text-orange-600">₹4.8L</div>
              <p className="text-muted-foreground">Total outstanding amount</p>
              <Button variant="outline">View Detailed Report</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HODDashboard;
