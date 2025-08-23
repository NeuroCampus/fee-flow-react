
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { hodAPI } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  LogOut,
  Download,
  Users,
  IndianRupee,
  TrendingUp,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';

const HODDashboard = () => {
  const { user, logout } = useAuth();
  const [selectedDept, setSelectedDept] = useState(user?.dept || '');

  const { data: hodReport, isLoading: isReportLoading, error: reportError } = useQuery({
    queryKey: ['hodReport', selectedDept],
    queryFn: () => hodAPI.getReports(selectedDept),
    enabled: !!user && user.role === 'hod' && !!selectedDept,
  });

  const { data: studentsData, isLoading: isStudentsLoading, error: studentsError } = useQuery({
    queryKey: ['hodStudents', selectedDept],
    queryFn: () => hodAPI.getStudents(selectedDept),
    enabled: !!user && user.role === 'hod' && !!selectedDept,
  });

  const handleExportReport = () => {
    // Implement export functionality
    toast({
      title: "Export Started",
      description: "Your department report is being prepared for download.",
    });
  };

  const handleLogout = () => {
    logout();
  };

  if (isReportLoading || isStudentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading HOD dashboard...</p>
        </div>
      </div>
    );
  }

  if (reportError || studentsError) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Error loading data</h2>
            <p>{(reportError || studentsError as any)?.message || "An unexpected error occurred"}</p>
          </div>
        </div>
      </div>
    );
  }

  const report = hodReport || {
    department: selectedDept || 'Unknown',
    total_students: 0,
    total_collections: 0,
    collection_rate: 0,
    outstanding_amount: 0,
    semester_breakdown: []
  };

  const students = studentsData?.students || [];

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
                <p className="text-sm text-muted-foreground">{report.department} Department</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={selectedDept} onValueChange={setSelectedDept}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSE">Computer Science</SelectItem>
                  <SelectItem value="ECE">Electronics</SelectItem>
                  <SelectItem value="MECH">Mechanical</SelectItem>
                  <SelectItem value="CIVIL">Civil</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Department Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Total Students
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.total_students}</div>
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
              <div className="text-2xl font-bold text-green-600">₹{(report.total_collections / 100000).toFixed(1)}L</div>
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
              <div className="text-2xl font-bold text-blue-600">{report.collection_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {report.collection_rate >= 90 ? 'Above target of 90%' : 'Below target of 90%'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">₹{(report.outstanding_amount / 100000).toFixed(1)}L</div>
              <p className="text-xs text-muted-foreground">Pending collections</p>
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
              <Button variant="outline" className="flex items-center gap-2" onClick={handleExportReport}>
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {report.semester_breakdown && report.semester_breakdown.length > 0 ? (
              <div className="space-y-4">
                {report.semester_breakdown.map((sem) => (
                  <div key={sem.semester} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">Semester {sem.semester}</h3>
                      <span className="text-sm font-medium text-green-600">₹{(sem.amount / 100000).toFixed(1)}L</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
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
                        <p className="font-medium">₹{(sem.amount / 100000).toFixed(1)}L</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${sem.collected}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No semester data available
              </div>
            )}
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
              <div className="text-2xl font-bold text-orange-600">₹{(report.outstanding_amount / 100000).toFixed(1)}L</div>
              <p className="text-muted-foreground">Total outstanding amount</p>
              <div className="flex justify-center space-x-2">
                <Badge variant="outline" className="text-orange-600">
                  {students.filter(s => s.status === 'active').length} Active Students
                </Badge>
                <Badge variant="outline" className="text-red-600">
                  {students.filter(s => s.status === 'backlog').length} Backlog Students
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student List */}
        <Card>
          <CardHeader>
            <CardTitle>Department Students</CardTitle>
            <CardDescription>List of all students in the department</CardDescription>
          </CardHeader>
          <CardContent>
            {students.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">USN</th>
                      <th className="text-left py-2 px-4">Semester</th>
                      <th className="text-left py-2 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-4">{student.name}</td>
                        <td className="py-2 px-4">{student.usn}</td>
                        <td className="py-2 px-4">{student.semester}</td>
                        <td className="py-2 px-4">
                          <Badge 
                            variant={student.status === 'active' ? 'default' : 'secondary'}
                            className={student.status === 'backlog' ? 'bg-red-100 text-red-800' : ''}
                          >
                            {student.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No students found in this department
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HODDashboard;
