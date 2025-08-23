from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
        def create_user(self, email, password=None, **extra_fields):
            if not email:
                raise ValueError('The Email field must be set')
            email = self.normalize_email(email)
            user = self.model(email=email, **extra_fields)
            user.set_password(password)
            user.save(using=self._db)
            return user
    
        def create_superuser(self, email, password=None, **extra_fields):
            extra_fields.setdefault('is_staff', True)
            extra_fields.setdefault('is_superuser', True)
            extra_fields.setdefault('role', 'admin')
            return self.create_user(email=email, **extra_fields)
            
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

         user = models.OneToOneField(User, on_delete=models.CASCADE)
         name = models.CharField(max_length=255)
         usn = models.CharField(max_length=50, unique=True)
         dept = models.CharField(max_length=100)
         semester = models.IntegerField()
         status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')

         def __str__(self):
             return self.name

class FeeComponent(models.Model):
         name = models.CharField(max_length=100)
         amount = models.DecimalField(max_digits=10, decimal_places=2)

         def __str__(self):
             return self.name

class FeeTemplate(models.Model):
         name = models.CharField(max_length=255)
         dept = models.CharField(max_length=100)
         semester = models.IntegerField()
         components = models.ManyToManyField(FeeComponent, through='FeeTemplateComponent')

         def __str__(self):
             return self.name

class FeeTemplateComponent(models.Model):
         template = models.ForeignKey(FeeTemplate, on_delete=models.CASCADE)
         component = models.ForeignKey(FeeComponent, on_delete=models.CASCADE)
         amount_override = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

class FeeAssignment(models.Model):
         student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
         template = models.ForeignKey(FeeTemplate, on_delete=models.CASCADE)
         overrides = models.JSONField(default=dict)

class Invoice(models.Model):
         STATUS_CHOICES = (
             ('pending', 'Pending'),
             ('partial', 'Partial'),
             ('paid', 'Paid'),
             ('overdue', 'Overdue'),
         )

         student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
         semester = models.IntegerField()
         total_amount = models.DecimalField(max_digits=10, decimal_places=2)
         paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
         balance_amount = models.DecimalField(max_digits=10, decimal_places=2)
         status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
         due_date = models.DateField()
         invoice_number = models.CharField(max_length=20, unique=True, null=True, blank=True)

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