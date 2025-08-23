from django.contrib import admin
from .models import (
    User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, 
    FeeAssignment, Invoice, InvoiceComponent, Payment, PaymentComponent, 
    Notification, CustomFeeStructure, Receipt
)

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_active', 'is_staff', 'is_superuser')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    search_fields = ('email',)
    ordering = ('email',)

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'usn', 'dept', 'semester', 'status', 'user')
    list_filter = ('dept', 'semester', 'status')
    search_fields = ('name', 'usn', 'user__email')
    ordering = ('name',)

@admin.register(FeeComponent)
class FeeComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(FeeTemplate)
class FeeTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'dept', 'semester')
    list_filter = ('dept', 'semester')
    search_fields = ('name', 'dept')
    ordering = ('name',)

@admin.register(FeeTemplateComponent)
class FeeTemplateComponentAdmin(admin.ModelAdmin):
    list_display = ('template', 'component', 'amount_override')
    list_filter = ('template__dept', 'template__semester')
    search_fields = ('template__name', 'component__name')

@admin.register(FeeAssignment)
class FeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'template', 'overrides')
    list_filter = ('template__dept', 'template__semester')
    search_fields = ('student__name', 'student__usn', 'template__name')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'student', 'semester', 'total_amount', 'paid_amount', 'balance_amount', 'status', 'due_date')
    list_filter = ('status', 'semester', 'student__dept')
    search_fields = ('invoice_number', 'student__name', 'student__usn')
    ordering = ('-due_date',)
    readonly_fields = ('invoice_number',)

@admin.register(InvoiceComponent)
class InvoiceComponentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'component_name', 'component_amount', 'paid_amount', 'balance_amount')
    list_filter = ('invoice__status', 'invoice__semester')
    search_fields = ('component_name', 'invoice__invoice_number')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_reference', 'invoice', 'amount', 'mode', 'status', 'timestamp')
    list_filter = ('status', 'mode', 'invoice__semester')
    search_fields = ('payment_reference', 'transaction_id', 'invoice__student__name')
    ordering = ('-timestamp',)
    readonly_fields = ('payment_reference',)

@admin.register(PaymentComponent)
class PaymentComponentAdmin(admin.ModelAdmin):
    list_display = ('payment', 'invoice_component', 'amount_allocated')
    list_filter = ('payment__mode', 'payment__status')
    search_fields = ('payment__payment_reference', 'invoice_component__component_name')

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'message', 'is_read', 'created_at')
    list_filter = ('is_read', 'created_at')
    search_fields = ('user__email', 'message')
    ordering = ('-created_at',)

@admin.register(CustomFeeStructure)
class CustomFeeStructureAdmin(admin.ModelAdmin):
    list_display = ('student', 'total_amount', 'created_at', 'updated_at')
    list_filter = ('student__dept', 'student__semester')
    search_fields = ('student__name', 'student__usn')
    readonly_fields = ('created_at', 'updated_at')

@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_number', 'payment', 'amount', 'generated_at')
    list_filter = ('generated_at',)
    search_fields = ('receipt_number', 'payment__payment_reference')
    ordering = ('-generated_at',)
    readonly_fields = ('receipt_number',)