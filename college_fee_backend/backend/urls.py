
from django.contrib import admin
from django.urls import path
from .views import (
    LoginView, RegisterView, LogoutView, MeView,
    StudentDashboardView, StudentInvoicesView, StudentInvoiceDetailView, StudentPaymentsView,
    AdminStudentsView, AdminStudentDetailView,
    AdminFeeComponentsView, AdminFeeComponentDetailView,
    AdminFeeTemplatesView, AdminFeeTemplateDetailView,
    AdminFeeAssignmentsView, AdminFeeAssignmentDetailView, AdminInvoicesView, AdminInvoiceDetailView,
    AdminPaymentsView, AdminOfflinePaymentView, HODStudentsView, HODReportsView,
    CreateCheckoutSessionView, StripeWebhookView, StudentProfileUpdateView, DownloadReceiptView,
    StudentNotificationsView, StudentMarkNotificationReadView, AdminReportsView,
    AdminCustomFeeStructureView, AdminStudentFeeProfileView, AdminStudentStatusDashboardView, AdminCollectionsReportView,
    StudentProfileEditView, StudentReceiptsView, AdminIndividualFeeAssignmentView, AdminStudentFeeBreakdownView
)
from django.http import JsonResponse

urlpatterns = [
    # Test endpoint - Put this first to see if Django loads any custom URLs
    path('test/', lambda request: JsonResponse({'message': 'Test endpoint working'})),
    
    # Authentication - Put these first
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/token/refresh/', LoginView.as_view(), name='token-refresh'),
    
    # Student endpoints - Put these before admin
    path('api/student/profile/', StudentProfileUpdateView.as_view(), name='student-profile'),
    path('api/student/profile/edit/', StudentProfileEditView.as_view(), name='student-profile-edit'),
    path('api/student/dashboard/', StudentDashboardView.as_view()),
    path('api/student/receipts/', StudentReceiptsView.as_view(), name='student-receipts'),
    path('invoices/', StudentInvoicesView.as_view()),
    path('invoices/<int:id>/', StudentInvoiceDetailView.as_view()),
    path('api/student/payments/', StudentPaymentsView.as_view()),
    path('api/student/payments/<int:payment_id>/receipt/', DownloadReceiptView.as_view(), name='download-receipt'),
    path('notifications/', StudentNotificationsView.as_view(), name='student-notifications'),
    path('notifications/<int:notification_id>/mark-read/', StudentMarkNotificationReadView.as_view(), name='student-mark-notification-read'),
    
    # Admin endpoints
    path('students/', AdminStudentsView.as_view()),
    path('students/<int:id>/', AdminStudentDetailView.as_view()),
    path('fee/components/', AdminFeeComponentsView.as_view(), name='admin-fee-components'),
    path('fee/components/<int:id>/', AdminFeeComponentDetailView.as_view(), name='admin-fee-component-detail'),
    path('fee/templates/', AdminFeeTemplatesView.as_view(), name='admin-fee-templates'),
    path('admin/fee-templates/<int:id>/', AdminFeeTemplateDetailView.as_view(), name='admin-fee-template-detail'),

    # Admin Fee Assignments
    path('admin/fee-assignments/', AdminFeeAssignmentsView.as_view(), name='admin-fee-assignments'),
    path('admin/fee-assignments/<int:id>/', AdminFeeAssignmentDetailView.as_view(), name='admin-fee-assignment-detail'),

    # Admin Individual Fee Assignment (NEW)
    path('admin/students/<int:student_id>/individual-fees/', AdminIndividualFeeAssignmentView.as_view(), name='admin-individual-fee-assignment'),
    path('admin/students/<int:student_id>/fee-breakdown/', AdminStudentFeeBreakdownView.as_view(), name='admin-student-fee-breakdown'),

    # Admin Invoices
    path('admin/invoices/', AdminInvoicesView.as_view(), name='admin-invoices'),
    path('invoices/<int:id>/', AdminInvoiceDetailView.as_view()),
    path('payments/', AdminPaymentsView.as_view()),
    path('payments/offline/', AdminOfflinePaymentView.as_view()),
    
    # Admin Reports
    path('admin/reports/outstanding/', AdminReportsView.as_view(), name='admin-outstanding-reports'),
    path('admin/reports/collections/', AdminCollectionsReportView.as_view(), name='admin-collections-reports'),
    
    # Admin Student Fee Management
    path('admin/students/<int:student_id>/fee-profile/', AdminStudentFeeProfileView.as_view(), name='admin-student-fee-profile'),
    path('admin/students/<int:student_id>/custom-fees/', AdminCustomFeeStructureView.as_view(), name='admin-custom-fee-structure'),
    path('admin/student-status-dashboard/', AdminStudentStatusDashboardView.as_view(), name='admin-student-status-dashboard'),

    # HOD endpoints
    path('hod/students/', HODStudentsView.as_view(), name='hod-students'),
    path('hod/reports/', HODReportsView.as_view()),
    
    # Stripe endpoints
    path('invoices/<int:id>/create-checkout-session/', CreateCheckoutSessionView.as_view()),
    path('webhooks/stripe/', StripeWebhookView.as_view()),
    
    # Django Admin - Put this last to prevent conflicts
    path('admin/', admin.site.urls),
]
