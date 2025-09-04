from django.contrib import admin
from .models import (
    User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, 
    FeeAssignment, Invoice, InvoiceComponent, Payment, PaymentComponent, 
    Notification, CustomFeeStructure, Receipt
)

class FeeTemplateComponentInline(admin.TabularInline):
    model = FeeTemplateComponent
    extra = 1
    fields = ('component', 'amount_override')
    readonly_fields = ('component_amount',)

    def component_amount(self, obj):
        return obj.component.amount if obj.component else 0
    component_amount.short_description = 'Default Amount'

class StudentProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Profile'
    fields = ('name', 'usn', 'dept', 'semester', 'admission_mode', 'status')
    extra = 0

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('email', 'student_profile__name', 'student_profile__usn')
    ordering = ('-date_joined',)

    # Fields to display in the admin form
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal info', {'fields': ('role',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )

    # Fields to display when adding a new user
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'role', 'password1', 'password2', 'is_active', 'is_staff', 'is_superuser'),
        }),
    )

    filter_horizontal = ()

    def get_inlines(self, request, obj=None):
        if obj and obj.role == 'student':
            return [StudentProfileInline]
        return []

    def get_form(self, request, obj=None, **kwargs):
        # Get the default form
        form = super().get_form(request, obj, **kwargs)
        
        # If editing an existing user with student role, make sure StudentProfile exists
        if obj and obj.role == 'student':
            from .models import StudentProfile
            if not StudentProfile.objects.filter(user=obj).exists():
                # This shouldn't happen due to save_model, but just in case
                StudentProfile.objects.create(
                    user=obj,
                    name=obj.email.split('@')[0],
                    usn=None,
                    dept='',
                    semester=1,
                    admission_mode='regular',
                    status='active'
                )
        
        return form

    def save_model(self, request, obj, form, change):
        # Hash the password if it's being set
        if 'password' in form.changed_data or not change:
            obj.set_password(obj.password)
        
        # Handle role changes for StudentProfile management
        if change:  # Only for existing users
            old_obj = User.objects.get(pk=obj.pk)
            old_role = old_obj.role
            
            # If role changed from student to something else, delete StudentProfile
            if old_role == 'student' and obj.role != 'student':
                from .models import StudentProfile
                StudentProfile.objects.filter(user=obj).delete()
            
            # If role changed to student from something else, create StudentProfile
            elif old_role != 'student' and obj.role == 'student':
                from .models import StudentProfile
                if not StudentProfile.objects.filter(user=obj).exists():
                    StudentProfile.objects.create(
                        user=obj,
                        name=obj.email.split('@')[0],  # Default name from email
                        usn=None,  # Will be filled later
                        dept='',  # Will need to be filled later
                        semester=1,
                        admission_mode='regular',
                        status='active'
                    )
        
        super().save_model(request, obj, form, change)

        # Create StudentProfile for new users with student role
        if not change and obj.role == 'student':
            from .models import StudentProfile
            if not StudentProfile.objects.filter(user=obj).exists():
                StudentProfile.objects.create(
                    user=obj,
                    name=obj.email.split('@')[0],  # Default name from email
                    usn=None,  # Will be filled later
                    dept='',  # Will need to be filled later
                    semester=1,
                    admission_mode='regular',
                    status='active'
                )

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('name', 'usn', 'user_email', 'dept', 'semester', 'admission_mode', 'status')
    list_filter = ('dept', 'semester', 'admission_mode', 'status')
    search_fields = ('name', 'usn', 'user__email')
    ordering = ('name',)
    readonly_fields = ('user',)

    fieldsets = (
        ('User Information', {'fields': ('user', 'name', 'usn')}),
        ('Academic Information', {'fields': ('dept', 'semester', 'admission_mode')}),
        ('Status', {'fields': ('status',)}),
    )

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    user_email.admin_order_field = 'user__email'

@admin.register(FeeComponent)
class FeeComponentAdmin(admin.ModelAdmin):
    list_display = ('name', 'amount')
    search_fields = ('name',)
    ordering = ('name',)

@admin.register(FeeTemplate)
class FeeTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'admission_mode', 'dept', 'fee_type', 'academic_year', 'total_amount', 'is_active', 'component_count')
    list_filter = ('admission_mode', 'dept', 'fee_type', 'academic_year', 'is_active')
    search_fields = ('name', 'dept', 'admission_mode')
    ordering = ('name',)
    readonly_fields = ('total_amount',)
    inlines = [FeeTemplateComponentInline]

    fieldsets = (
        ('Template Information', {'fields': ('name', 'admission_mode', 'dept', 'fee_type', 'academic_year', 'is_active')}),
        ('Calculated Fields', {'fields': ('total_amount',)}),
    )

    def component_count(self, obj):
        return obj.feetemplatecomponent_set.count()
    component_count.short_description = 'Components'

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Update total_amount based on components
        total = sum(component.amount_override or component.component.amount
                   for component in obj.feetemplatecomponent_set.all())
        if obj.total_amount != total:
            obj.total_amount = total
            obj.save(update_fields=['total_amount'])

@admin.register(FeeTemplateComponent)
class FeeTemplateComponentAdmin(admin.ModelAdmin):
    list_display = ('template', 'component', 'amount_override')
    list_filter = ('template__admission_mode', 'template__dept', 'template__fee_type')
    search_fields = ('template__name', 'component__name')

@admin.register(FeeAssignment)
class FeeAssignmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'template', 'assignment_type', 'academic_year', 'assigned_at', 'is_active')
    list_filter = ('assignment_type', 'academic_year', 'template__admission_mode', 'template__dept', 'is_active')
    search_fields = ('student__name', 'student__usn', 'template__name')
    ordering = ('-assigned_at',)

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_number', 'student', 'invoice_type', 'academic_year', 'total_amount', 'paid_amount', 'balance_amount', 'status', 'due_date')
    list_filter = ('status', 'invoice_type', 'academic_year', 'student__dept', 'student__admission_mode')
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