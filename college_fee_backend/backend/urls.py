
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
    StudentNotificationsView, StudentMarkNotificationReadView, AdminReportsView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Authentication
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    # Student
    path('me/profile/', StudentProfileUpdateView.as_view(), name='student-profile'),
    path('me/dashboard/', StudentDashboardView.as_view()),
    path('invoices/', StudentInvoicesView.as_view()),
    path('invoices/<int:id>/', StudentInvoiceDetailView.as_view()),
    path('payments/', StudentPaymentsView.as_view()),
    path('payments/<int:payment_id>/receipt/', DownloadReceiptView.as_view(), name='download-receipt'),
    path('notifications/', StudentNotificationsView.as_view(), name='student-notifications'),
    path('notifications/<int:notification_id>/mark-read/', StudentMarkNotificationReadView.as_view(), name='student-mark-notification-read'),
    # Admin
    path('students/', AdminStudentsView.as_view()),
    path('students/<int:id>/', AdminStudentDetailView.as_view()),
    path('fee/components/', AdminFeeComponentsView.as_view(), name='admin-fee-components'),
    path('fee/components/<int:id>/', AdminFeeComponentDetailView.as_view(), name='admin-fee-component-detail'),
    path('fee/templates/', AdminFeeTemplatesView.as_view(), name='admin-fee-templates'),
    path('admin/fee-templates/<int:id>/', AdminFeeTemplateDetailView.as_view(), name='admin-fee-template-detail'),

    # Admin Fee Assignments
    path('admin/fee-assignments/', AdminFeeAssignmentsView.as_view(), name='admin-fee-assignments'),
    path('admin/fee-assignments/<int:id>/', AdminFeeAssignmentDetailView.as_view(), name='admin-fee-assignment-detail'),

    # Admin Invoices
    # Removed AdminInvoicesGenerateView as assignment now generates invoices
    path('admin/invoices/', AdminInvoicesView.as_view(), name='admin-invoices'),
    path('invoices/<int:id>/', AdminInvoiceDetailView.as_view()),
    path('payments/', AdminPaymentsView.as_view()),
    path('payments/offline/', AdminOfflinePaymentView.as_view()),
    # Admin Reports
    path('admin/reports/outstanding/', AdminReportsView.as_view(), name='admin-outstanding-reports'),
    # HOD
    path('hod/students/', HODStudentsView.as_view(), name='hod-students'),
    path('hod/reports/', HODReportsView.as_view()),
    # Stripe
    path('invoices/<int:id>/create-checkout-session/', CreateCheckoutSessionView.as_view()),
    path('webhooks/stripe/', StripeWebhookView.as_view()),
]
