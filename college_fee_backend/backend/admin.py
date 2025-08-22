from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment, Invoice, Payment

class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('email',)
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )
    # Explicitly disable filter_horizontal to avoid referencing non-existent fields
    filter_horizontal = ()

class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'usn', 'dept', 'semester', 'status', 'user')
    list_filter = ('dept', 'semester', 'status')
    search_fields = ('name', 'usn')
    ordering = ('name',)

class FeeComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount')
    search_fields = ('name',)
    ordering = ('name',)

class FeeTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'dept', 'semester')
    list_filter = ('dept', 'semester')
    search_fields = ('name',)
    ordering = ('name',)

class FeeTemplateComponentAdmin(admin.ModelAdmin):
    list_display = ('template', 'component', 'amount_override')
    list_filter = ('template',)
    search_fields = ('template__name', 'component__name')
    ordering = ('template',)

class FeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'template')
    list_filter = ('template',)
    search_fields = ('student__name', 'student__usn', 'template__name')
    ordering = ('student',)

class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('student', 'semester', 'total_amount', 'paid_amount', 'balance_amount', 'status', 'due_date')
    list_filter = ('semester', 'status')
    search_fields = ('student__name', 'student__usn')
    ordering = ('due_date',)

class PaymentAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'amount', 'mode', 'status', 'timestamp')
    list_filter = ('mode', 'status')
    search_fields = ('invoice__student__name', 'invoice__student__usn')
    ordering = ('timestamp',)

admin.site.register(User, UserAdmin)
admin.site.register(StudentProfile, StudentProfileAdmin)
admin.site.register(FeeComponent, FeeComponentAdmin)
admin.site.register(FeeTemplate, FeeTemplateAdmin)
admin.site.register(FeeTemplateComponent, FeeTemplateComponentAdmin)
admin.site.register(FeeAssignment, FeeAssignmentAdmin)
admin.site.register(Invoice, InvoiceAdmin)
admin.site.register(Payment, PaymentAdmin)