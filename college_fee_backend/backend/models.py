from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils.translation import gettext_lazy as _
from django.utils import timezone

class UserManager(BaseUserManager):
        def create_user(self, email, password=None, **extra_fields):
            if not email:
                raise ValueError('The Email field must be set')
            email = self.normalize_email(email)
            user = self.model(email=email, **extra_fields)
            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save(using=self._db)
            return user
    
        def create_superuser(self, email, password=None, **extra_fields):
            extra_fields.setdefault('is_staff', True)
            extra_fields.setdefault('is_superuser', True)
            extra_fields.setdefault('role', 'admin')
            if not password:
                raise ValueError('Superuser must have a password')
            return self.create_user(email=email, password=password, **extra_fields)
            
class User(AbstractBaseUser):
         ROLE_CHOICES = (
             ('student', 'Student'),
             ('admin', 'Admin'),
             ('hod', 'HOD'),
         )

         email = models.EmailField(unique=True)
         role = models.CharField(max_length=10, choices=ROLE_CHOICES)
         is_active = models.BooleanField(default=True)
         is_staff = models.BooleanField(default=False)
         is_superuser = models.BooleanField(default=False)
         date_joined = models.DateTimeField(default=timezone.now)

         objects = UserManager()

         USERNAME_FIELD = 'email'
         REQUIRED_FIELDS = ['role']

         def __str__(self):
             return self.email

         def has_perm(self, perm, obj=None):
             return self.is_superuser

         def has_module_perms(self, app_label):
             return self.is_superuser

class StudentProfile(models.Model):
         STATUS_CHOICES = (
             ('active', 'Active'),
             ('backlog', 'Backlog'),
             ('yearback', 'Yearback'),
             ('dropout', 'Dropout'),
         )

         ADMISSION_MODE_CHOICES = (
             ('kcet', 'KCET'),
             ('comedk', 'COMED-K'),
             ('management', 'Management'),
             ('jee', 'JEE'),
             ('diploma', 'Diploma'),
             ('lateral', 'Lateral Entry'),
             ('other', 'Other'),
         )

         user = models.OneToOneField(User, on_delete=models.CASCADE)
         name = models.CharField(max_length=255)
         usn = models.CharField(max_length=50, unique=True, blank=True, null=True)
         dept = models.CharField(max_length=100)
         semester = models.IntegerField()
         batch = models.CharField(max_length=50, blank=True, null=True)  # e.g., "2020–2024"
         section = models.CharField(max_length=1, blank=True, null=True)  # e.g., "A"
         date_of_admission = models.DateField(blank=True, null=True)
         is_active = models.BooleanField(default=True)
         admission_mode = models.CharField(max_length=20, choices=ADMISSION_MODE_CHOICES, default='kcet')
         status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

         def __str__(self):
             return self.name

class FeeComponent(models.Model):
         name = models.CharField(max_length=100)
         amount = models.DecimalField(max_digits=10, decimal_places=2)

         def __str__(self):
             return self.name

class FeeTemplate(models.Model):
    FEE_TYPE_CHOICES = (
        ('annual', 'Annual'),
        ('semester', 'Semester'),
        ('one_time', 'One-time'),
    )

    name = models.CharField(max_length=255)
    admission_mode = models.CharField(max_length=20, choices=StudentProfile.ADMISSION_MODE_CHOICES, blank=True, null=True)
    dept = models.CharField(max_length=100, blank=True, null=True)  # Optional - for branch-specific templates
    fee_type = models.CharField(max_length=20, choices=FEE_TYPE_CHOICES, default='annual')
    academic_year = models.CharField(max_length=20, default='2024-25')  # e.g., "2024-25"
    semester = models.IntegerField(null=True, blank=True)  # Optional - for semester-specific templates
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    components = models.ManyToManyField(FeeComponent, through='FeeTemplateComponent')

    def __str__(self):
        dept_info = f" ({self.dept})" if self.dept else ""
        admission_info = f" - {self.get_admission_mode_display()}" if self.admission_mode else ""
        return f"{self.name}{dept_info}{admission_info} - {self.academic_year}"

    def save(self, *args, **kwargs):
        # Auto-calculate total amount from components
        if self.pk:  # Only calculate if template already exists
            total = 0
            for ft_component in self.feetemplatecomponent_set.all():
                amount = ft_component.amount_override if ft_component.amount_override is not None else ft_component.component.amount
                total += amount
            self.total_amount = total
        super().save(*args, **kwargs)

class FeeTemplateComponent(models.Model):
         template = models.ForeignKey(FeeTemplate, on_delete=models.CASCADE)
         component = models.ForeignKey(FeeComponent, on_delete=models.CASCADE)
         amount_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

class FeeAssignment(models.Model):
    ASSIGNMENT_TYPE_CHOICES = (
        ('bulk', 'Bulk Assignment'),
        ('individual', 'Individual Assignment'),
        ('auto', 'Auto Assignment'),
    )

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    template = models.ForeignKey(FeeTemplate, on_delete=models.CASCADE)
    assignment_type = models.CharField(max_length=20, choices=ASSIGNMENT_TYPE_CHOICES, default='individual')
    academic_year = models.CharField(max_length=20, default='2024-25')
    overrides = models.JSONField(default=dict)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    assigned_at = models.DateTimeField(default=timezone.now)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ['student', 'academic_year']  # One assignment per student per year

    def __str__(self):
        return f"{self.student.name} - {self.template.name} ({self.academic_year})"

class Invoice(models.Model):
    INVOICE_TYPE_CHOICES = (
        ('annual', 'Annual Fee'),
        ('semester', 'Semester Fee'),
        ('one_time', 'One-time Fee'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('cancelled', 'Cancelled'),
    )

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    assignment = models.ForeignKey(FeeAssignment, on_delete=models.CASCADE, null=True, blank=True)
    invoice_type = models.CharField(max_length=20, choices=INVOICE_TYPE_CHOICES, default='annual')
    academic_year = models.CharField(max_length=20, default='2024-25')
    semester = models.IntegerField(null=True, blank=True)  # Optional for annual fees
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    due_date = models.DateField()
    invoice_number = models.CharField(max_length=20, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.invoice_number:
            # Generate invoice number if not provided
            last_invoice = Invoice.objects.order_by('-id').first()
            if last_invoice:
                last_num = int(last_invoice.invoice_number.replace('INV', '')) if last_invoice.invoice_number else 0
                self.invoice_number = f"INV{(last_num + 1):06d}"
            else:
                self.invoice_number = "INV000001"
        super().save(*args, **kwargs)

class InvoiceComponent(models.Model):
    """Track individual fee component payments within an invoice"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='components')
    component_name = models.CharField(max_length=100)
    component_amount = models.DecimalField(max_digits=10, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    balance_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    def save(self, *args, **kwargs):
        if not self.balance_amount:
            self.balance_amount = self.component_amount
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.component_name} - {self.invoice.invoice_number}"

class Payment(models.Model):
         MODE_CHOICES = (
             ('stripe', 'Stripe'),
             ('cash', 'Cash'),
             ('dd', 'DD'),
             ('neft', 'NEFT'),
         )
         STATUS_CHOICES = (
             ('success', 'Success'),
             ('failed', 'Failed'),
             ('pending', 'Pending'),
         )

         invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE)
         amount = models.DecimalField(max_digits=10, decimal_places=2)
         mode = models.CharField(max_length=10, choices=MODE_CHOICES)
         transaction_id = models.CharField(max_length=255, blank=True)
         status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
         timestamp = models.DateTimeField(auto_now_add=True)
         payment_reference = models.CharField(max_length=50, unique=True, null=True, blank=True)

         def save(self, *args, **kwargs):
             if not self.payment_reference:
                 # Generate payment reference if not provided
                 last_payment = Payment.objects.order_by('-id').first()
                 if last_payment:
                     last_num = int(last_payment.payment_reference.replace('PAY', '')) if last_payment.payment_reference else 0
                     self.payment_reference = f"PAY{(last_num + 1):06d}"
                 else:
                     self.payment_reference = "PAY000001"
             super().save(*args, **kwargs)

class PaymentComponent(models.Model):
    """Track which components a payment covers"""
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='component_allocations')
    invoice_component = models.ForeignKey(InvoiceComponent, on_delete=models.CASCADE)
    amount_allocated = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"{self.payment.payment_reference} - {self.invoice_component.component_name}"

class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.user.email}: {self.message[:50]}..."

class CustomFeeStructure(models.Model):
    student = models.OneToOneField(StudentProfile, on_delete=models.CASCADE)
    components = models.JSONField(default=dict)  # Store fee breakdown as JSON
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Custom fees for {self.student.name}"

    def save(self, *args, **kwargs):
        # Auto-calculate total from components
        if self.components:
            total = sum(float(amount) for amount in self.components.values())
            self.total_amount = total
        super().save(*args, **kwargs)

class Receipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE)
    receipt_number = models.CharField(max_length=20, unique=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    generated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Receipt {self.receipt_number} for {self.payment.amount}"
    
    class Meta:
        ordering = ['-generated_at']