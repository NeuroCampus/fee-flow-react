
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Settings, 
  FileText, 
  CreditCard, 
  BarChart3, 
  LogOut,
  Plus,
  Search,
  Check,
  PlusCircle,
  Download,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, FeeComponent, FeeTemplate, StudentProfile, FeeAssignment, Invoice, Payment } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Edit, Trash2, Tag, BookText } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from '@/components/ui/textarea';
import Unauthorized from '@/pages/Unauthorized';

interface FeeAssignmentForm {
  student: number | string;
  template: number | string;
  overrides: string;
}

interface OfflinePaymentForm {
  invoice_id: number | string;
  amount: number;
  mode: string;
  transaction_id?: string;
}

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students'); // Default to students tab
  const queryClient = useQueryClient();

  // Student Management states
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<StudentProfile | null>(null);
  const [studentForm, setStudentForm] = useState({
    email: '',
    password: '',
    name: '',
    usn: '',
    dept: '',
    semester: 1,
    status: 'active',
  });

  // Fee Component Management states
  const [isFeeComponentDialogOpen, setIsFeeComponentDialogOpen] = useState(false);
  const [currentFeeComponent, setCurrentFeeComponent] = useState<FeeComponent | null>(null);
  const [feeComponentForm, setFeeComponentForm] = useState({
    name: '',
    amount: 0,
  });

  // Fee Template Management states
  const [isFeeTemplateDialogOpen, setIsFeeTemplateDialogOpen] = useState(false);
  const [currentFeeTemplate, setCurrentFeeTemplate] = useState<FeeTemplate | null>(null);
  const [feeTemplateForm, setFeeTemplateForm] = useState({
    name: '',
    dept: '',
    semester: 1,
    component_ids: [] as number[],
  });

  // Fee Assignment Management states
  const [isFeeAssignmentDialogOpen, setIsFeeAssignmentDialogOpen] = useState(false);
  const [currentFeeAssignment, setCurrentFeeAssignment] = useState<FeeAssignment | null>(null);
  const [feeAssignmentForm, setFeeAssignmentForm] = useState<FeeAssignmentForm>({
    student: "",
    template: "",
    overrides: "{}",
  });

  // Payment Tracking states
  const [isOfflinePaymentDialogOpen, setIsOfflinePaymentDialogOpen] = useState(false);
  const [offlinePaymentForm, setOfflinePaymentForm] = useState<OfflinePaymentForm>({
    invoice_id: "",
    amount: 0,
    mode: "Cash",
    transaction_id: "",
  });
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentFilterSemester, setPaymentFilterSemester] = useState('');

  // Reports states
  const [reportFilterDept, setReportFilterDept] = useState('');
  const [reportFilterSemester, setReportFilterSemester] = useState('');

  // Queries
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery(
    ["adminStudents", studentSearchQuery],
    () => adminAPI.getStudents(studentSearchQuery)
  );

  const { data: feeComponentsData, isLoading: isLoadingFeeComponents } = useQuery(
    ["feeComponents"],
    adminAPI.getFeeComponents
  );

  const { data: feeTemplatesData, isLoading: isLoadingFeeTemplates } = useQuery(
    ["feeTemplates"],
    adminAPI.getFeeTemplates
  );

  const { data: feeAssignmentsData, isLoading: isLoadingFeeAssignments } = useQuery(
    ["feeAssignments"],
    adminAPI.getFeeAssignments
  );

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery(
    ["adminPayments", paymentSearchQuery, paymentFilterSemester],
    () => adminAPI.getPayments(Number(paymentSearchQuery) || undefined),
    // { enabled: activeTab === "payments" } // Only fetch when on payments tab
  );

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery(
    ["adminInvoices", paymentSearchQuery, paymentFilterSemester],
    () => adminAPI.getInvoices(Number(paymentSearchQuery) || undefined, Number(paymentFilterSemester) || undefined),
    // { enabled: activeTab === "payments" } // Only fetch when on payments tab
  );

  const { data: outstandingReportsData, isLoading: isLoadingOutstandingReports } = useQuery(
    ["outstandingReports", reportFilterDept, reportFilterSemester],
    () => adminAPI.getOutstandingReports(reportFilterDept || undefined, Number(reportFilterSemester) || undefined),
    { enabled: activeTab === "reports" } // Only fetch when on reports tab
  );

  // Mutations for Students
  const addStudentMutation = useMutation(
    (data: any) => adminAPI.addStudent(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["adminStudents"]);
        toast({
          title: "Student Added",
          description: "The student has been successfully added.",
        });
        setIsStudentDialogOpen(false);
        setStudentForm({
          email: '',
          password: '',
          name: '',
          usn: '',
          dept: '',
          semester: 1,
          status: 'active',
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to add student",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const updateStudentMutation = useMutation(
    (variables: { id: number; data: Partial<StudentProfile> }) =>
      adminAPI.updateStudent(variables.id, variables.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["adminStudents"]);
        toast({
          title: "Student Updated",
          description: "The student has been successfully updated.",
        });
        setIsStudentDialogOpen(false);
        setCurrentStudent(null);
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update student",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const deleteStudentMutation = useMutation(
    (id: number) => adminAPI.deleteStudent(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["adminStudents"]);
        toast({
          title: "Student Deleted",
          description: "The student has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete student",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  // Mutations for Fee Components
  const addFeeComponentMutation = useMutation(
    (data: Omit<FeeComponent, "id">) => adminAPI.addFeeComponent(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeComponents"]);
        toast({
          title: "Fee Component Added",
          description: "The fee component has been successfully added.",
        });
        setIsFeeComponentDialogOpen(false);
        setFeeComponentForm({ name: '', amount: 0 });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to add fee component",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const updateFeeComponentMutation = useMutation(
    (variables: { id: number; data: Partial<Omit<FeeComponent, "id">> }) =>
      adminAPI.updateFeeComponent(variables.id, variables.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeComponents"]);
        queryClient.invalidateQueries(["feeTemplates"]);
        toast({
          title: "Fee Component Updated",
          description: "The fee component has been successfully updated.",
        });
        setIsFeeComponentDialogOpen(false);
        setCurrentFeeComponent(null);
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update fee component",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const deleteFeeComponentMutation = useMutation(
    (id: number) => adminAPI.deleteFeeComponent(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeComponents"]);
        queryClient.invalidateQueries(["feeTemplates"]);
        toast({
          title: "Fee Component Deleted",
          description: "The fee component has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete fee component",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  // Mutations for Fee Templates
  const addFeeTemplateMutation = useMutation(
    (data: Omit<FeeTemplate, "id" | "components">) => adminAPI.addFeeTemplate(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeTemplates"]);
        toast({
          title: "Fee Template Added",
          description: "The fee template has been successfully added.",
        });
        setIsFeeTemplateDialogOpen(false);
        setFeeTemplateForm({ name: '', dept: '', semester: 1, component_ids: [] });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to add fee template",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const updateFeeTemplateMutation = useMutation(
    (variables: { id: number; data: Partial<Omit<FeeTemplate, "id" | "components">> }) =>
      adminAPI.updateFeeTemplate(variables.id, variables.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeTemplates"]);
        queryClient.invalidateQueries(["feeAssignments"]); // Assignments might use this template
        toast({
          title: "Fee Template Updated",
          description: "The fee template has been successfully updated.",
        });
        setIsFeeTemplateDialogOpen(false);
        setCurrentFeeTemplate(null);
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update fee template",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const deleteFeeTemplateMutation = useMutation(
    (id: number) => adminAPI.deleteFeeTemplate(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeTemplates"]);
        queryClient.invalidateQueries(["feeAssignments"]);
        toast({
          title: "Fee Template Deleted",
          description: "The fee template has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete fee template",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  // Mutations for Fee Assignments
  const addFeeAssignmentMutation = useMutation(
    (data: Omit<FeeAssignment, "id">) => adminAPI.addFeeAssignment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeAssignments"]);
        queryClient.invalidateQueries(["studentDashboard"]);
        queryClient.invalidateQueries(["adminInvoices"]); // New invoice created
        queryClient.invalidateQueries(["outstandingReports"]); // Potentially affects outstanding reports
        toast({
          title: "Fee Assignment Added",
          description: "The fee assignment has been successfully added and an invoice generated.",
        });
        setIsFeeAssignmentDialogOpen(false);
        setFeeAssignmentForm({ student: "", template: "", overrides: "{}" });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to add fee assignment",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const updateFeeAssignmentMutation = useMutation(
    (variables: { id: number; data: Partial<FeeAssignment> }) =>
      adminAPI.updateFeeAssignment(variables.id, variables.data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeAssignments"]);
        queryClient.invalidateQueries(["studentDashboard"]);
        queryClient.invalidateQueries(["adminInvoices"]);
        queryClient.invalidateQueries(["outstandingReports"]);
        toast({
          title: "Fee Assignment Updated",
          description: "The fee assignment has been successfully updated.",
        });
        setIsFeeAssignmentDialogOpen(false);
        setCurrentFeeAssignment(null);
        setFeeAssignmentForm({ student: "", template: "", overrides: "{}" });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to update fee assignment",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  const deleteFeeAssignmentMutation = useMutation(
    (id: number) => adminAPI.deleteFeeAssignment(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["feeAssignments"]);
        queryClient.invalidateQueries(["studentDashboard"]);
        queryClient.invalidateQueries(["adminInvoices"]);
        queryClient.invalidateQueries(["outstandingReports"]);
        toast({
          title: "Fee Assignment Deleted",
          description: "The fee assignment has been successfully deleted.",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to delete fee assignment",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  // Mutations for Payments
  const addOfflinePaymentMutation = useMutation(
    (data: OfflinePaymentForm) => adminAPI.addOfflinePayment(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["adminPayments"]);
        queryClient.invalidateQueries(["adminInvoices"]);
        queryClient.invalidateQueries(["studentDashboard"]);
        queryClient.invalidateQueries(["outstandingReports"]); // Affects outstanding amounts
        toast({
          title: "Offline Payment Added",
          description: "The offline payment has been successfully recorded.",
        });
        setIsOfflinePaymentDialogOpen(false);
        setOfflinePaymentForm({ invoice_id: "", amount: 0, mode: "Cash", transaction_id: "" });
      },
      onError: (error: any) => {
        toast({
          title: "Failed to add offline payment",
          description: error.response?.data?.error || "An unexpected error occurred.",
          variant: "destructive",
        });
      },
    }
  );

  // Handlers for Students
  const handleAddStudent = () => {
    setCurrentStudent(null);
    setStudentForm({
      email: '',
      password: '',
      name: '',
      usn: '',
      dept: '',
      semester: 1,
      status: 'active',
    });
    setIsStudentDialogOpen(true);
  };

  const handleEditStudent = (student: StudentProfile) => {
    setCurrentStudent(student);
    setStudentForm({ ...student, email: "", password: "" }); // Email/password not editable here
    setIsStudentDialogOpen(true);
  };

  const handleSubmitStudentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentStudent) {
      updateStudentMutation.mutate({
        id: currentStudent.id,
        data: { name: studentForm.name, dept: studentForm.dept, semester: studentForm.semester, status: studentForm.status },
      });
    } else {
      addStudentMutation.mutate(studentForm);
    }
  };

  const handleDeleteStudent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this student and their associated user account?")) {
      deleteStudentMutation.mutate(id);
    }
  };

  // Handlers for Fee Components
  const handleAddFeeComponent = () => {
    setCurrentFeeComponent(null);
    setFeeComponentForm({ name: '', amount: 0 });
    setIsFeeComponentDialogOpen(true);
  };

  const handleEditFeeComponent = (component: FeeComponent) => {
    setCurrentFeeComponent(component);
    setFeeComponentForm({ name: component.name, amount: component.amount });
    setIsFeeComponentDialogOpen(true);
  };

  const handleSubmitFeeComponentForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentFeeComponent) {
      updateFeeComponentMutation.mutate({ id: currentFeeComponent.id, data: feeComponentForm });
    } else {
      addFeeComponentMutation.mutate(feeComponentForm);
    }
  };

  const handleDeleteFeeComponent = (id: number) => {
    if (window.confirm("Are you sure you want to delete this fee component? This might affect existing fee templates.")) {
      deleteFeeComponentMutation.mutate(id);
    }
  };

  // Handlers for Fee Templates
  const handleAddFeeTemplate = () => {
    setCurrentFeeTemplate(null);
    setFeeTemplateForm({ name: '', dept: '', semester: 1, component_ids: [] });
    setIsFeeTemplateDialogOpen(true);
  };

  const handleEditFeeTemplate = (template: FeeTemplate) => {
    setCurrentFeeTemplate(template);
    setFeeTemplateForm({
      name: template.name,
      dept: template.dept,
      semester: template.semester,
      component_ids: template.components.map((comp) => comp.component.id), // Extract component_ids
    });
    setIsFeeTemplateDialogOpen(true);
  };

  const handleSubmitFeeTemplateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentFeeTemplate) {
      updateFeeTemplateMutation.mutate({ id: currentFeeTemplate.id, data: feeTemplateForm });
    } else {
      addFeeTemplateMutation.mutate(feeTemplateForm);
    }
  };

  const handleDeleteFeeTemplate = (id: number) => {
    if (window.confirm("Are you sure you want to delete this fee template? This might affect existing fee assignments.")) {
      deleteFeeTemplateMutation.mutate(id);
    }
  };

  // Handlers for Fee Assignments
  const handleAddFeeAssignment = () => {
    setCurrentFeeAssignment(null);
    setFeeAssignmentForm({ student: "", template: "", overrides: "{}" });
    setIsFeeAssignmentDialogOpen(true);
  };

  const handleEditFeeAssignment = (assignment: FeeAssignment) => {
    setCurrentFeeAssignment(assignment);
    setFeeAssignmentForm({
      student: assignment.student,
      template: assignment.template,
      overrides: JSON.stringify(assignment.overrides),
    });
    setIsFeeAssignmentDialogOpen(true);
  };

  const handleSubmitFeeAssignmentForm = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsedOverrides = JSON.parse(feeAssignmentForm.overrides);
      if (currentFeeAssignment) {
        updateFeeAssignmentMutation.mutate({
          id: currentFeeAssignment.id,
          data: {
            student: Number(feeAssignmentForm.student),
            template: Number(feeAssignmentForm.template),
            overrides: parsedOverrides,
          },
        });
      } else {
        addFeeAssignmentMutation.mutate({
          student: Number(feeAssignmentForm.student),
          template: Number(feeAssignmentForm.template),
          overrides: parsedOverrides,
        });
      }
    } catch (error) {
      toast({
        title: "Invalid Overrides JSON",
        description: "Please ensure the overrides are valid JSON.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteFeeAssignment = (id: number) => {
    if (window.confirm("Are you sure you want to delete this fee assignment? This will also delete associated invoices.")) {
      deleteFeeAssignmentMutation.mutate(id);
    }
  };

  // Handlers for Payments
  const handleAddOfflinePayment = () => {
    setIsOfflinePaymentDialogOpen(true);
    setOfflinePaymentForm({ invoice_id: "", amount: 0, mode: "Cash", transaction_id: "" });
  };

  const handleSubmitOfflinePayment = (e: React.FormEvent) => {
    e.preventDefault();
    addOfflinePaymentMutation.mutate({
      invoice_id: Number(offlinePaymentForm.invoice_id),
      amount: offlinePaymentForm.amount,
      mode: offlinePaymentForm.mode,
      transaction_id: offlinePaymentForm.transaction_id || undefined,
    });
  };

  if (user?.role === "student" || user?.role === "hod") {
    return <Unauthorized />;
  }

  // Helper to find student name by ID
  const getStudentName = (studentId: number) => {
    return studentsData?.students.find((s) => s.id === studentId)?.name || `Student ID: ${studentId}`;
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="students">Student Management</TabsTrigger>
          <TabsTrigger value="fee-setup">Fee Setup</TabsTrigger>
          <TabsTrigger value="fee-assignments">Fee Assignments</TabsTrigger>
          <TabsTrigger value="payments">Payment Tracking</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
        {/* Student Management Tab */}
        <TabsContent value="students" className="mt-4">
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Students</CardTitle>
              <Button onClick={handleAddStudent}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Student
              </Button>
                </CardHeader>
                <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Search students by name or USN..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                />
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingStudents ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Students...
                        </TableCell>
                      </TableRow>
                    ) : studentsData && studentsData.students.length > 0 ? (
                      studentsData.students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.name}</TableCell>
                          <TableCell>{student.usn}</TableCell>
                          <TableCell>{student.dept}</TableCell>
                          <TableCell>{student.semester}</TableCell>
                          <TableCell>{student.status}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditStudent(student)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStudent(student.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center">
                          No students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
                </CardContent>
              </Card>
              
          {/* Add/Edit Student Dialog */}
          <Dialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{currentStudent ? "Edit Student" : "Add Student"}</DialogTitle>
                <DialogDescription>
                  {currentStudent
                    ? "Edit the student's details." 
                    : "Add a new student to the system. An associated user account will be created."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitStudentForm} className="space-y-4">
                {!currentStudent && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={studentForm.email}
                        onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={studentForm.password}
                        onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usn">USN</Label>
                  <Input
                    id="usn"
                    value={studentForm.usn}
                    onChange={(e) => setStudentForm({ ...studentForm, usn: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept"
                    value={studentForm.dept}
                    onChange={(e) => setStudentForm({ ...studentForm, dept: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    type="number"
                    value={studentForm.semester}
                    onChange={(e) => setStudentForm({ ...studentForm, semester: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={studentForm.status}
                    onValueChange={(value) => setStudentForm({ ...studentForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addStudentMutation.isLoading || updateStudentMutation.isLoading}
                  >
                    {(addStudentMutation.isLoading || updateStudentMutation.isLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentStudent ? "Save Changes" : "Add Student"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Fee Setup Tab */}
        <TabsContent value="fee-setup" className="mt-4">
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Fee Components</CardTitle>
              <Button onClick={handleAddFeeComponent}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Component
              </Button>
                </CardHeader>
                <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFeeComponents ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Fee Components...
                        </TableCell>
                      </TableRow>
                    ) : feeComponentsData && feeComponentsData.length > 0 ? (
                      feeComponentsData.map((component) => (
                        <TableRow key={component.id}>
                          <TableCell>{component.name}</TableCell>
                          <TableCell>₹{component.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditFeeComponent(component)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeeComponent(component.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center">
                          No fee components found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
                </CardContent>
              </Card>

          {/* Add/Edit Fee Component Dialog */}
          <Dialog open={isFeeComponentDialogOpen} onOpenChange={setIsFeeComponentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{currentFeeComponent ? "Edit Fee Component" : "Add Fee Component"}</DialogTitle>
                <DialogDescription>
                  {currentFeeComponent ? "Edit the fee component details." : "Add a new fee component."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeeComponentForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="component-name">Name</Label>
                  <Input
                    id="component-name"
                    value={feeComponentForm.name}
                    onChange={(e) => setFeeComponentForm({ ...feeComponentForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="component-amount">Amount</Label>
                  <Input
                    id="component-amount"
                    type="number"
                    value={feeComponentForm.amount}
                    onChange={(e) => setFeeComponentForm({ ...feeComponentForm, amount: Number(e.target.value) })}
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addFeeComponentMutation.isLoading || updateFeeComponentMutation.isLoading}
                  >
                    {(addFeeComponentMutation.isLoading || updateFeeComponentMutation.isLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentFeeComponent ? "Save Changes" : "Add Component"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
              
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Fee Templates</CardTitle>
              <Button onClick={handleAddFeeTemplate}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Template
              </Button>
                </CardHeader>
                <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Components</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFeeTemplates ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Fee Templates...
                        </TableCell>
                      </TableRow>
                    ) : feeTemplatesData && feeTemplatesData.length > 0 ? (
                      feeTemplatesData.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>{template.dept}</TableCell>
                          <TableCell>{template.semester}</TableCell>
                          <TableCell>
                            {template.components
                              .map((comp) => `${comp.component.name} (₹${comp.amount_override || comp.component.amount})`)
                              .join(", ")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditFeeTemplate(template)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeeTemplate(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          No fee templates found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
                </CardContent>
              </Card>

          {/* Add/Edit Fee Template Dialog */}
          <Dialog open={isFeeTemplateDialogOpen} onOpenChange={setIsFeeTemplateDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{currentFeeTemplate ? "Edit Fee Template" : "Create Fee Template"}</DialogTitle>
                <DialogDescription>
                  {currentFeeTemplate
                    ? "Edit the fee template details and associated components."
                    : "Create a new fee template and assign fee components."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeeTemplateForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="template-name">Template Name</Label>
                  <Input
                    id="template-name"
                    value={feeTemplateForm.name}
                    onChange={(e) => setFeeTemplateForm({ ...feeTemplateForm, name: e.target.value })}
                    required
                  />
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="template-dept">Department</Label>
                  <Input
                    id="template-dept"
                    value={feeTemplateForm.dept}
                    onChange={(e) => setFeeTemplateForm({ ...feeTemplateForm, dept: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-semester">Semester</Label>
                  <Input
                    id="template-semester"
                    type="number"
                    value={feeTemplateForm.semester}
                    onChange={(e) => setFeeTemplateForm({ ...feeTemplateForm, semester: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fee Components</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {feeComponentsData?.map((component) => (
                      <div key={component.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`component-${component.id}`}
                          checked={feeTemplateForm.component_ids.includes(component.id)}
                          onCheckedChange={(checked) => {
                            setFeeTemplateForm((prev) => ({
                              ...prev,
                              component_ids: checked
                                ? [...prev.component_ids, component.id]
                                : prev.component_ids.filter((id) => id !== component.id),
                            }));
                          }}
                        />
                        <label
                          htmlFor={`component-${component.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {component.name} (₹{component.amount.toLocaleString()})
                        </label>
                </div>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addFeeTemplateMutation.isLoading || updateFeeTemplateMutation.isLoading}
                  >
                    {(addFeeTemplateMutation.isLoading || updateFeeTemplateMutation.isLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentFeeTemplate ? "Save Changes" : "Create Template"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </TabsContent>

        {/* Fee Assignments Tab */}
        <TabsContent value="fee-assignments" className="mt-4">
              <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Fee Assignments</CardTitle>
              <Button onClick={handleAddFeeAssignment}>
                <PlusCircle className="mr-2 h-4 w-4" /> Assign Fee
              </Button>
                </CardHeader>
                <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student (USN)</TableHead>
                      <TableHead>Fee Template</TableHead>
                      <TableHead>Overrides</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFeeAssignments ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Fee Assignments...
                        </TableCell>
                      </TableRow>
                    ) : feeAssignmentsData && feeAssignmentsData.length > 0 ? (
                      feeAssignmentsData.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell>
                            {studentsData?.students.find((s) => s.id === assignment.student)?.name ||
                              `Student ID: ${assignment.student}`}
                            {` (${studentsData?.students.find((s) => s.id === assignment.student)?.usn || 'N/A'})`}
                          </TableCell>
                          <TableCell>
                            {feeTemplatesData?.find((t) => t.id === assignment.template)?.name ||
                              `Template ID: ${assignment.template}`}
                          </TableCell>
                          <TableCell>{JSON.stringify(assignment.overrides)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-2"
                              onClick={() => handleEditFeeAssignment(assignment)}
                            >
                              <Edit className="h-4 w-4" />
                  </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFeeAssignment(assignment.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          No fee assignments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                  </div>
                </CardContent>
              </Card>

          {/* Add/Edit Fee Assignment Dialog */}
          <Dialog open={isFeeAssignmentDialogOpen} onOpenChange={setIsFeeAssignmentDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {currentFeeAssignment ? "Edit Fee Assignment" : "Assign Fee Template to Student"}
                </DialogTitle>
                <DialogDescription>
                  {currentFeeAssignment
                    ? "Edit the fee assignment details."
                    : "Select a student and a fee template to assign fees."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeeAssignmentForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-student">Student</Label>
                  <Select
                    value={String(feeAssignmentForm.student)}
                    onValueChange={(value) => setFeeAssignmentForm({ ...feeAssignmentForm, student: Number(value) })}
                    disabled={!!currentFeeAssignment} // Disable student selection when editing
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {studentsData?.students.map((student) => (
                        <SelectItem key={student.id} value={String(student.id)}>
                          {student.name} ({student.usn})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-template">Fee Template</Label>
                  <Select
                    value={String(feeAssignmentForm.template)}
                    onValueChange={(value) => setFeeAssignmentForm({ ...feeAssignmentForm, template: Number(value) })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a fee template" />
                    </SelectTrigger>
                    <SelectContent>
                      {feeTemplatesData?.map((template) => (
                        <SelectItem key={template.id} value={String(template.id)}>
                          {template.name} ({template.dept} - Sem {template.semester})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
            </div>
                <div className="space-y-2">
                  <Label htmlFor="assign-overrides">Overrides (JSON)</Label>
                  <Textarea
                    id="assign-overrides"
                    placeholder="{}" 
                    value={feeAssignmentForm.overrides}
                    onChange={(e) => setFeeAssignmentForm({ ...feeAssignmentForm, overrides: e.target.value })}
                    className="min-h-[100px]"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter a JSON object for component overrides. E.g., &lbrace;"1": 5000, "3": 2000&rbrace;
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addFeeAssignmentMutation.isLoading || updateFeeAssignmentMutation.isLoading}
                  >
                    {(addFeeAssignmentMutation.isLoading || updateFeeAssignmentMutation.isLoading) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentFeeAssignment ? "Save Changes" : "Assign Fee"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </TabsContent>

        {/* Payment Tracking Tab */}
        <TabsContent value="payments" className="mt-4">
            <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Payment Tracking</CardTitle>
              <Button onClick={handleAddOfflinePayment}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Offline Payment
                  </Button>
              </CardHeader>
              <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Input
                  placeholder="Search by Student ID or Invoice ID..."
                  value={paymentSearchQuery}
                  onChange={(e) => setPaymentSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
                <Select
                  value={paymentFilterSemester}
                  onValueChange={setPaymentFilterSemester}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>{`Semester ${sem}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <h3 className="text-xl font-semibold mb-2">Recent Payments</h3>
              <div className="rounded-md border mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingPayments ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Payments...
                        </TableCell>
                      </TableRow>
                    ) : paymentsData && paymentsData.length > 0 ? (
                      paymentsData.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{payment.id}</TableCell>
                          <TableCell>{getStudentName(invoicesData?.find(inv => inv.id === payment.invoice_id)?.student_id || 0)}</TableCell>
                          <TableCell>{payment.invoice_id}</TableCell>
                          <TableCell>₹{payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{payment.mode}</TableCell>
                          <TableCell>{payment.status}</TableCell>
                          <TableCell>{new Date(payment.timestamp).toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No payments found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <h3 className="text-xl font-semibold mb-2">Invoices</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingInvoices ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Invoices...
                        </TableCell>
                      </TableRow>
                    ) : invoicesData && invoicesData.length > 0 ? (
                      invoicesData.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.id}</TableCell>
                          <TableCell>{getStudentName(invoice.student_id)}</TableCell>
                          <TableCell>{invoice.semester}</TableCell>
                          <TableCell>₹{invoice.total_amount.toLocaleString()}</TableCell>
                          <TableCell>₹{invoice.paid_amount.toLocaleString()}</TableCell>
                          <TableCell>₹{invoice.balance_amount.toLocaleString()}</TableCell>
                          <TableCell>{invoice.status}</TableCell>
                          <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {/* Add actions for invoice if needed, e.g., edit due date */}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center">
                          No invoices found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>

          {/* Add Offline Payment Dialog */}
          <Dialog open={isOfflinePaymentDialogOpen} onOpenChange={setIsOfflinePaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Offline Payment</DialogTitle>
                <DialogDescription>Manually record a payment received offline.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitOfflinePayment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offline-invoice-id">Invoice ID</Label>
                  <Select
                    value={String(offlinePaymentForm.invoice_id)}
                    onValueChange={(value) => setOfflinePaymentForm({ ...offlinePaymentForm, invoice_id: Number(value) })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an invoice" />
                    </SelectTrigger>
                    <SelectContent>
                      {invoicesData?.map((invoice) => (
                        <SelectItem key={invoice.id} value={String(invoice.id)}>
                          Invoice #{invoice.id} - {getStudentName(invoice.student_id)} (Bal: ₹{invoice.balance_amount.toLocaleString()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-amount">Amount</Label>
                  <Input
                    id="offline-amount"
                    type="number"
                    value={offlinePaymentForm.amount}
                    onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, amount: Number(e.target.value) })}
                    required
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-mode">Payment Mode</Label>
                  <Input
                    id="offline-mode"
                    value={offlinePaymentForm.mode}
                    onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, mode: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offline-transaction-id">Transaction ID (Optional)</Label>
                  <Input
                    id="offline-transaction-id"
                    value={offlinePaymentForm.transaction_id}
                    onChange={(e) => setOfflinePaymentForm({ ...offlinePaymentForm, transaction_id: e.target.value })}
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addOfflinePaymentMutation.isLoading}
                  >
                    {addOfflinePaymentMutation.isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Add Payment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-bold">Outstanding Reports</CardTitle>
              </CardHeader>
              <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <Select
                  value={reportFilterDept}
                  onValueChange={setReportFilterDept}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Departments</SelectItem>
                    {/* Assuming departments are dynamic, hardcoding for now */}
                    <SelectItem value="CSE">CSE</SelectItem>
                    <SelectItem value="ECE">ECE</SelectItem>
                    <SelectItem value="MECH">MECH</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={reportFilterSemester}
                  onValueChange={setReportFilterSemester}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Semesters</SelectItem>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>{`Semester ${sem}`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <h3 className="text-xl font-semibold mb-2">Outstanding Invoices</h3>
              <div className="rounded-md border mb-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingOutstandingReports ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Reports...
                        </TableCell>
                      </TableRow>
                    ) : outstandingReportsData && outstandingReportsData.outstanding_invoices.length > 0 ? (
                      outstandingReportsData.outstanding_invoices.map((invoice) => (
                        <TableRow key={invoice.invoice_id}>
                          <TableCell>{invoice.invoice_id}</TableCell>
                          <TableCell>{invoice.student_name}</TableCell>
                          <TableCell>{invoice.student_usn}</TableCell>
                          <TableCell>{invoice.department}</TableCell>
                          <TableCell>{invoice.semester}</TableCell>
                          <TableCell>₹{invoice.total_amount.toLocaleString()}</TableCell>
                          <TableCell>₹{invoice.paid_amount.toLocaleString()}</TableCell>
                          <TableCell>₹{invoice.balance_amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>{invoice.status}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center">
                          No outstanding invoices found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="text-right text-lg font-bold">
                Total Outstanding: ₹{outstandingReportsData?.total_outstanding_amount.toLocaleString() || 0}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default AdminDashboard;
