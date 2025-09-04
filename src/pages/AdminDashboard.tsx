
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
  AlertCircle,
  Loader2,
  Edit,
  Trash2,
  Tag,
  BookText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI, FeeComponent, FeeTemplate, StudentProfile, FeeAssignment, Invoice, Payment, BulkAssignmentRequest, BulkAssignmentResponse, AutoAssignmentRequest, AutoAssignmentResponse, BulkAssignmentStats } from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from '@/components/ui/textarea';
import { Badge } from "@/components/ui/badge";
import Unauthorized from '@/pages/Unauthorized';

interface FeeAssignmentForm {
  student: number | string;
  template: number | string;
  overrides: string;
}

interface OfflinePaymentForm {
  invoice_id: number;
  amount: number;
  mode: string;
  transaction_id?: string;
}

// Individual Fee Row Component
const IndividualFeeRow: React.FC<{
  student: StudentProfile;
  onAssignFees: () => void;
}> = ({ student, onAssignFees }) => {
  const [customFees, setCustomFees] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch custom fees for this student
  React.useEffect(() => {
    const fetchCustomFees = async () => {
      setIsLoading(true);
      try {
        const response = await adminAPI.getIndividualFeeAssignment(student.id);
        setCustomFees(response);
      } catch (error) {
        console.error('Error fetching custom fees:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomFees();
  }, [student.id]);

  if (isLoading) {
    return (
      <TableRow>
        <TableCell colSpan={7} className="text-center">
          <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" /> Loading...
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell>{student.name}</TableCell>
      <TableCell>{student.usn}</TableCell>
      <TableCell>{student.dept}</TableCell>
      <TableCell>{student.semester}</TableCell>
      <TableCell>
        {customFees?.custom_fee_structure ? (
          <div className="text-sm">
            {Object.entries(customFees.custom_fee_structure).map(([name, amount]) => (
              <div key={name} className="flex justify-between">
                <span>{name}:</span>
                <span>₹{Number(amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">No custom fees</span>
        )}
      </TableCell>
      <TableCell>
        {customFees?.total_amount ? (
          <span className="font-semibold">₹{customFees.total_amount.toLocaleString()}</span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onAssignFees}
        >
          <Edit className="h-4 w-4 mr-2" />
          {customFees?.custom_fee_structure ? 'Edit Fees' : 'Assign Fees'}
        </Button>
      </TableCell>
    </TableRow>
  );
};

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
    admission_mode: '',
    dept: '',
    fee_type: 'annual',
    academic_year: '2024-25',
    semester: 1,
    is_active: true,
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
    invoice_id: 0,
    amount: 0,
    mode: "Cash",
    transaction_id: "",
  });
  const [paymentSearchQuery, setPaymentSearchQuery] = useState('');
  const [paymentFilterSemester, setPaymentFilterSemester] = useState('all');

  // Reports states
  const [reportFilterDept, setReportFilterDept] = useState('all');
  const [reportFilterSemester, setReportFilterSemester] = useState('all');

  // Bulk Assignment states
  const [bulkAssignmentForm, setBulkAssignmentForm] = useState({
    admission_mode: '',
    department: '',
    template_id: 0,
    academic_year: '',
    dry_run: true,
  });
  const [autoAssignmentForm, setAutoAssignmentForm] = useState({
    admission_modes: [] as string[],
    departments: [] as string[],
    academic_year: '',
    dry_run: true,
  });

  // Queries
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["adminStudents", studentSearchQuery],
    queryFn: () => adminAPI.getStudents(studentSearchQuery)
  });

  const { data: feeComponentsData, isLoading: isLoadingFeeComponents } = useQuery({
    queryKey: ["feeComponents"],
    queryFn: adminAPI.getFeeComponents
  });

  const { data: feeTemplatesData, isLoading: isLoadingFeeTemplates } = useQuery({
    queryKey: ["feeTemplates"],
    queryFn: adminAPI.getFeeTemplates
  });

  const { data: feeAssignmentsData, isLoading: isLoadingFeeAssignments } = useQuery({
    queryKey: ["feeAssignments"],
    queryFn: adminAPI.getFeeAssignments
  });

  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["adminPayments", paymentSearchQuery, paymentFilterSemester],
    queryFn: () => adminAPI.getPayments(Number(paymentSearchQuery) || undefined),
    // enabled: activeTab === "payments" // Only fetch when on payments tab
  });

  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ["adminInvoices", paymentSearchQuery, paymentFilterSemester],
    queryFn: () => adminAPI.getInvoices(Number(paymentSearchQuery) || undefined, paymentFilterSemester === 'all' ? undefined : Number(paymentFilterSemester)),
    // enabled: activeTab === "payments" // Only fetch when on payments tab
  });

  const { data: outstandingReportsData, isLoading: isLoadingOutstandingReports } = useQuery({
    queryKey: ["outstandingReports", reportFilterDept, reportFilterSemester],
    queryFn: () => adminAPI.getOutstandingReports(reportFilterDept === 'all' ? undefined : reportFilterDept, reportFilterSemester === 'all' ? undefined : Number(reportFilterSemester)),
    enabled: activeTab === "reports" // Only fetch when on reports tab
  });

  // Bulk Assignment queries
  const { data: bulkAssignmentStats, isLoading: isLoadingBulkStats } = useQuery({
    queryKey: ["bulkAssignmentStats"],
    queryFn: adminAPI.getBulkAssignmentStats,
    enabled: activeTab === "bulk-assignment" // Only fetch when on bulk assignment tab
  });



  // Mutations for Students
  const addStudentMutation = useMutation({
    mutationFn: (data: any) => adminAPI.addStudent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
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
  });

  const updateStudentMutation = useMutation({
    mutationFn: (variables: { id: number; data: Partial<StudentProfile> }) =>
      adminAPI.updateStudent(variables.id, variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
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
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
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
  });

  // Mutations for Fee Components
  const addFeeComponentMutation = useMutation({
    mutationFn: (data: Omit<FeeComponent, "id">) => adminAPI.addFeeComponent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeComponents"] });
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
  });

  const updateFeeComponentMutation = useMutation({
    mutationFn: (variables: { id: number; data: Partial<Omit<FeeComponent, "id">> }) =>
      adminAPI.updateFeeComponent(variables.id, variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeComponents"] });
      queryClient.invalidateQueries({ queryKey: ["feeTemplates"] });
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
  });

  const deleteFeeComponentMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteFeeComponent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeComponents"] });
      queryClient.invalidateQueries({ queryKey: ["feeTemplates"] });
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
  });

  // Mutations for Fee Templates
  const addFeeTemplateMutation = useMutation({
    mutationFn: (data: Omit<FeeTemplate, "id" | "components">) => adminAPI.addFeeTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeTemplates"] });
      toast({
        title: "Fee Template Added",
        description: "The fee template has been successfully added.",
      });
      setIsFeeTemplateDialogOpen(false);
      setFeeTemplateForm({ name: '', admission_mode: '', dept: '', fee_type: 'annual', academic_year: '2024-25', semester: 1, is_active: true, component_ids: [] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add fee template",
        description: error.response?.data?.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const updateFeeTemplateMutation = useMutation({
    mutationFn: (variables: { id: number; data: Partial<Omit<FeeTemplate, "id" | "components">> }) =>
      adminAPI.updateFeeTemplate(variables.id, variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] }); // Assignments might use this template
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
  });

  const deleteFeeTemplateMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteFeeTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeTemplates"] });
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
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
  });

  // Mutations for Fee Assignments
  const addFeeAssignmentMutation = useMutation({
    mutationFn: (data: Omit<FeeAssignment, "id">) => adminAPI.addFeeAssignment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] }); // New invoice created
      queryClient.invalidateQueries({ queryKey: ["outstandingReports"] }); // Potentially affects outstanding reports
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
  });

  const updateFeeAssignmentMutation = useMutation({
    mutationFn: (variables: { id: number; data: Partial<FeeAssignment> }) =>
      adminAPI.updateFeeAssignment(variables.id, variables.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["outstandingReports"] });
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
  });

  const deleteFeeAssignmentMutation = useMutation({
    mutationFn: (id: number) => adminAPI.deleteFeeAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["outstandingReports"] });
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
  });

  // Mutations for Payments
  const addOfflinePaymentMutation = useMutation({
    mutationFn: (data: OfflinePaymentForm) => adminAPI.addOfflinePayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminPayments"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
      queryClient.invalidateQueries({ queryKey: ["studentDashboard"] });
      queryClient.invalidateQueries({ queryKey: ["outstandingReports"] }); // Affects outstanding amounts
      toast({
        title: "Offline Payment Added",
        description: "The offline payment has been successfully recorded.",
      });
      setIsOfflinePaymentDialogOpen(false);
      setOfflinePaymentForm({ invoice_id: 0, amount: 0, mode: "Cash", transaction_id: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add offline payment",
        description: error.response?.data?.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  // Mutations for Bulk Assignment
  const bulkAssignFeesMutation = useMutation({
    mutationFn: (data: BulkAssignmentRequest) => adminAPI.bulkAssignFees(data),
    onSuccess: (data: BulkAssignmentResponse) => {
      queryClient.invalidateQueries({ queryKey: ["bulkAssignmentStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
      
      const message = data.dry_run 
        ? `Dry run completed: ${data.assignments_created} assignments would be created, ${data.invoices_created} invoices would be generated.`
        : `Bulk assignment completed: ${data.assignments_created} assignments created, ${data.invoices_created} invoices generated.`;
      
      toast({
        title: data.dry_run ? "Dry Run Completed" : "Bulk Assignment Completed",
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Assignment Failed",
        description: error.response?.data?.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

  const autoAssignFeesMutation = useMutation({
    mutationFn: (data: AutoAssignmentRequest) => adminAPI.executeAutoAssignment(data),
    onSuccess: (data: AutoAssignmentResponse) => {
      queryClient.invalidateQueries({ queryKey: ["bulkAssignmentStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      queryClient.invalidateQueries({ queryKey: ["feeAssignments"] });
      queryClient.invalidateQueries({ queryKey: ["adminInvoices"] });
      
      const message = data.dry_run 
        ? `Dry run completed: ${data.total_assignments_created} assignments would be created, ${data.total_invoices_created} invoices would be generated.`
        : `Auto assignment completed: ${data.total_assignments_created} assignments created, ${data.total_invoices_created} invoices generated.`;
      
      toast({
        title: data.dry_run ? "Dry Run Completed" : "Auto Assignment Completed",
        description: message,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Auto Assignment Failed",
        description: error.response?.data?.error || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });

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
    setFeeTemplateForm({
      name: '',
      admission_mode: '',
      dept: '',
      fee_type: 'annual',
      academic_year: '2024-25',
      semester: 1,
      is_active: true,
      component_ids: []
    });
    setIsFeeTemplateDialogOpen(true);
  };

  const handleEditFeeTemplate = (template: FeeTemplate) => {
    setCurrentFeeTemplate(template);
    setFeeTemplateForm({
      name: template.name,
      admission_mode: template.admission_mode || '',
      dept: template.dept || '',
      fee_type: template.fee_type || 'annual',
      academic_year: template.academic_year || '2024-25',
      semester: template.semester || 1,
      is_active: template.is_active !== false,
      component_ids: template.component_ids || [],
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
    
    if (currentStudent) {
      // Individual fee assignment
      try {
        const overrides = JSON.parse(feeAssignmentForm.overrides || '{}');
        const components: Record<string, number> = {};
        
        // Convert overrides to components format
        Object.entries(overrides).forEach(([name, amount]) => {
          const numAmount = Number(amount);
          if (numAmount > 0) {
            components[name] = numAmount;
          }
        });
        
        // Use the individual fee assignment API
        adminAPI.assignIndividualFees(currentStudent.id, { components })
          .then(() => {
            toast({
              title: "Individual Fees Assigned",
              description: "Custom fee structure has been assigned successfully.",
            });
            setIsFeeAssignmentDialogOpen(false);
            setCurrentStudent(null);
            setFeeAssignmentForm({ student: "", template: "", overrides: "{}" });
            // Refresh the individual fees tab
            queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
          })
          .catch((error) => {
            toast({
              title: "Failed to Assign Fees",
              description: error.response?.data?.error || "An error occurred.",
              variant: "destructive",
            });
          });
      } catch (error) {
        toast({
          title: "Invalid Fee Data",
          description: "Please ensure all fee amounts are valid numbers.",
          variant: "destructive",
        });
      }
    } else {
      // Regular fee assignment with template
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
    setOfflinePaymentForm({ invoice_id: 0, amount: 0, mode: "Cash", transaction_id: "" });
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

  // New handler for Individual Fee Assignment
  const handleIndividualFeeAssignment = (student: StudentProfile) => {
    setCurrentStudent(student);
    setIsFeeAssignmentDialogOpen(true);
    setFeeAssignmentForm({
      student: student.id,
      template: "", // No template selected for individual assignment
      overrides: "{}",
    });
  };

  if (user?.role === "student" || user?.role === "hod") {
    return <Unauthorized />;
  }

  // Helper to find student name by ID
  const getStudentName = (studentId: number) => {
    return studentsData?.students.find((s) => s.id === studentId)?.name || `Student ID: ${studentId}`;
  };

  // Handlers for Bulk Assignment
  const handleBulkAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    bulkAssignFeesMutation.mutate(bulkAssignmentForm);
  };

  const handleAutoAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    autoAssignFeesMutation.mutate(autoAssignmentForm);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="students">Student Management</TabsTrigger>
          <TabsTrigger value="fee-setup">Fee Setup</TabsTrigger>
          <TabsTrigger value="fee-assignments">Fee Assignments</TabsTrigger>
          <TabsTrigger value="individual-fees">Individual Fees</TabsTrigger>
          <TabsTrigger value="bulk-assignment">Bulk Assignment</TabsTrigger>
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
                    disabled={addStudentMutation.isPending || updateStudentMutation.isPending}
                  >
                    {(addStudentMutation.isPending || updateStudentMutation.isPending) && (
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
                    ) : Array.isArray(feeComponentsData) && feeComponentsData.length > 0 ? (
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
                    disabled={addFeeComponentMutation.isPending || updateFeeComponentMutation.isPending}
                  >
                    {(addFeeComponentMutation.isPending || updateFeeComponentMutation.isPending) && (
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
                      <TableHead>Admission Mode</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingFeeTemplates ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Fee Templates...
                        </TableCell>
                      </TableRow>
                    ) : Array.isArray(feeTemplatesData) && feeTemplatesData.length > 0 ? (
                      feeTemplatesData.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell>{template.name}</TableCell>
                          <TableCell>{template.admission_mode}</TableCell>
                          <TableCell>{template.dept || 'All'}</TableCell>
                          <TableCell>{template.fee_type}</TableCell>
                          <TableCell>{template.academic_year}</TableCell>
                          <TableCell>₹{template.total_amount?.toLocaleString() || '0'}</TableCell>
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
                        <TableCell colSpan={7} className="text-center">
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
                  <Label htmlFor="template-admission-mode">Admission Mode</Label>
                  <Select
                    value={feeTemplateForm.admission_mode}
                    onValueChange={(value) => setFeeTemplateForm({ ...feeTemplateForm, admission_mode: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select admission mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kcet">KCET</SelectItem>
                      <SelectItem value="comedk">COMED-K</SelectItem>
                      <SelectItem value="management">Management</SelectItem>
                      <SelectItem value="jee">JEE</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="lateral">Lateral Entry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-dept">Department (Optional)</Label>
                  <Input
                    id="template-dept"
                    value={feeTemplateForm.dept}
                    onChange={(e) => setFeeTemplateForm({ ...feeTemplateForm, dept: e.target.value })}
                    placeholder="Leave empty for all departments"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-fee-type">Fee Type</Label>
                  <Select
                    value={feeTemplateForm.fee_type}
                    onValueChange={(value) => setFeeTemplateForm({ ...feeTemplateForm, fee_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select fee type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="semester">Semester</SelectItem>
                      <SelectItem value="one_time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-academic-year">Academic Year</Label>
                  <Input
                    id="template-academic-year"
                    value={feeTemplateForm.academic_year}
                    onChange={(e) => setFeeTemplateForm({ ...feeTemplateForm, academic_year: e.target.value })}
                    placeholder="2024-25"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fee Components</Label>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-2">
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
                    disabled={addFeeTemplateMutation.isPending || updateFeeTemplateMutation.isPending}
                  >
                    {(addFeeTemplateMutation.isPending || updateFeeTemplateMutation.isPending) && (
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
                    ) : Array.isArray(feeAssignmentsData) && feeAssignmentsData.length > 0 ? (
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
                  {currentFeeAssignment ? "Edit Fee Assignment" : 
                   currentStudent ? "Assign Individual Fees to Student" : "Assign Fee Template to Student"}
                </DialogTitle>
                <DialogDescription>
                  {currentFeeAssignment
                    ? "Edit the fee assignment details."
                    : currentStudent
                    ? "Set custom fee amounts for individual components for this student."
                    : "Select a student and a fee template to assign fees."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFeeAssignmentForm} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assign-student">Student</Label>
                  <Select
                    value={String(feeAssignmentForm.student)}
                    onValueChange={(value) => setFeeAssignmentForm({ ...feeAssignmentForm, student: Number(value) })}
                    disabled={!!currentFeeAssignment || !!currentStudent} // Disable when editing or individual assignment
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
                
                {!currentStudent && (
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
                        {Array.isArray(feeTemplatesData) && feeTemplatesData.map((template) => (
                          <SelectItem key={template.id} value={String(template.id)}>
                            {template.name} ({template.admission_mode} - {template.fee_type} - {template.academic_year})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {currentStudent ? (
                  <div className="space-y-4">
                    <Label>Custom Fee Amounts</Label>
                    <div className="max-h-60 overflow-y-auto border rounded-lg p-4 space-y-3">
                      {feeComponentsData?.map((component) => (
                        <div key={component.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium">{component.name}</span>
                            <p className="text-sm text-muted-foreground">Default: ₹{component.amount.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              placeholder="Custom amount"
                              className="w-32"
                              min="0"
                              step="0.01"
                              onChange={(e) => {
                                const amount = Number(e.target.value);
                                const overrides = JSON.parse(feeAssignmentForm.overrides || '{}');
                                if (amount > 0) {
                                  overrides[component.name] = amount;
                                } else {
                                  delete overrides[component.name];
                                }
                                setFeeAssignmentForm({
                                  ...feeAssignmentForm,
                                  overrides: JSON.stringify(overrides)
                                });
                              }}
                            />
                            <span className="text-sm text-muted-foreground">₹</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Set custom amounts for each fee component. Leave empty to use default amounts from the selected template.
                      </AlertDescription>
                    </Alert>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="assign-overrides">Fee Adjustments (Advanced)</Label>
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
                )}
                
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={addFeeAssignmentMutation.isPending || updateFeeAssignmentMutation.isPending}
                  >
                    {(addFeeAssignmentMutation.isPending || updateFeeAssignmentMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {currentFeeAssignment ? "Save Changes" : 
                     currentStudent ? "Assign Individual Fees" : "Assign Fee"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </TabsContent>

        {/* Individual Fees Tab */}
        <TabsContent value="individual-fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Individual Fee Assignment</CardTitle>
              <CardDescription>
                Assign custom fee structures to individual students. This allows you to set different fees for each student regardless of templates.
              </CardDescription>
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
                      <TableHead>Student</TableHead>
                      <TableHead>USN</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Custom Fee Structure</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingStudents ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin inline-block mr-2" /> Loading Students...
                        </TableCell>
                      </TableRow>
                    ) : studentsData && studentsData.students.length > 0 ? (
                      studentsData.students.map((student) => (
                        <IndividualFeeRow 
                          key={student.id} 
                          student={student} 
                          onAssignFees={() => handleIndividualFeeAssignment(student)}
                        />
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center">
                          No students found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                    <SelectItem value="all">All Semesters</SelectItem>
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
                    ) : Array.isArray(invoicesData) && invoicesData.length > 0 ? (
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
                      {Array.isArray(invoicesData) && invoicesData.map((invoice) => (
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
                    disabled={addOfflinePaymentMutation.isPending}
                  >
                    {addOfflinePaymentMutation.isPending && (
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
                    <SelectItem value="all">All Departments</SelectItem>
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
                    <SelectItem value="all">All Semesters</SelectItem>
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
                    ) : outstandingReportsData && outstandingReportsData.outstanding_invoices && outstandingReportsData.outstanding_invoices.length > 0 ? (
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

          {/* Bulk Assignment Tab */}
          <TabsContent value="bulk-assignment" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bulk Assignment Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Assignment Statistics</CardTitle>
                  <CardDescription>
                    Overview of students and available templates for bulk assignment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBulkStats ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Loading statistics...</span>
                    </div>
                  ) : bulkAssignmentStats?.bulk_assignment_stats ? (
                    <div className="space-y-4">
                      {bulkAssignmentStats.bulk_assignment_stats.map((stat, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">{stat.admission_mode} - {stat.department}</h3>
                            <Badge variant="outline">{stat.total_students} students</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Assigned:</span>
                              <div className="font-medium text-green-600">{stat.assigned_students}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Unassigned:</span>
                              <div className="font-medium text-red-600">{stat.unassigned_students}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <span className="text-sm text-muted-foreground">Available Templates:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {stat.available_templates.map((template) => (
                                <Badge key={template.id} variant="secondary" className="text-xs">
                                  {template.name} (₹{template.total_amount.toLocaleString()})
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">No statistics available</p>
                  )}
                </CardContent>
              </Card>

              {/* Bulk Assignment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Manual Bulk Assignment</CardTitle>
                  <CardDescription>
                    Assign fees to students based on admission mode and department
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBulkAssignment} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="admission_mode">Admission Mode</Label>
                      <Select
                        value={bulkAssignmentForm.admission_mode}
                        onValueChange={(value) => setBulkAssignmentForm({ ...bulkAssignmentForm, admission_mode: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select admission mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="lateral">Lateral Entry</SelectItem>
                          <SelectItem value="management">Management Quota</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select
                        value={bulkAssignmentForm.department}
                        onValueChange={(value) => setBulkAssignmentForm({ ...bulkAssignmentForm, department: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CSE">Computer Science</SelectItem>
                          <SelectItem value="ECE">Electronics</SelectItem>
                          <SelectItem value="MECH">Mechanical</SelectItem>
                          <SelectItem value="CIVIL">Civil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="template_id">Fee Template</Label>
                      <Select
                        value={bulkAssignmentForm.template_id.toString()}
                        onValueChange={(value) => setBulkAssignmentForm({ ...bulkAssignmentForm, template_id: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select template" />
                        </SelectTrigger>
                        <SelectContent>
                          {feeTemplatesData?.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} - ₹{template.components.reduce((sum, comp) => sum + comp.amount_override || comp.component.amount, 0).toLocaleString()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="academic_year">Academic Year (Optional)</Label>
                      <Input
                        id="academic_year"
                        value={bulkAssignmentForm.academic_year}
                        onChange={(e) => setBulkAssignmentForm({ ...bulkAssignmentForm, academic_year: e.target.value })}
                        placeholder="2024-25"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="dry_run"
                        checked={bulkAssignmentForm.dry_run}
                        onChange={(e) => setBulkAssignmentForm({ ...bulkAssignmentForm, dry_run: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="dry_run">Dry Run (Preview only)</Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={bulkAssignFeesMutation.isPending}
                    >
                      {bulkAssignFeesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {bulkAssignmentForm.dry_run ? 'Preview Assignment' : 'Execute Bulk Assignment'}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Auto Assignment Form */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Automatic Assignment</CardTitle>
                  <CardDescription>
                    Automatically assign fees based on predefined rules and templates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAutoAssignment} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Admission Modes</Label>
                        <div className="space-y-2">
                          {['regular', 'lateral', 'management'].map((mode) => (
                            <div key={mode} className="flex items-center space-x-2">
                              <Checkbox
                                id={`auto-${mode}`}
                                checked={autoAssignmentForm.admission_modes.includes(mode)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAutoAssignmentForm({
                                      ...autoAssignmentForm,
                                      admission_modes: [...autoAssignmentForm.admission_modes, mode]
                                    });
                                  } else {
                                    setAutoAssignmentForm({
                                      ...autoAssignmentForm,
                                      admission_modes: autoAssignmentForm.admission_modes.filter(m => m !== mode)
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`auto-${mode}`} className="capitalize">{mode}</Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Departments (Optional)</Label>
                        <div className="space-y-2">
                          {['CSE', 'ECE', 'MECH', 'CIVIL'].map((dept) => (
                            <div key={dept} className="flex items-center space-x-2">
                              <Checkbox
                                id={`dept-${dept}`}
                                checked={autoAssignmentForm.departments?.includes(dept) || false}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setAutoAssignmentForm({
                                      ...autoAssignmentForm,
                                      departments: [...(autoAssignmentForm.departments || []), dept]
                                    });
                                  } else {
                                    setAutoAssignmentForm({
                                      ...autoAssignmentForm,
                                      departments: autoAssignmentForm.departments?.filter(d => d !== dept) || []
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={`dept-${dept}`}>{dept}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="auto_academic_year">Academic Year (Optional)</Label>
                      <Input
                        id="auto_academic_year"
                        value={autoAssignmentForm.academic_year}
                        onChange={(e) => setAutoAssignmentForm({ ...autoAssignmentForm, academic_year: e.target.value })}
                        placeholder="2024-25"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto_dry_run"
                        checked={autoAssignmentForm.dry_run}
                        onChange={(e) => setAutoAssignmentForm({ ...autoAssignmentForm, dry_run: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="auto_dry_run">Dry Run (Preview only)</Label>
                    </div>

                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={autoAssignFeesMutation.isPending}
                    >
                      {autoAssignFeesMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {autoAssignmentForm.dry_run ? 'Preview Auto Assignment' : 'Execute Auto Assignment'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
    </div>
  );
};

export default AdminDashboard;
