import os
from pathlib import Path

# Define the root directory for the project
project_root = 'college_fee_backend'
os.makedirs(project_root, exist_ok=True)

# Create .env file
env_content = """
# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# JWT
SECRET_KEY=your_django_secret_key
"""
with open(os.path.join(project_root, '.env'), 'w') as f:
    f.write(env_content)

# Create manage.py
manage_content = """#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "backend.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)
"""
with open(os.path.join(project_root, 'manage.py'), 'w') as f:
    f.write(manage_content)
os.chmod(os.path.join(project_root, 'manage.py'), 0o755)

# Create backend directory (the project package)
backend_dir = os.path.join(project_root, 'backend')
os.makedirs(backend_dir, exist_ok=True)

# Create __init__.py for backend
with open(os.path.join(backend_dir, '__init__.py'), 'w') as f:
    pass

# Create settings.py
settings_content = """
import os
from pathlib import Path
from dotenv import load_dotenv
from datetime import timedelta

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv('SECRET_KEY')

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=5),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
}

STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')

AUTH_USER_MODEL = 'backend.User'
"""
with open(os.path.join(backend_dir, 'settings.py'), 'w') as f:
    f.write(settings_content)

# Create models.py
models_content = """
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
        return self.create_user(email, password, **extra_fields)

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
"""
with open(os.path.join(backend_dir, 'models.py'), 'w') as f:
    f.write(models_content)

# Create stripe_service.py
stripe_service_content = """
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session(invoice_id, amount):
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': f'Invoice {invoice_id}',
                },
                'unit_amount': int(amount * 100),
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url='https://yourdomain.com/success',
        cancel_url='https://yourdomain.com/cancel',
        metadata={'invoice_id': invoice_id}
    )
    return session
"""
with open(os.path.join(backend_dir, 'stripe_service.py'), 'w') as f:
    f.write(stripe_service_content)

# Create views.py
views_content = """
import stripe
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, Q
from datetime import datetime
from .models import User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment, Invoice, Payment
from django.utils.decorators import method_decorator

# Custom permissions
class IsStudentUser(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.role == 'student'

class IsHODUser(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.role == 'hod'

# Authentication views
class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(email=email, password=password)
        if user and user.is_active:
            refresh = RefreshToken.for_user(user)
            return JsonResponse({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        return JsonResponse({'error': 'Invalid credentials'}, status=400)

class RegisterView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role')
        try:
            user = User.objects.create_user(email=email, password=password, role=role)
            return JsonResponse({
                'id': user.id,
                'email': user.email,
                'role': user.role,
                'is_active': user.is_active
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return JsonResponse({'detail': 'Successfully logged out.'})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {'id': user.id, 'email': user.email, 'role': user.role}
        if user.role == 'student':
            try:
                profile = StudentProfile.objects.get(user=user)
                data.update({
                    'name': profile.name,
                    'usn': profile.usn,
                    'dept': profile.dept,
                    'semester': profile.semester,
                    'status': profile.status
                })
            except StudentProfile.DoesNotExist:
                return JsonResponse({'error': 'Student profile not found'}, status=404)
        return JsonResponse(data)

# Student views
class StudentDashboardView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            dues = Invoice.objects.filter(student=student).aggregate(total_due=Sum('balance_amount'))['total_due'] or 0
            return JsonResponse({
                'student': {
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester,
                    'status': student.status
                },
                'dues': float(dues)
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class StudentInvoicesView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            invoices = Invoice.objects.filter(student=student)
            return JsonResponse({
                'invoices': [{
                    'id': inv.id,
                    'semester': inv.semester,
                    'total_amount': float(inv.total_amount),
                    'paid_amount': float(inv.paid_amount),
                    'balance_amount': float(inv.balance_amount),
                    'status': inv.status,
                    'due_date': inv.due_date.isoformat()
                } for inv in invoices]
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class StudentInvoiceDetailView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request, id):
        try:
            student = StudentProfile.objects.get(user=request.user)
            invoice = Invoice.objects.get(id=id, student=student)
            payments = Payment.objects.filter(invoice=invoice)
            return JsonResponse({
                'id': invoice.id,
                'semester': invoice.semester,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'status': invoice.status,
                'due_date': invoice.due_date.isoformat(),
                'payments': [{
                    'id': p.id,
                    'amount': float(p.amount),
                    'mode': p.mode,
                    'status': p.status,
                    'timestamp': p.timestamp.isoformat()
                } for p in payments]
            })
        except (StudentProfile.DoesNotExist, Invoice.DoesNotExist):
            return JsonResponse({'error': 'Invoice or profile not found'}, status=404)

class StudentPaymentsView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            payments = Payment.objects.filter(invoice__student=student)
            return JsonResponse({
                'payments': [{
                    'id': p.id,
                    'invoice_id': p.invoice.id,
                    'amount': float(p.amount),
                    'mode': p.mode,
                    'status': p.status,
                    'timestamp': p.timestamp.isoformat()
                } for p in payments]
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

# Admin views
class AdminStudentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        query = request.GET.get('query')
        students = StudentProfile.objects.all()
        if query:
            students = students.filter(Q(name__icontains=query) | Q(usn__icontains=query))
        return JsonResponse({
            'students': [{
                'id': s.id,
                'name': s.name,
                'usn': s.usn,
                'dept': s.dept,
                'semester': s.semester,
                'status': s.status
            } for s in students]
        })

    def post(self, request):
        try:
            user = User.objects.create_user(
                email=request.data.get('email'),
                password=request.data.get('password'),
                role='student'
            )
            student = StudentProfile.objects.create(
                user=user,
                name=request.data.get('name'),
                usn=request.data.get('usn'),
                dept=request.data.get('dept'),
                semester=request.data.get('semester'),
                status=request.data.get('status', 'active')
            )
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'status': student.status
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminStudentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, id):
        try:
            student = StudentProfile.objects.get(id=id)
            for key, value in request.data.items():
                if key in ['name', 'usn', 'dept', 'semester', 'status']:
                    setattr(student, key, value)
            student.save()
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'status': student.status
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)

class AdminFeeComponentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        components = FeeComponent.objects.all()
        return JsonResponse({
            'components': [{
                'id': c.id,
                'name': c.name,
                'amount': float(c.amount)
            } for c in components]
        })

    def post(self, request):
        try:
            component = FeeComponent.objects.create(
                name=request.data.get('name'),
                amount=request.data.get('amount')
            )
            return JsonResponse({
                'id': component.id,
                'name': component.name,
                'amount': float(component.amount)
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminFeeComponentDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, id):
        try:
            component = FeeComponent.objects.get(id=id)
            for key, value in request.data.items():
                if key in ['name', 'amount']:
                    setattr(component, key, value)
            component.save()
            return JsonResponse({
                'id': component.id,
                'name': component.name,
                'amount': float(component.amount)
            })
        except FeeComponent.DoesNotExist:
            return JsonResponse({'error': 'Fee component not found'}, status=404)

class AdminFeeTemplatesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        templates = FeeTemplate.objects.all()
        return JsonResponse({
            'templates': [{
                'id': t.id,
                'name': t.name,
                'dept': t.dept,
                'semester': t.semester,
                'components': [{
                    'id': c.component.id,
                    'name': c.component.name,
                    'amount': float(c.amount_override or c.component.amount)
                } for c in t.feetemplatecomponent_set.all()]
            } for t in templates]
        })

    def post(self, request):
        try:
            template = FeeTemplate.objects.create(
                name=request.data.get('name'),
                dept=request.data.get('dept'),
                semester=request.data.get('semester')
            )
            for comp_data in request.data.get('components', []):
                component = FeeComponent.objects.get(id=comp_data['id'])
                FeeTemplateComponent.objects.create(
                    template=template,
                    component=component,
                    amount_override=comp_data.get('amount_override')
                )
            return JsonResponse({
                'id': template.id,
                'name': template.name,
                'dept': template.dept,
                'semester': template.semester
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminFeeTemplateDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, id):
        try:
            template = FeeTemplate.objects.get(id=id)
            for key, value in request.data.items():
                if key in ['name', 'dept', 'semester']:
                    setattr(template, key, value)
            template.save()
            return JsonResponse({
                'id': template.id,
                'name': template.name,
                'dept': template.dept,
                'semester': template.semester
            })
        except FeeTemplate.DoesNotExist:
            return JsonResponse({'error': 'Fee template not found'}, status=404)

class AdminFeeAssignmentsView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            assignment = FeeAssignment.objects.create(
                student=StudentProfile.objects.get(id=request.data.get('student_id')),
                template=FeeTemplate.objects.get(id=request.data.get('template_id')),
                overrides=request.data.get('overrides', {})
            )
            return JsonResponse({
                'id': assignment.id,
                'student_id': assignment.student.id,
                'template_id': assignment.template.id,
                'overrides': assignment.overrides
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    def patch(self, request, id):
        try:
            assignment = FeeAssignment.objects.get(id=id)
            for key, value in request.data.items():
                if key in ['student_id', 'template_id', 'overrides']:
                    if key == 'student_id':
                        assignment.student = StudentProfile.objects.get(id=value)
                    elif key == 'template_id':
                        assignment.template = FeeTemplate.objects.get(id=value)
                    else:
                        assignment.overrides = value
            assignment.save()
            return JsonResponse({
                'id': assignment.id,
                'student_id': assignment.student.id,
                'template_id': assignment.template.id,
                'overrides': assignment.overrides
            })
        except FeeAssignment.DoesNotExist:
            return JsonResponse({'error': 'Fee assignment not found'}, status=404)

class AdminInvoicesGenerateView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            semester = request.data.get('semester')
            students = StudentProfile.objects.filter(semester=semester)
            for student in students:
                assignment = FeeAssignment.objects.filter(student=student).first()
                if assignment:
                    total = sum(
                        c.amount_override or c.component.amount
                        for c in assignment.template.feetemplatecomponent_set.all()
                    )
                    overrides = assignment.overrides
                    for key, value in overrides.items():
                        total += value
                    Invoice.objects.create(
                        student=student,
                        semester=semester,
                        total_amount=total,
                        balance_amount=total,
                        due_date=request.data.get('due_date')
                    )
            return JsonResponse({'detail': 'Invoices generated'}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminInvoicesView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        student_id = request.GET.get('student_id')
        sem = request.GET.get('sem')
        invoices = Invoice.objects.all()
        if student_id:
            invoices = invoices.filter(student_id=student_id)
        if sem:
            invoices = invoices.filter(semester=sem)
        return JsonResponse({
            'invoices': [{
                'id': inv.id,
                'student_id': inv.student.id,
                'semester': inv.semester,
                'total_amount': float(inv.total_amount),
                'paid_amount': float(inv.paid_amount),
                'balance_amount': float(inv.balance_amount),
                'status': inv.status,
                'due_date': inv.due_date.isoformat()
            } for inv in invoices]
        })

class AdminInvoiceDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, id):
        try:
            invoice = Invoice.objects.get(id=id)
            for key, value in request.data.items():
                if key in ['semester', 'total_amount', 'paid_amount', 'balance_amount', 'status', 'due_date']:
                    if key == 'due_date':
                        value = datetime.strptime(value, '%Y-%m-%d').date()
                    setattr(invoice, key, value)
            invoice.save()
            return JsonResponse({
                'id': invoice.id,
                'student_id': invoice.student.id,
                'semester': invoice.semester,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'status': invoice.status,
                'due_date': invoice.due_date.isoformat()
            })
        except Invoice.DoesNotExist:
            return JsonResponse({'error': 'Invoice not found'}, status=404)

class AdminPaymentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        student_id = request.GET.get('student_id')
        payments = Payment.objects.all()
        if student_id:
            payments = payments.filter(invoice__student_id=student_id)
        return JsonResponse({
            'payments': [{
                'id': p.id,
                'invoice_id': p.invoice.id,
                'amount': float(p.amount),
                'mode': p.mode,
                'status': p.status,
                'timestamp': p.timestamp.isoformat()
            } for p in payments]
        })

class AdminOfflinePaymentView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        try:
            invoice = Invoice.objects.get(id=request.data.get('invoice_id'))
            payment = Payment.objects.create(
                invoice=invoice,
                amount=request.data.get('amount'),
                mode=request.data.get('mode'),
                status='success',
                transaction_id=request.data.get('transaction_id', '')
            )
            invoice.paid_amount += payment.amount
            invoice.balance_amount -= payment.amount
            invoice.status = 'paid' if invoice.balance_amount <= 0 else 'partial'
            invoice.save()
            return JsonResponse({
                'id': payment.id,
                'invoice_id': payment.invoice.id,
                'amount': float(payment.amount),
                'mode': payment.mode,
                'status': payment.status,
                'timestamp': payment.timestamp.isoformat()
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

# HOD views
class HODStudentsView(APIView):
    permission_classes = [IsHODUser]

    def get(self, request):
        dept = request.GET.get('dept')
        sem = request.GET.get('sem')
        students = StudentProfile.objects.all()
        if dept:
            students = students.filter(dept=dept)
        if sem:
            students = students.filter(semester=sem)
        balances = []
        for student in students:
            balance = Invoice.objects.filter(student=student).aggregate(Sum('balance_amount'))['balance_amount__sum'] or 0
            balances.append({
                'student': student.usn,
                'balance': float(balance)
            })
        return JsonResponse({'balances': balances})

class HODReportsView(APIView):
    permission_classes = [IsHODUser]

    def get(self, request):
        dept = request.GET.get('dept')
        sem = request.GET.get('sem')
        collections = Payment.objects.filter(
            status='success',
            invoice__student__dept=dept,
            invoice__student__semester=sem
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        outstanding = Invoice.objects.filter(
            student__dept=dept,
            student__semester=sem
        ).aggregate(Sum('balance_amount'))['balance_amount__sum'] or 0
        return JsonResponse({
            'collections': float(collections),
            'outstanding': float(outstanding)
        })

# Stripe views
class CreateCheckoutSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        from .stripe_service import create_checkout_session
        try:
            invoice = Invoice.objects.get(id=id)
            student = StudentProfile.objects.get(user=request.user)
            if invoice.student != student:
                return JsonResponse({'error': 'Unauthorized'}, status=403)
            amount = request.data.get('amount', float(invoice.balance_amount))
            session = create_checkout_session(id, amount)
            payment = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                mode='stripe',
                transaction_id=session.id,
                status='pending'
            )
            return JsonResponse({'checkout_url': session.url})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except (ValueError, stripe.error.SignatureVerificationError):
            return HttpResponse(status=400)
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            try:
                payment = Payment.objects.get(transaction_id=session.id)
                payment.status = 'success'
                payment.save()
                invoice = payment.invoice
                invoice.paid_amount += payment.amount
                invoice.balance_amount -= payment.amount
                invoice.status = 'paid' if invoice.balance_amount <= 0 else 'partial'
                invoice.save()
            except Payment.DoesNotExist:
                return HttpResponse(status=400)
        return HttpResponse(status=200)
"""
with open(os.path.join(backend_dir, 'views.py'), 'w') as f:
    f.write(views_content)

# Create urls.py
urls_content = """
from django.contrib import admin
from django.urls import path
from .views import (
    LoginView, RegisterView, LogoutView, MeView,
    StudentDashboardView, StudentInvoicesView, StudentInvoiceDetailView, StudentPaymentsView,
    AdminStudentsView, AdminStudentDetailView, AdminFeeComponentsView, AdminFeeComponentDetailView,
    AdminFeeTemplatesView, AdminFeeTemplateDetailView, AdminFeeAssignmentsView,
    AdminInvoicesGenerateView, AdminInvoicesView, AdminInvoiceDetailView,
    AdminPaymentsView, AdminOfflinePaymentView, HODStudentsView, HODReportsView,
    CreateCheckoutSessionView, StripeWebhookView
)

urlpatterns = [
    path('admin/', admin.site.urls),
    # Authentication
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    # Student
    path('me/dashboard/', StudentDashboardView.as_view()),
    path('invoices/', StudentInvoicesView.as_view()),
    path('invoices/<int:id>/', StudentInvoiceDetailView.as_view()),
    path('payments/', StudentPaymentsView.as_view()),
    # Admin
    path('students/', AdminStudentsView.as_view()),
    path('students/<int:id>/', AdminStudentDetailView.as_view()),
    path('fee/components/', AdminFeeComponentsView.as_view()),
    path('fee/components/<int:id>/', AdminFeeComponentDetailView.as_view()),
    path('fee/templates/', AdminFeeTemplatesView.as_view()),
    path('fee/templates/<int:id>/', AdminFeeTemplateDetailView.as_view()),
    path('fee/assignments/', AdminFeeAssignmentsView.as_view()),
    path('fee/assignments/<int:id>/', AdminFeeAssignmentsView.as_view()),
    path('invoices/generate/', AdminInvoicesGenerateView.as_view()),
    path('invoices/', AdminInvoicesView.as_view()),
    path('invoices/<int:id>/', AdminInvoiceDetailView.as_view()),
    path('payments/', AdminPaymentsView.as_view()),
    path('payments/offline/', AdminOfflinePaymentView.as_view()),
    # HOD
    path('hod/students/', HODStudentsView.as_view()),
    path('hod/reports/', HODReportsView.as_view()),
    # Stripe
    path('invoices/<int:id>/create-checkout-session/', CreateCheckoutSessionView.as_view()),
    path('webhooks/stripe/', StripeWebhookView.as_view()),
]
"""
with open(os.path.join(backend_dir, 'urls.py'), 'w') as f:
    f.write(urls_content)

# Create wsgi.py
wsgi_content = """
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

application = get_wsgi_application()
"""
with open(os.path.join(backend_dir, 'wsgi.py'), 'w') as f:
    f.write(wsgi_content)

# Create requirements.txt
requirements_content = """
django>=3.1
djangorestframework
djangorestframework-simplejwt
python-dotenv
stripe
"""
with open(os.path.join(project_root, 'requirements.txt'), 'w') as f:
    f.write(requirements_content)

print(f"Project created at {project_root}. Install dependencies with pip install -r requirements.txt, then run python manage.py makemigrations, migrate, createsuperuser, and runserver.")