from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from backend.models import StudentProfile, FeeComponent, Invoice, CustomFeeStructure

User = get_user_model()

class Command(BaseCommand):
    help = 'Create test data for Stripe integration testing'

    def handle(self, *args, **options):
        self.stdout.write('Creating test data for Stripe integration...')
        
        # Create test student user
        email = 'teststudent@example.com'
        password = 'testpass123'
        
        # Check if user already exists
        if User.objects.filter(email=email).exists():
            self.stdout.write(f'Test user {email} already exists')
            user = User.objects.get(email=email)
        else:
            user = User.objects.create_user(
                email=email,
                password=password,
                role='student'
            )
            self.stdout.write(f'Created test user: {email}')
        
        # Create student profile
        student, created = StudentProfile.objects.get_or_create(
            user=user,
            defaults={
                'name': 'Test Student',
                'usn': 'TEST001',
                'dept': 'CSE',
                'semester': 3,
                'status': 'active'
            }
        )
        
        if created:
            self.stdout.write(f'Created student profile: {student.name}')
        else:
            self.stdout.write(f'Student profile already exists: {student.name}')
        
        # Create fee components
        fee_components = [
            {'name': 'Tuition Fee', 'amount': 50000.00},
            {'name': 'Lab Fee', 'amount': 5000.00},
            {'name': 'Library Fee', 'amount': 2000.00},
            {'name': 'Sports Fee', 'amount': 1000.00},
            {'name': 'Exam Fee', 'amount': 3000.00},
        ]
        
        for comp_data in fee_components:
            component, created = FeeComponent.objects.get_or_create(
                name=comp_data['name'],
                defaults={'amount': comp_data['amount']}
            )
            if created:
                self.stdout.write(f'Created fee component: {component.name}')
        
        # Create custom fee structure for the student
        components = {
            'Tuition Fee': '50000.00',
            'Lab Fee': '5000.00',
            'Library Fee': '2000.00',
            'Sports Fee': '1000.00',
            'Exam Fee': '3000.00'
        }
        
        custom_fees, created = CustomFeeStructure.objects.get_or_create(
            student=student,
            defaults={'components': components}
        )
        
        if created:
            self.stdout.write(f'Created custom fee structure for {student.name}')
        
        # Create invoice
        total_amount = sum(float(amount) for amount in components.values())
        due_date = datetime.now().date() + timedelta(days=30)  # 30 days from now
        
        invoice, created = Invoice.objects.get_or_create(
            student=student,
            semester=student.semester,
            defaults={
                'total_amount': total_amount,
                'paid_amount': 0,
                'balance_amount': total_amount,
                'status': 'pending',
                'due_date': due_date
            }
        )
        
        if created:
            self.stdout.write(f'Created invoice: ID {invoice.id}, Amount: ₹{total_amount}')
        else:
            self.stdout.write(f'Invoice already exists: ID {invoice.id}, Amount: ₹{invoice.total_amount}')
        
        # Create admin user
        admin_email = 'admin@example.com'
        admin_password = 'adminpass123'
        
        if User.objects.filter(email=admin_email).exists():
            self.stdout.write(f'Admin user {admin_email} already exists')
        else:
            admin_user = User.objects.create_user(
                email=admin_email,
                password=admin_password,
                role='admin',
                is_staff=True,
                is_superuser=True
            )
            self.stdout.write(f'Created admin user: {admin_email}')
        
        self.stdout.write(self.style.SUCCESS('\n✅ Test data created successfully!'))
        self.stdout.write(f'\n📋 Test Credentials:')
        self.stdout.write(f'   Student: {email} / {password}')
        self.stdout.write(f'   Admin:   {admin_email} / {admin_password}')
        self.stdout.write(f'\n📊 Test Data:')
        self.stdout.write(f'   Student: {student.name} ({student.usn})')
        self.stdout.write(f'   Invoice: ID {invoice.id} - ₹{invoice.total_amount}')
        self.stdout.write(f'   Balance: ₹{invoice.balance_amount}')
        self.stdout.write(f'\n🚀 Ready for Stripe testing!')
