
import stripe
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework_simplejwt.tokens import RefreshToken
from django.db.models import Sum, Q
from datetime import datetime, date
from django.template.loader import get_template
from django.http import HttpResponse
from xhtml2pdf import pisa
from rest_framework import generics, status
from rest_framework.response import Response
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

from .models import User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment, Invoice, InvoiceComponent, Payment, PaymentComponent, Notification, CustomFeeStructure, Receipt
from .serializers import LoginSerializer, UserSerializer, StudentProfileSerializer, NotificationSerializer, FeeComponentSerializer, FeeTemplateSerializer, FeeAssignmentSerializer
from django.utils.decorators import method_decorator


# Custom permissions
class IsStudentUser(IsAuthenticated):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'role') and request.user.role == 'student'

class IsHODUser(IsAuthenticated):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return hasattr(request.user, 'role') and request.user.role == 'hod'

# Authentication views
from django.utils.decorators import method_decorator

@method_decorator(csrf_exempt, name='dispatch')
class LoginView(generics.GenericAPIView):
    permission_classes = []
    serializer_class = LoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        user = authenticate(request, email=email, password=password)

        if user is not None:
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data,
            }, status=status.HTTP_200_OK)
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(APIView):
    permission_classes = []
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'student') # Default role is student
        name = request.data.get('name', '')
        usn = request.data.get('usn', '')
        dept = request.data.get('dept', '')
        semester = request.data.get('semester', 1)
        admission_mode = request.data.get('admission_mode', 'kcet')
        status = request.data.get('status', 'active')

        if not email or not password:
            return JsonResponse({'error': 'Please provide both email and password'}, status=400)

        try:
                if role == 'admin':
                    user = User.objects.create_user(email=email, password=password, role=role, is_staff=True, is_superuser=True)
                else:
                    user = User.objects.create_user(email=email, password=password, role=role)
                if role == 'student':
                    StudentProfile.objects.create(
                        user=user,
                        name=name,
                        usn=usn,
                        dept=dept,
                        semester=semester,
                        admission_mode=admission_mode,
                        status=status
                    )
                return JsonResponse({'message': 'User registered successfully'}, status=201)
        except ValueError as e:
            return JsonResponse({'error': str(e)}, status=400)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return JsonResponse({'detail': 'Successfully logged out.'})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data = {
            'id': user.id, 
            'email': user.email, 
            'role': user.role,
            'is_staff': user.is_staff,
            'is_superuser': user.is_superuser
        }
        if user.role == 'student':
            try:
                profile = StudentProfile.objects.get(user=user)
                data.update({
                    'name': profile.name,
                    'usn': profile.usn,
                    'dept': profile.dept,
                    'semester': profile.semester,
                    'admission_mode': profile.admission_mode,
                    'status': profile.status
                })
            except StudentProfile.DoesNotExist:
                return JsonResponse({'error': 'Student profile not found'}, status=404)
        return JsonResponse(data)

class StudentProfileUpdateView(generics.RetrieveUpdateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [IsStudentUser]

    def get_object(self):
        return self.request.user.studentprofile

    def perform_update(self, serializer):
        # Only allow updating specific fields like phone/email if they were added to the model
        # For now, we only update name, which is already in the serializer.
        serializer.save()

class StudentProfileEditView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
                'status': student.status,
                'email': request.user.email
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

    def patch(self, request):
        try:
            user = request.user
            student = StudentProfile.objects.get(user=user)
            
            # Update user email if provided
            if 'email' in request.data:
                user.email = request.data['email']
                user.save()
            
            # Update student profile fields
            allowed_fields = ['name']
            for field in allowed_fields:
                if field in request.data:
                    setattr(student, field, request.data[field])
            
            student.save()
            
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'status': student.status,
                'email': user.email
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

# Student views
class StudentDashboardView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            
            # Get custom fee structure if exists
            custom_fees = CustomFeeStructure.objects.filter(student=student).first()
            
            # Get all invoices for the student
            invoices = Invoice.objects.filter(student=student)
            total_fee = sum(float(inv.total_amount) for inv in invoices)
            paid_amount = sum(float(inv.paid_amount) for inv in invoices)
            balance_amount = sum(float(inv.balance_amount) for inv in invoices)
            
            # Calculate progress percentage
            progress_percentage = (paid_amount / total_fee * 100) if total_fee > 0 else 0
            
            # Get recent payments
            recent_payments = Payment.objects.filter(
                invoice__student=student
            ).order_by('-timestamp')[:5]
            
            # Get recent notifications
            recent_notifications = Notification.objects.filter(
                user=request.user
            ).order_by('-created_at')[:3]
            
            # Fee breakdown
            fee_breakdown = {}
            if custom_fees:
                fee_breakdown = custom_fees.components
            else:
                # Fallback to template-based fees
                fee_assignments = FeeAssignment.objects.filter(student=student)
                for assignment in fee_assignments:
                    template = assignment.template
                    for ft_component in template.feetemplatecomponent_set.all():
                        component_name = ft_component.component.name
                        amount = ft_component.amount_override if ft_component.amount_override else ft_component.component.amount
                        fee_breakdown[component_name] = str(amount)
            
            return JsonResponse({
                'student': {
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester,
                    'admission_mode': student.admission_mode,
                    'status': student.status
                },
                'fee_overview': {
                    'total_fee': total_fee,
                    'paid_amount': paid_amount,
                    'balance_amount': balance_amount,
                    'progress_percentage': round(progress_percentage, 2)
                },
                'fee_breakdown': fee_breakdown,
                'recent_payments': [{
                    'id': p.id,
                    'amount': float(p.amount),
                    'mode': p.mode,
                    'status': p.status,
                    'timestamp': p.timestamp.isoformat(),
                    'invoice_id': p.invoice.id
                } for p in recent_payments],
                'recent_notifications': [{
                    'id': n.id,
                    'message': n.message,
                    'is_read': n.is_read,
                    'created_at': n.created_at.isoformat()
                } for n in recent_notifications],
                'invoices': [{
                    'id': inv.id,
                    'semester': inv.semester,
                    'total_amount': float(inv.total_amount),
                    'paid_amount': float(inv.paid_amount),
                    'balance_amount': float(inv.balance_amount),
                    'status': inv.status,
                    'due_date': inv.due_date.isoformat() if inv.due_date else None
                } for inv in invoices]
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
                    'due_date': inv.due_date.isoformat() if inv.due_date else None
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
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
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
                    'invoice_id': p.invoice.id if p.invoice else None,
                    'amount': float(p.amount),
                    'mode': p.mode,
                    'status': p.status,
                    'timestamp': p.timestamp.isoformat()
                } for p in payments]
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class StudentNotificationsView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsStudentUser]

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

class StudentMarkNotificationReadView(APIView):
    permission_classes = [IsStudentUser]

    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, user=request.user)
            notification.is_read = True
            notification.save()
            return JsonResponse({'message': 'Notification marked as read'})
        except Notification.DoesNotExist:
            return JsonResponse({'error': 'Notification not found'}, status=404)


class StudentProfileUpdateView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            # Any code that writes to or creates stripe.log should be removed. (No direct evidence in views.py, but if present, remove such logic.)
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
                'status': student.status
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

    def patch(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            for key, value in request.data.items():
                if key in ['name']:  # Only allow name updates for students
                    setattr(student, key, value)
            student.save()
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
                'status': student.status
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class StudentProfileEditView(APIView):
    permission_classes = [IsStudentUser]

    def patch(self, request):
        try:
            user = request.user
            student = StudentProfile.objects.get(user=user)
            
            # Update user fields
            if 'email' in request.data:
                user.email = request.data['email']
                user.save()
            
            # Update student fields
            if 'name' in request.data:
                student.name = request.data['name']
                student.save()
            
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
                'status': student.status,
                'user': {
                    'email': user.email,
                    'role': user.role
                }
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class StudentReceiptsView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            receipts = Receipt.objects.filter(payment__invoice__student=student).order_by('-generated_at')
            
            return JsonResponse({
                'receipts': [{
                    'id': r.id,
                    'receipt_number': r.receipt_number,
                    'amount': float(r.amount),
                    'payment_date': r.payment.timestamp.isoformat(),
                    'payment_mode': r.payment.mode,
                    'transaction_id': r.payment.transaction_id,
                    'invoice_id': r.payment.invoice.id if r.payment.invoice else None,
                    'semester': r.payment.invoice.semester if r.payment.invoice else None,
                    'generated_at': r.generated_at.isoformat()
                } for r in receipts]
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class DownloadReceiptView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id, invoice__student__user=request.user)
            receipt = Receipt.objects.filter(payment=payment).first()
            
            if not receipt:
                return JsonResponse({'error': 'Receipt not found'}, status=404)
            
            invoice = payment.invoice
            if not invoice:
                return JsonResponse({'error': 'Invoice not found for this payment'}, status=404)
            student = invoice.student

            # Enhanced receipt template with more details
            template = get_template('receipt_template.html')
            context = {
                'payment': payment,
                'invoice': invoice,
                'student': student,
                'receipt': receipt,
                'user': request.user,
                'college_name': 'Your College Name',
                'college_address': 'College Address, City, State - PIN',
                'payment_date': payment.timestamp.strftime('%d-%b-%Y %H:%M'),
                'receipt_number': receipt.receipt_number,
                'transaction_id': payment.transaction_id,
                'total_fee': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount)
            }
            
            html = template.render(context)
            
            # Save PDF to receipts folder if not already saved
            self.ensure_receipt_pdf_saved(receipt, context)
            
            # Return PDF for download
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="receipt_{receipt.receipt_number}.pdf"'
            
            pisa_status = pisa.CreatePDF(html, dest=response)
            if pisa_status.err:
                return HttpResponse('We had some errors <pre>' + html + '</pre>')
            return response
            
        except Payment.DoesNotExist:
            return JsonResponse({'error': 'Payment not found or unauthorized'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    def ensure_receipt_pdf_saved(self, receipt, context):
        """Ensure receipt PDF is saved to receipts folder"""
        try:
            import os
            from django.conf import settings
            from django.template.loader import get_template
            from xhtml2pdf import pisa
            
            # Create receipts folder if it doesn't exist
            receipts_dir = os.path.join(settings.BASE_DIR, 'receipts')
            os.makedirs(receipts_dir, exist_ok=True)
            
            # Check if PDF already exists
            pdf_filename = f"receipt_{receipt.receipt_number}.pdf"
            pdf_path = os.path.join(receipts_dir, pdf_filename)
            
            if not os.path.exists(pdf_path):
                # Generate PDF content
                template = get_template('receipt_template.html')
                html = template.render(context)
                
                # Save PDF to file
                with open(pdf_path, 'wb') as pdf_file:
                    pisa_status = pisa.CreatePDF(html, dest=pdf_file)
                    if pisa_status.err:
                        print(f"Error creating PDF: {pisa_status.err}")
                    else:
                        print(f"Receipt PDF saved: {pdf_path}")
                        
        except Exception as e:
            print(f"Error ensuring receipt PDF saved: {e}")

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
                'admission_mode': s.admission_mode,
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
                admission_mode=request.data.get('admission_mode', 'kcet'),
                status=request.data.get('status', 'active')
            )
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
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
                if key in ['name', 'usn', 'dept', 'semester', 'admission_mode', 'status']:
                    setattr(student, key, value)
            student.save()
            return JsonResponse({
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'admission_mode': student.admission_mode,
                'status': student.status
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)

    def delete(self, request, id):
        try:
            student = StudentProfile.objects.get(id=id)
            user = student.user
            student.delete()
            user.delete()
            return JsonResponse({'message': 'Student and associated user deleted successfully'}, status=204)
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminFeeComponentsView(generics.ListCreateAPIView):
    queryset = FeeComponent.objects.all()
    serializer_class = FeeComponentSerializer
    permission_classes = [IsAdminUser]

class AdminFeeComponentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeComponent.objects.all()
    serializer_class = FeeComponentSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id'

class AdminFeeTemplatesView(generics.ListCreateAPIView):
    queryset = FeeTemplate.objects.all()
    serializer_class = FeeTemplateSerializer
    permission_classes = [IsAdminUser]

class AdminFeeTemplateDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeTemplate.objects.all()
    serializer_class = FeeTemplateSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id'

class AdminFeeAssignmentsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        assignments = FeeAssignment.objects.all()
        serializer = FeeAssignmentSerializer(assignments, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = FeeAssignmentSerializer(data=request.data)
        if serializer.is_valid():
            # Check if assignment already exists for this student and academic year
            student = serializer.validated_data.get('student')
            academic_year = serializer.validated_data.get('academic_year', '2024-25')  # Default if not provided
            
            existing_assignment = FeeAssignment.objects.filter(
                student=student,
                academic_year=academic_year
            ).first()
            
            if existing_assignment:
                return Response(
                    {"error": f"An assignment already exists for this student in academic year {academic_year}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            assignment = serializer.save()
            assignment.refresh_from_db()  # Ensure the object is fresh from DB
            
            # Auto-generate invoice upon assignment
            try:
                template = assignment.template
                if not template:
                    logger.error(f"No template found for assignment {assignment.id}")
                    return Response({"error": "Template is required for invoice creation"}, status=status.HTTP_400_BAD_REQUEST)

                overrides = assignment.overrides or {}

                total_amount = 0
                for ft_component in template.feetemplatecomponent_set.all():
                    component_amount = ft_component.amount_override if ft_component.amount_override is not None else ft_component.component.amount
                    total_amount += component_amount
                
                # Apply overrides
                for component_id, override_amount in overrides.items():
                    try:
                        component = FeeComponent.objects.get(id=int(component_id))
                        # Find original amount for this component
                        original_amount = 0
                        for ft_comp in template.feetemplatecomponent_set.all():
                            if ft_comp.component.id == int(component_id):
                                original_amount = ft_comp.amount_override if ft_comp.amount_override else ft_comp.component.amount
                                break
                        # Replace original with override
                        total_amount = total_amount - original_amount + float(override_amount)
                    except (FeeComponent.DoesNotExist, ValueError) as e:
                        logger.warning(f"Invalid component override in assignment {assignment.id}: {component_id}")
                        continue
                
                # Create invoice
                invoice = Invoice.objects.create(
                    student=student,
                    assignment=assignment,
                    academic_year=assignment.academic_year,
                    invoice_type=template.fee_type,
                    semester=template.semester if template.semester else student.semester,
                    total_amount=total_amount,
                    paid_amount=0,
                    balance_amount=total_amount,
                    due_date=datetime.now().date(),
                    status='pending'
                )
                
                logger.info(f"Invoice {invoice.invoice_number} created successfully for assignment {assignment.id}")
                
            except Exception as e:
                logger.error(f"Failed to create invoice for assignment {assignment.id}: {str(e)}")
                # Return error response instead of silently failing
                return Response(
                    {"error": f"Assignment created but invoice generation failed: {str(e)}"}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, pk):
        try:
            assignment = FeeAssignment.objects.get(pk=pk)
        except FeeAssignment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = FeeAssignmentSerializer(assignment, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        try:
            assignment = FeeAssignment.objects.get(pk=pk)
        except FeeAssignment.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class AdminFeeAssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = FeeAssignment.objects.all()
    serializer_class = FeeAssignmentSerializer
    permission_classes = [IsAdminUser]
    lookup_field = 'id'

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
                'student_id': inv.student.id if inv.student else None,
                'semester': inv.semester,
                'total_amount': float(inv.total_amount),
                'paid_amount': float(inv.paid_amount),
                'balance_amount': float(inv.balance_amount),
                'status': inv.status,
                'due_date': inv.due_date.isoformat() if inv.due_date else None
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
                'student_id': invoice.student.id if invoice.student else None,
                'semester': invoice.semester,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'status': invoice.status,
                'due_date': invoice.due_date.isoformat() if invoice.due_date else None
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
                'invoice_id': p.invoice.id if p.invoice else None,
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
                'invoice_id': payment.invoice.id if payment.invoice else None,
                'amount': float(payment.amount),
                'mode': payment.mode,
                'status': payment.status,
                'timestamp': payment.timestamp.isoformat()
            }, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

# Admin Reports
class AdminReportsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        dept = request.GET.get('dept')
        semester = request.GET.get('semester')

        outstanding_invoices = Invoice.objects.filter(balance_amount__gt=0)
        if dept:
            outstanding_invoices = outstanding_invoices.filter(student__dept=dept)
        if semester:
            outstanding_invoices = outstanding_invoices.filter(semester=semester)
        
        outstanding_report = []
        for invoice in outstanding_invoices:
            if invoice.student:  # Only include invoices with valid students
                outstanding_report.append({
                    'invoice_id': invoice.id,
                    'student_name': invoice.student.name,
                    'student_usn': invoice.student.usn,
                    'department': invoice.student.dept,
                    'semester': invoice.semester,
                    'total_amount': float(invoice.total_amount),
                    'paid_amount': float(invoice.paid_amount),
                    'balance_amount': float(invoice.balance_amount),
                    'due_date': invoice.due_date.isoformat() if invoice.due_date else None,
                    'status': invoice.status,
                })
        
        total_outstanding = outstanding_invoices.aggregate(Sum('balance_amount'))['balance_amount__sum'] or 0
        
        return Response({
            'outstanding_invoices': outstanding_report,
            'total_outstanding_amount': float(total_outstanding),
        })

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
        
        # Cancel stale pending payments older than 1 minute for this invoice and amount
        stale_time = timezone.now() - timezone.timedelta(minutes=1)
        stale_payments = Payment.objects.filter(
            invoice_id=id,
            status='pending',
            timestamp__lt=stale_time
        )
        for payment in stale_payments:
            payment.status = 'cancelled'
            payment.save()

        # Rate limiting check (basic implementation)
        recent_payments = Payment.objects.filter(
            invoice_id=id,
            timestamp__gte=timezone.now() - timezone.timedelta(minutes=5),
            status='pending'
        ).count()
        if recent_payments >= 3:
            return JsonResponse({
                'error': 'Too many payment attempts. Please wait before trying again.'
            }, status=429)

        try:
            invoice = Invoice.objects.get(id=id)
            student = StudentProfile.objects.get(user=request.user)

            # Verify the invoice belongs to the student
            if invoice.student != student:
                logger.warning(f"Unauthorized payment attempt by user {request.user.id} for invoice {id}")
                return JsonResponse({'error': 'Unauthorized access to invoice'}, status=403)

            # Get payment amount (default to balance amount)
            amount = request.data.get('amount', float(invoice.balance_amount))

            # Enhanced validation
            if amount <= 0:
                return JsonResponse({'error': 'Amount must be greater than 0'}, status=400)
            if amount > float(invoice.balance_amount):
                return JsonResponse({'error': 'Amount cannot exceed balance amount'}, status=400)
            if amount < 1:  # Minimum payment amount
                return JsonResponse({'error': 'Minimum payment amount is ₹1'}, status=400)

            # Check for duplicate payments (only those within last 1 minute)
            existing_payment = Payment.objects.filter(
                invoice=invoice,
                amount=amount,
                status='pending',
                timestamp__gte=timezone.now() - timezone.timedelta(minutes=1)
            ).first()

            if existing_payment:
                return JsonResponse({
                    'error': 'A similar payment is already in progress. Please complete or cancel it first.',
                    'existing_payment_id': existing_payment.id
                }, status=409)

            # Prepare student info for Stripe
            student_info = {
                'name': student.name,
                'usn': student.usn,
                'email': request.user.email,
                'dept': student.dept,
                'semester': student.semester
            }

            # Create Stripe checkout session
            try:
                session = create_checkout_session(id, amount, student_info)
            except Exception as e:
                logger.error(f"Stripe configuration error: {str(e)}")
                return JsonResponse({'error': 'Stripe configuration error. Please contact admin.'}, status=500)

            # Create pending payment record with additional security fields
            payment = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                mode='stripe',
                transaction_id=session.id,
                status='pending',
                payment_reference=f"PAY-{timezone.now().strftime('%Y%m%d%H%M%S')}-{id}"
            )

            # Create notification about payment initiation
            Notification.objects.create(
                user=request.user,
                message=f"Payment session created for ₹{amount} for Invoice #{invoice.id}. Complete the payment within 30 minutes.",
                is_read=False
            )

            logger.info(f"Payment session created: {session.id} for user {request.user.id}, invoice {id}, amount {amount}")

            return JsonResponse({
                'checkout_url': session.url,
                'session_id': session.id,
                'payment_id': payment.id,
                'amount': amount,
                'expires_at': session.expires_at,
                'payment_reference': payment.payment_reference
            })

        except Invoice.DoesNotExist:
            return JsonResponse({'error': 'Invoice not found'}, status=404)
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)
        except Exception as e:
            logger.error(f"Error creating checkout session: {str(e)}")
            return JsonResponse({'error': 'Payment processing error. Please try again.'}, status=500)

class InvoiceComponentSelectionView(APIView):
    """View for students to select specific fee components for payment"""
    permission_classes = [IsAuthenticated]

    def get(self, request, invoice_id):
        """Get invoice components with payment status"""
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            student = StudentProfile.objects.get(user=request.user)

            # Verify ownership
            if invoice.student != student:
                return JsonResponse({'error': 'Unauthorized access'}, status=403)

            components = InvoiceComponent.objects.filter(invoice=invoice).order_by('id')

            component_data = []
            total_payable = 0

            for component in components:
                component_info = {
                    'id': component.id,
                    'component_name': component.component_name,
                    'total_amount': float(component.component_amount),
                    'paid_amount': float(component.paid_amount),
                    'balance_amount': float(component.balance_amount),
                    'is_payable': component.balance_amount > 0,
                    'payment_percentage': (component.paid_amount / component.component_amount * 100) if component.component_amount > 0 else 0
                }
                component_data.append(component_info)

                if component.balance_amount > 0:
                    total_payable += float(component.balance_amount)

            return JsonResponse({
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'components': component_data,
                'total_payable': total_payable,
                'can_pay_partial': True
            })

        except Invoice.DoesNotExist:
            return JsonResponse({'error': 'Invoice not found'}, status=404)
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)

class ComponentBasedPaymentView(APIView):
    """View for creating payments for selected components"""
    permission_classes = [IsAuthenticated]

    def post(self, request, invoice_id):
        """Create payment session for selected components"""
        from .stripe_service import create_checkout_session
        try:
            invoice = Invoice.objects.get(id=invoice_id)
            student = StudentProfile.objects.get(user=request.user)

            # Verify ownership
            if invoice.student != student:
                return JsonResponse({'error': 'Unauthorized access'}, status=403)

            # Get selected components and amounts
            component_payments = request.data.get('component_payments', [])
            if not component_payments:
                return JsonResponse({'error': 'No components selected for payment'}, status=400)

            # Validate and calculate total payment amount
            total_payment_amount = 0
            validated_components = []

            for comp_payment in component_payments:
                component_id = comp_payment.get('component_id')
                payment_amount = float(comp_payment.get('amount', 0))

                if payment_amount <= 0:
                    continue

                try:
                    component = InvoiceComponent.objects.get(
                        id=component_id,
                        invoice=invoice,
                        balance_amount__gt=0
                    )

                    # Validate payment amount doesn't exceed balance
                    if payment_amount > float(component.balance_amount):
                        return JsonResponse({
                            'error': f'Payment amount for {component.component_name} exceeds balance'
                        }, status=400)

                    validated_components.append({
                        'component': component,
                        'amount': payment_amount
                    })
                    total_payment_amount += payment_amount

                except InvoiceComponent.DoesNotExist:
                    return JsonResponse({
                        'error': f'Invalid component or component has no balance: {component_id}'
                    }, status=400)

            if total_payment_amount <= 0:
                return JsonResponse({'error': 'Total payment amount must be greater than 0'}, status=400)

            # Create payment record
            payment = Payment.objects.create(
                invoice=invoice,
                amount=total_payment_amount,
                mode='stripe',
                status='pending'
            )

            # Create component payment allocations (pending)
            for comp_data in validated_components:
                PaymentComponent.objects.create(
                    payment=payment,
                    invoice_component=comp_data['component'],
                    amount_allocated=comp_data['amount']
                )

            # Prepare student info for Stripe
            student_info = {
                'name': student.name,
                'usn': student.usn,
                'email': request.user.email,
                'dept': student.dept,
                'semester': student.semester
            }

            # Create detailed description for Stripe
            component_descriptions = []
            for comp_data in validated_components:
                component_descriptions.append(
                    f"{comp_data['component'].component_name}: ₹{comp_data['amount']}"
                )

            description = f"Partial Payment - {', '.join(component_descriptions[:3])}"
            if len(component_descriptions) > 3:
                description += f" and {len(component_descriptions) - 3} more"

            # Create Stripe checkout session with component details
            session = create_checkout_session(
                invoice_id,
                total_payment_amount,
                student_info,
                description=description,
                metadata={
                    'payment_id': str(payment.id),
                    'component_count': str(len(validated_components)),
                    'is_partial_payment': 'true'
                }
            )

            # Update payment with transaction ID
            payment.transaction_id = session.id
            payment.save()

            # Create notification
            Notification.objects.create(
                user=request.user,
                message=f"Payment session created for ₹{total_payment_amount} covering {len(validated_components)} fee components. Complete the payment to proceed.",
                is_read=False
            )

            return JsonResponse({
                'checkout_url': session.url,
                'session_id': session.id,
                'payment_id': payment.id,
                'amount': total_payment_amount,
                'components_selected': len(validated_components),
                'expires_at': session.expires_at,
                'is_partial_payment': True
            })

        except Invoice.DoesNotExist:
            return JsonResponse({'error': 'Invoice not found'}, status=404)
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student profile not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class PaymentStatusView(APIView):
    """View to check payment status"""
    permission_classes = []  # Allow public access for payment verification
    
    def get(self, request, session_id):
        from .stripe_service import retrieve_checkout_session
        try:
            # Get session details from Stripe first
            session_data = retrieve_checkout_session(session_id)
            
            if not session_data:
                return JsonResponse({'error': 'Invalid session ID'}, status=404)
            
            # Try to find the payment in our database
            payment = Payment.objects.filter(transaction_id=session_id).first()
            
            # If we have a user context, validate ownership
            if request.user.is_authenticated:
                try:
                    student = StudentProfile.objects.get(user=request.user)
                    if payment and payment.invoice.student != student:
                        return JsonResponse({'error': 'Unauthorized access to payment'}, status=403)
                except StudentProfile.DoesNotExist:
                    pass  # Non-student users (admin, etc.) can view any payment
            
            # Return Stripe session data (this is safe for public access since it only contains payment status)
            session = retrieve_checkout_session(session_id)
            
            if not session:
                return JsonResponse({'error': 'Session not found in Stripe'}, status=404)
            
            # Auto-update payment status if Stripe shows completed but our DB shows pending
            if payment and session.payment_status == 'paid' and payment.status == 'pending':
                try:
                    # Simulate the webhook call to properly update payment status
                    webhook_view = StripeWebhookView()
                    session_dict = {
                        'id': session.id,
                        'payment_status': session.payment_status,
                        'amount_total': session.amount_total,
                        'customer': session.customer,
                        'metadata': session.metadata if hasattr(session, 'metadata') else {}
                    }
                    webhook_view.handle_checkout_session_completed(session_dict)
                    
                    # Refresh the payment object from database
                    payment.refresh_from_db()
                    logger.info(f"Auto-updated payment {payment.id} status to {payment.status} based on Stripe session")
                    
                except Exception as e:
                    logger.error(f"Error auto-updating payment status: {str(e)}")
            
            response_data = {
                'session_id': session_id,
                'payment_status': session.payment_status,
                'amount_total': session.amount_total / 100,  # Convert from paise to rupees
                'currency': session.currency,
                'customer_email': session.customer_details.email if session.customer_details else None,
                'created': session.created,
                'expires_at': session.expires_at,
            }
            
            # Add payment info if available
            if payment:
                response_data.update({
                    'payment_id': payment.id,
                    'invoice_id': payment.invoice.id,
                    'status': payment.status
                })
            else:
                # Extract invoice ID from session metadata if payment not found
                invoice_id = None
                if hasattr(session, 'metadata') and session.metadata:
                    invoice_id = session.metadata.get('invoice_id')
                elif hasattr(session, 'line_items'):
                    # Try to extract from line items metadata
                    line_items = session.list_line_items(session.id, limit=1)
                    if line_items.data:
                        product = line_items.data[0].price.product
                        if hasattr(product, 'metadata'):
                            invoice_id = product.metadata.get('invoice_id')
                
                response_data.update({
                    'payment_id': None,
                    'invoice_id': invoice_id,
                    'status': 'pending'
                })
            
            return JsonResponse(response_data)
            
        except Exception as e:
            logger.error(f"Error retrieving payment status: {str(e)}")
            return JsonResponse({'error': 'Failed to retrieve payment status'}, status=500)

@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    permission_classes = []  # No authentication required for webhooks
    
    def post(self, request):
        from .stripe_service import verify_webhook_signature
        import json
        
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        # Log webhook attempt for security monitoring
        logger.info(f"Stripe webhook received from {request.META.get('REMOTE_ADDR')}")
        
        # Validate webhook signature
        try:
            event = verify_webhook_signature(
                payload, settings.STRIPE_WEBHOOK_SECRET
            )
        except Exception as e:
            logger.warning(f"Webhook signature verification failed: {str(e)}")
            return HttpResponse(f'Webhook signature verification failed', status=400)
        
        # Log successful webhook verification
        logger.info(f"Webhook verified successfully: {event['type']}")
        
        # Process the event
        try:
            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                self.handle_checkout_session_completed(session)
                
            elif event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                self.handle_payment_intent_succeeded(payment_intent)
                
            elif event['type'] == 'payment_intent.payment_failed':
                payment_intent = event['data']['object']
                self.handle_payment_intent_failed(payment_intent)
                
            elif event['type'] == 'invoice.payment_succeeded':
                invoice = event['data']['object']
                self.handle_invoice_payment_succeeded(invoice)
                
            else:
                logger.info(f'Unhandled event type: {event["type"]}')
                
        except Exception as e:
            logger.error(f"Error processing webhook event {event['type']}: {str(e)}")
            # Don't return error to Stripe - we've already verified the webhook
            # Just log the error and continue
        
        return HttpResponse(status=200)
    
    def handle_checkout_session_completed(self, session):
        """Handle successful checkout session completion"""
        try:
            payment = Payment.objects.get(transaction_id=session['id'])
            payment.status = 'success'
            payment.save()
            
            # Check if this is a component-based payment
            is_partial_payment = session.get('metadata', {}).get('is_partial_payment') == 'true'
            
            if is_partial_payment:
                # Handle component-based payment allocation
                self.allocate_payment_to_selected_components(payment, float(payment.amount))
            else:
                # Handle full payment allocation (existing logic)
                self.allocate_payment_to_components(payment, float(payment.amount))
            
            # Update invoice
            invoice = payment.invoice
            if not invoice:
                print(f"Payment {payment.id} has no associated invoice")
                return
                
            invoice.paid_amount += payment.amount
            invoice.balance_amount -= payment.amount
            invoice.status = 'paid' if invoice.balance_amount <= 0 else 'partial'
            invoice.save()
            
            # Create success notification for student
            if invoice.student and invoice.student.user:
                payment_type = "partial" if is_partial_payment else "full"
                Notification.objects.create(
                    user=invoice.student.user,
                    message=f"{payment_type.title()} payment of ₹{payment.amount} received successfully on {payment.timestamp.strftime('%d-%b-%Y')}. Pending amount: ₹{invoice.balance_amount}",
                    is_read=False
                )
            
            # Generate and send receipt automatically
            self.generate_and_send_receipt(payment)
            
        except Payment.DoesNotExist:
            print(f"Payment not found for session {session.id}")
        except Exception as e:
            print(f"Error handling checkout session completed: {str(e)}")
    
    def handle_payment_intent_succeeded(self, payment_intent):
        """Handle successful payment intent"""
        try:
            # Find payment by payment intent ID
            payment = Payment.objects.filter(
                transaction_id=payment_intent.id
            ).first()
            
            if payment:
                payment.status = 'success'
                payment.save()
                print(f"Payment intent succeeded: {payment_intent.id}")
                
        except Exception as e:
            print(f"Error handling payment intent succeeded: {str(e)}")
    
    def handle_payment_intent_failed(self, payment_intent):
        """Handle failed payment intent"""
        try:
            # Find payment by payment intent ID
            payment = Payment.objects.filter(
                transaction_id=payment_intent.id
            ).first()
            
            if payment:
                payment.status = 'failed'
                payment.save()
                
                # Create failure notification
                if payment.invoice and payment.invoice.student and payment.invoice.student.user:
                    Notification.objects.create(
                        user=payment.invoice.student.user,
                        message=f"Payment of ₹{payment.amount} failed. Please try again or contact support.",
                        is_read=False
                    )
                    
                print(f"Payment intent failed: {payment_intent.id}")
                
        except Exception as e:
            print(f"Error handling payment intent failed: {str(e)}")
    
    def handle_invoice_payment_succeeded(self, stripe_invoice):
        """Handle Stripe invoice payment succeeded"""
        try:
            print(f"Stripe invoice payment succeeded: {stripe_invoice.id}")
        except Exception as e:
            print(f"Error handling invoice payment succeeded: {str(e)}")
    
    def generate_and_send_receipt(self, payment):
        """Generate receipt and send to student after successful payment"""
        try:
            invoice = payment.invoice
            if not invoice:
                print(f"Payment {payment.id} has no associated invoice")
                return
                
            student = invoice.student
            if not student:
                print(f"Invoice {invoice.id} has no associated student")
                return
            
            # Generate receipt content
            receipt_data = {
                'payment_id': payment.id,
                'student_name': student.name,
                'student_usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'payment_amount': float(payment.amount),
                'payment_mode': payment.mode,
                'payment_date': payment.timestamp.strftime('%d-%b-%Y %H:%M'),
                'transaction_id': payment.transaction_id,
                'invoice_id': invoice.id,
                'total_fee': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'receipt_number': f"RCPT-{payment.id:06d}",
                'college_name': "Your College Name",
                'college_address': "College Address, City, State - PIN"
            }
            
            # Create receipt record in database
            receipt = Receipt.objects.create(
                payment=payment,
                receipt_number=receipt_data['receipt_number'],
                amount=payment.amount,
                generated_at=timezone.now()
            )
            
            # Generate and save PDF file to receipts folder
            self.save_receipt_pdf(receipt, receipt_data)
            
            # Send receipt via email (in production)
            # self.send_receipt_email(student.user.email, receipt_data)
            
            # Create notification about receipt
            Notification.objects.create(
                user=student.user,
                message=f"Receipt generated for payment of ₹{payment.amount}. Receipt #: {receipt_data['receipt_number']}",
                is_read=False
            )
            
        except Exception as e:
            print(f"Error generating receipt: {e}")

    def allocate_payment_to_components(self, payment, amount):
        """Allocate payment amount to invoice components"""
        try:
            invoice = payment.invoice
            if not invoice:
                print(f"Payment {payment.id} has no associated invoice")
                return False
                
            components = InvoiceComponent.objects.filter(invoice=invoice, balance_amount__gt=0).order_by('id')
            
            remaining_amount = amount
            
            for component in components:
                if remaining_amount <= 0:
                    break
                    
                # Calculate how much to allocate to this component
                allocation = min(remaining_amount, float(component.balance_amount))
                
                # Update component payment status
                component.paid_amount += allocation
                component.balance_amount -= allocation
                component.save()
                
                # Create payment component allocation record
                PaymentComponent.objects.create(
                    payment=payment,
                    invoice_component=component,
                    amount_allocated=allocation
                )
                
                remaining_amount -= allocation
                
            return True
            
        except Exception as e:
            print(f"Error allocating payment to components: {e}")
            return False
    
    def allocate_payment_to_selected_components(self, payment, amount):
        """Allocate payment amount to pre-selected components"""
        try:
            # Get pre-allocated components for this payment
            component_allocations = PaymentComponent.objects.filter(
                payment=payment,
                amount_allocated__gt=0
            ).select_related('invoice_component')
            
            if not component_allocations:
                print(f"No component allocations found for payment {payment.id}, falling back to standard allocation")
                return self.allocate_payment_to_components(payment, amount)
            
            remaining_amount = amount
            
            for allocation in component_allocations:
                if remaining_amount <= 0:
                    break
                    
                component = allocation.invoice_component
                allocated_amount = float(allocation.amount_allocated)
                
                # Allocate to this component
                actual_allocation = min(remaining_amount, allocated_amount)
                
                # Update component payment status
                component.paid_amount += actual_allocation
                component.balance_amount -= actual_allocation
                component.save()
                
                # Update the allocation record with actual amount allocated
                allocation.amount_allocated = actual_allocation
                allocation.save()
                
                remaining_amount -= actual_allocation
                
            return True
            
        except Exception as e:
            print(f"Error allocating payment to selected components: {e}")
            return False
    
    def save_receipt_pdf(self, receipt, receipt_data):
        """Save receipt PDF to receipts folder"""
        try:
            import os
            from django.conf import settings
            from django.template.loader import get_template
            from xhtml2pdf import pisa
            
            # Create receipts folder if it doesn't exist
            receipts_dir = os.path.join(settings.BASE_DIR, 'receipts')
            os.makedirs(receipts_dir, exist_ok=True)
            
            # Generate PDF content
            template = get_template('receipt_template.html')
            context = {
                'payment': receipt.payment,
                'invoice': receipt.payment.invoice,
                'student': receipt.payment.invoice.student,
                'receipt': receipt,
                'user': receipt.payment.invoice.student.user,
                'college_name': receipt_data['college_name'],
                'college_address': receipt_data['college_address'],
                'payment_date': receipt_data['payment_date'],
                'receipt_number': receipt_data['receipt_number'],
                'transaction_id': receipt_data['transaction_id'],
                'invoice_id': receipt_data['invoice_id'],
                'total_fee': receipt_data['total_fee'],
                'paid_amount': receipt_data['paid_amount'],
                'balance_amount': receipt_data['balance_amount']
            }
            
            html = template.render(context)
            
            # Save PDF to file
            pdf_filename = f"receipt_{receipt.receipt_number}.pdf"
            pdf_path = os.path.join(receipts_dir, pdf_filename)
            
            with open(pdf_path, 'wb') as pdf_file:
                pisa_status = pisa.CreatePDF(html, dest=pdf_file)
                if pisa_status.err:
                    print(f"Error creating PDF: {pisa_status.err}")
                else:
                    print(f"Receipt PDF saved: {pdf_path}")
                    
        except Exception as e:
            print(f"Error saving receipt PDF: {e}")

class RefundPaymentView(APIView):
    """Admin view to create refunds"""
    permission_classes = [IsAdminUser]
    
    def post(self, request, payment_id):
        from .stripe_service import create_refund
        try:
            payment = Payment.objects.get(id=payment_id)
            
            if payment.status != 'success':
                return JsonResponse({'error': 'Only successful payments can be refunded'}, status=400)
            
            refund_amount = request.data.get('amount', float(payment.amount))
            reason = request.data.get('reason', 'Admin initiated refund')
            
            # Validate refund amount
            if refund_amount <= 0 or refund_amount > float(payment.amount):
                return JsonResponse({'error': 'Invalid refund amount'}, status=400)
            
            # Create refund in Stripe
            refund = create_refund(
                payment.transaction_id,
                refund_amount,
                reason
            )
            
            # Update payment status
            payment.status = 'refunded'
            payment.save()
            
            # Update invoice amounts
            invoice = payment.invoice
            invoice.paid_amount -= refund_amount
            invoice.balance_amount += refund_amount
            invoice.status = 'partial' if invoice.balance_amount > 0 else 'paid'
            invoice.save()
            
            # Create notification
            if invoice.student and invoice.student.user:
                Notification.objects.create(
                    user=invoice.student.user,
                    message=f"Refund of ₹{refund_amount} processed for payment #{payment.id}. Reason: {reason}",
                    is_read=False
                )
            
            return JsonResponse({
                'refund_id': refund.id,
                'amount': refund_amount,
                'status': refund.status,
                'reason': reason
            })
            
        except Payment.DoesNotExist:
            return JsonResponse({'error': 'Payment not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminCustomFeeStructureView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            custom_fees = CustomFeeStructure.objects.filter(student=student).first()
            if custom_fees:
                return JsonResponse({
                    'id': custom_fees.id,
                    'components': custom_fees.components,
                    'total_amount': float(custom_fees.total_amount),
                    'created_at': custom_fees.created_at.isoformat(),
                    'updated_at': custom_fees.updated_at.isoformat()
                })
            return JsonResponse({'message': 'No custom fee structure found'}, status=404)
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)

    def post(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            components = request.data.get('components', {})
            
            # Validate components
            if not components:
                return JsonResponse({'error': 'Components are required'}, status=400)
            
            # Create or update custom fee structure
            custom_fees, created = CustomFeeStructure.objects.get_or_create(
                student=student,
                defaults={'components': components}
            )
            
            if not created:
                custom_fees.components = components
                custom_fees.save()
            
            # Generate invoice
            total_amount = sum(float(amount) for amount in components.values())
            invoice, inv_created = Invoice.objects.get_or_create(
                student=student,
                semester=student.semester,
                defaults={
                    'total_amount': total_amount,
                    'paid_amount': 0,
                    'balance_amount': total_amount,
                    'due_date': datetime.now().date()
                }
            )
            
            if not inv_created:
                invoice.total_amount = total_amount
                invoice.balance_amount = float(invoice.total_amount) - float(invoice.paid_amount)
                invoice.save()
            
            return JsonResponse({
                'id': custom_fees.id,
                'components': custom_fees.components,
                'total_amount': float(custom_fees.total_amount),
                'invoice_id': invoice.id
            }, status=201)
            
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminStudentFeeProfileView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            invoices = Invoice.objects.filter(student=student)
            payments = Payment.objects.filter(invoice__student=student)
            custom_fees = CustomFeeStructure.objects.filter(student=student).first()
            
            # Calculate totals
            total_fee = sum(float(inv.total_amount) for inv in invoices)
            total_paid = sum(float(inv.paid_amount) for inv in invoices)
            total_pending = sum(float(inv.balance_amount) for inv in invoices)
            
            # Payment history
            payment_history = [{
                'id': p.id,
                'amount': float(p.amount),
                'mode': p.mode,
                'status': p.status,
                'timestamp': p.timestamp.isoformat(),
                'invoice_id': p.invoice.id
            } for p in payments]
            
            # Invoice details
            invoice_details = [{
                'id': inv.id,
                'semester': inv.semester,
                'total_amount': float(inv.total_amount),
                'paid_amount': float(inv.paid_amount),
                'balance_amount': float(inv.balance_amount),
                'status': inv.status,
                'due_date': inv.due_date.isoformat() if inv.due_date else None
            } for inv in invoices]
            
            return JsonResponse({
                'student': {
                    'id': student.id,
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester,
                    'status': student.status
                },
                'fee_summary': {
                    'total_fee': total_fee,
                    'total_paid': total_paid,
                    'total_pending': total_pending
                },
                'custom_fee_structure': custom_fees.components if custom_fees else None,
                'invoices': invoice_details,
                'payment_history': payment_history
            })
            
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)

class AdminStudentStatusDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        dept = request.GET.get('dept')
        semester = request.GET.get('semester')
        
        students = StudentProfile.objects.all()
        if dept:
            students = students.filter(dept=dept)
        if semester:
            students = students.filter(semester=semester)
        
        status_cards = {
            'fully_paid': [],
            'partial_payment': [],
            'unpaid': []
        }
        
        for student in students:
            invoices = Invoice.objects.filter(student=student)
            total_fee = sum(float(inv.total_amount) for inv in invoices)
            total_paid = sum(float(inv.paid_amount) for inv in invoices)
            total_pending = sum(float(inv.balance_amount) for inv in invoices)
            
            student_data = {
                'id': student.id,
                'name': student.name,
                'usn': student.usn,
                'dept': student.dept,
                'semester': student.semester,
                'total_fee': total_fee,
                'total_paid': total_paid,
                'total_pending': total_pending
            }
            
            if total_pending <= 0 and total_fee > 0:
                status_cards['fully_paid'].append(student_data)
            elif total_paid > 0 and total_pending > 0:
                status_cards['partial_payment'].append(student_data)
            elif total_paid == 0:
                status_cards['unpaid'].append(student_data)
        
        return JsonResponse({
            'status_cards': status_cards,
            'summary': {
                'total_students': len(students),
                'fully_paid_count': len(status_cards['fully_paid']),
                'partial_payment_count': len(status_cards['partial_payment']),
                'unpaid_count': len(status_cards['unpaid'])
            }
        })

class AdminCollectionsReportView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        month = request.GET.get('month')
        semester = request.GET.get('semester')
        dept = request.GET.get('dept')
        
        payments = Payment.objects.filter(status='success')
        
        if month:
            # Filter by month (implement date filtering logic)
            pass
        if semester:
            payments = payments.filter(invoice__student__semester=semester)
        if dept:
            payments = payments.filter(invoice__student__dept=dept)
        
        total_collections = payments.aggregate(Sum('amount'))['amount__sum'] or 0
        
        # Group by payment mode
        mode_breakdown = {}
        for payment in payments:
            mode = payment.mode
            if mode not in mode_breakdown:
                mode_breakdown[mode] = 0
            mode_breakdown[mode] += float(payment.amount)
        
        return JsonResponse({
            'total_collections': float(total_collections),
            'mode_breakdown': mode_breakdown,
            'payment_count': len(payments)
        })

class AdminIndividualFeeAssignmentView(APIView):
    """Admin view for assigning individual fee structures to students"""
    permission_classes = [IsAdminUser]

    def get(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            custom_fees = CustomFeeStructure.objects.filter(student=student).first()
            invoices = Invoice.objects.filter(student=student)
            
            # Get existing fee components for reference
            fee_components = FeeComponent.objects.all()
            
            return JsonResponse({
                'student': {
                    'id': student.id,
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester
                },
                'custom_fee_structure': custom_fees.components if custom_fees else None,
                'total_amount': float(custom_fees.total_amount) if custom_fees else 0,
                'available_components': [{
                    'id': comp.id,
                    'name': comp.name,
                    'amount': float(comp.amount)
                } for comp in fee_components],
                'invoices': [{
                    'id': inv.id,
                    'invoice_number': inv.invoice_number,
                    'semester': inv.semester,
                    'total_amount': float(inv.total_amount),
                    'paid_amount': float(inv.paid_amount),
                    'balance_amount': float(inv.balance_amount),
                    'status': inv.status,
                    'due_date': inv.due_date.isoformat() if inv.due_date else None
                } for inv in invoices]
            })
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)

    def post(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            components = request.data.get('components', {})
            
            if not components:
                return JsonResponse({'error': 'Components are required'}, status=400)
            
            # Validate components
            total_amount = 0
            for component_name, amount in components.items():
                if not isinstance(amount, (int, float)) or amount < 0:
                    return JsonResponse({'error': f'Invalid amount for {component_name}'}, status=400)
                total_amount += float(amount)
            
            # Create or update custom fee structure
            custom_fees, created = CustomFeeStructure.objects.get_or_create(
                student=student,
                defaults={'components': components}
            )
            
            if not created:
                custom_fees.components = components
                custom_fees.save()
            
            # Create or update invoice with component breakdown
            invoice, inv_created = Invoice.objects.get_or_create(
                student=student,
                semester=student.semester,
                defaults={
                    'total_amount': total_amount,
                    'paid_amount': 0,
                    'balance_amount': total_amount,
                    'due_date': datetime.now().date()
                }
            )
            
            if not inv_created:
                # Update existing invoice
                old_total = float(invoice.total_amount)
                invoice.total_amount = total_amount
                invoice.balance_amount = float(invoice.balance_amount) + (total_amount - old_total)
                invoice.save()
            
            # Create or update invoice components
            InvoiceComponent.objects.filter(invoice=invoice).delete()
            for component_name, amount in components.items():
                InvoiceComponent.objects.create(
                    invoice=invoice,
                    component_name=component_name,
                    component_amount=amount,
                    paid_amount=0,
                    balance_amount=amount
                )
            
            return JsonResponse({
                'id': custom_fees.id,
                'components': custom_fees.components,
                'total_amount': float(custom_fees.total_amount),
                'invoice_id': invoice.id,
                'invoice_number': invoice.invoice_number,
                'message': 'Individual fee structure assigned successfully'
            }, status=201)
            
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

class AdminStudentFeeBreakdownView(APIView):
    """Admin view for viewing detailed fee breakdown for a student"""
    permission_classes = [IsAdminUser]

    def get(self, request, student_id):
        try:
            student = StudentProfile.objects.get(id=student_id)
            custom_fees = CustomFeeStructure.objects.filter(student=student).first()
            invoices = Invoice.objects.filter(student=student)
            
            if not custom_fees:
                return JsonResponse({'error': 'No custom fee structure found for this student'}, status=404)
            
            # Get detailed invoice component breakdown
            invoice_components = []
            for invoice in invoices:
                components = InvoiceComponent.objects.filter(invoice=invoice)
                for comp in components:
                    invoice_components.append({
                        'invoice_id': invoice.id,
                        'invoice_number': invoice.invoice_number,
                        'component_name': comp.component_name,
                        'component_amount': float(comp.component_amount),
                        'paid_amount': float(comp.paid_amount),
                        'balance_amount': float(comp.balance_amount),
                        'status': 'Paid' if comp.balance_amount <= 0 else 'Pending'
                    })
            
            return JsonResponse({
                'student': {
                    'id': student.id,
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester
                },
                'fee_structure': custom_fees.components,
                'total_amount': float(custom_fees.total_amount),
                'invoice_components': invoice_components,
                'summary': {
                    'total_components': len(custom_fees.components),
                    'paid_components': len([c for c in invoice_components if c['balance_amount'] <= 0]),
                    'pending_components': len([c for c in invoice_components if c['balance_amount'] > 0])
                }
            })
            
        except StudentProfile.DoesNotExist:
            return JsonResponse({'error': 'Student not found'}, status=404)


class AdminBulkFeeAssignmentView(APIView):
    """Admin view for bulk assigning fee templates to students by admission mode and department"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get available templates and student counts by admission mode and department"""
        admission_modes = StudentProfile.ADMISSION_MODE_CHOICES
        departments = StudentProfile.objects.values_list('dept', flat=True).distinct()

        template_stats = []
        for mode_code, mode_name in admission_modes:
            for dept in departments:
                student_count = StudentProfile.objects.filter(
                    admission_mode=mode_code, 
                    dept=dept
                ).count()
                
                if student_count > 0:
                    assigned_count = FeeAssignment.objects.filter(
                        student__admission_mode=mode_code,
                        student__dept=dept
                    ).count()

                    # Find matching templates
                    matching_templates = FeeTemplate.objects.filter(
                        admission_mode=mode_code
                    ).filter(
                        Q(dept=dept) | Q(dept__isnull=True) | Q(dept='')
                    )

                    template_stats.append({
                        'admission_mode': mode_code,
                        'admission_mode_name': mode_name,
                        'department': dept,
                        'total_students': student_count,
                        'assigned_students': assigned_count,
                        'unassigned_students': student_count - assigned_count,
                        'available_templates': [{
                            'id': t.id,
                            'name': t.name,
                            'total_amount': float(t.total_amount),
                            'fee_type': t.fee_type
                        } for t in matching_templates]
                    })

        return JsonResponse({
            'bulk_assignment_stats': template_stats
        })

    def post(self, request):
        """Bulk assign fee template to students by admission mode and department"""
        # Handle both form data and JSON data
        if request.content_type == 'application/json':
            data = request.data
        else:
            data = request.POST
            
        admission_mode = data.get('admission_mode')
        department = data.get('department')
        template_id = data.get('template_id')
        academic_year = data.get('academic_year', '2024-25')
        dry_run = data.get('dry_run', False)  # Default to False for safety

        if not all([admission_mode, department, template_id]):
            return JsonResponse({
                'error': 'admission_mode, department, and template_id are required'
            }, status=400)

        try:
            template = FeeTemplate.objects.get(id=template_id)
        except FeeTemplate.DoesNotExist:
            return JsonResponse({'error': 'Template not found'}, status=404)

        # Get students matching criteria
        students = StudentProfile.objects.filter(
            admission_mode=admission_mode,
            dept=department
        ).exclude(
            # Exclude students who already have an assignment for this academic year
            feeassignment__academic_year=academic_year
        )

        if not students:
            return JsonResponse({
                'error': 'No eligible students found matching the criteria'
            }, status=400)

        assignments_created = 0
        invoices_created = 0
        admin_user = request.user

        for student in students:
            if not dry_run:
                # Create fee assignment
                assignment = FeeAssignment.objects.create(
                    student=student,
                    template=template,
                    assignment_type='bulk',
                    academic_year=academic_year,
                    assigned_by=admin_user,
                    is_active=True
                )

                # Create invoice
                invoice = Invoice.objects.create(
                    student=student,
                    assignment=assignment,
                    invoice_type=template.fee_type,
                    academic_year=academic_year,
                    total_amount=template.total_amount,
                    paid_amount=0,
                    balance_amount=template.total_amount,
                    due_date=date.today(),
                    status='pending'
                )

                # Create invoice components from template
                for ft_component in template.feetemplatecomponent_set.all():
                    InvoiceComponent.objects.create(
                        invoice=invoice,
                        component_name=ft_component.component.name,
                        component_amount=ft_component.amount_override or ft_component.component.amount,
                        paid_amount=0,
                        balance_amount=ft_component.amount_override or ft_component.component.amount
                    )

            assignments_created += 1
            invoices_created += 1

        action = "simulated" if dry_run else "assigned"
        return JsonResponse({
            'message': f'Successfully {action} fees to {assignments_created} students',
            'assignments_created': assignments_created,
            'invoices_created': invoices_created,
            'students_processed': len(students),
            'dry_run': dry_run,
            'template_used': {
                'id': template.id,
                'name': template.name,
                'total_amount': float(template.total_amount),
                'admission_mode': template.admission_mode,
                'department': template.dept
            }
        })

class AdminAutoAssignFeesView(APIView):
    """Admin view for auto-assigning fee templates based on admission mode rules"""
    permission_classes = [IsAdminUser]

    def get(self, request):
        """Get auto-assignment rules and preview"""
        # Define default rules for admission modes
        rules = {
            'kcet': {'template_pattern': 'KCET', 'auto_assign': True},
            'comedk': {'template_pattern': 'COMED-K', 'auto_assign': True},
            'management': {'template_pattern': 'Management', 'auto_assign': False},  # Manual assignment
            'jee': {'template_pattern': 'JEE', 'auto_assign': True},
            'diploma': {'template_pattern': 'Diploma', 'auto_assign': True},
            'lateral': {'template_pattern': 'Lateral', 'auto_assign': True},
            'other': {'template_pattern': 'General', 'auto_assign': False}  # Manual assignment
        }

        # Get statistics for each admission mode and department
        stats = []
        departments = StudentProfile.objects.values_list('dept', flat=True).distinct()

        for mode_code, rule in rules.items():
            for dept in departments:
                student_count = StudentProfile.objects.filter(
                    admission_mode=mode_code, 
                    dept=dept
                ).count()
                
                if student_count > 0:
                    assigned_count = FeeAssignment.objects.filter(
                        student__admission_mode=mode_code,
                        student__dept=dept
                    ).count()

                    # Find matching templates
                    matching_templates = FeeTemplate.objects.filter(
                        name__icontains=rule['template_pattern']
                    ).filter(
                        Q(dept=dept) | Q(dept__isnull=True) | Q(dept='')
                    )

                    stats.append({
                        'admission_mode': mode_code,
                        'department': dept,
                        'rule': rule,
                        'total_students': student_count,
                        'assigned_students': assigned_count,
                        'unassigned_students': student_count - assigned_count,
                        'matching_templates': [{
                            'id': t.id,
                            'name': t.name,
                            'total_amount': float(t.total_amount),
                            'fee_type': t.fee_type
                        } for t in matching_templates]
                    })

        return JsonResponse({
            'auto_assignment_rules': rules,
            'statistics': stats
        })

    def post(self, request):
        """Execute auto-assignment for specified admission modes and departments"""
        # Handle both form data and JSON data
        if request.content_type == 'application/json':
            data = request.data
        else:
            data = request.POST
            
        admission_modes = data.get('admission_modes', [])
        departments = data.get('departments', [])
        dry_run = data.get('dry_run', True)  # Default to dry run
        academic_year = data.get('academic_year', '2024-25')

        if not admission_modes:
            return JsonResponse({
                'error': 'admission_modes list is required'
            }, status=400)

        # Define rules
        rules = {
            'kcet': 'KCET',
            'comedk': 'COMED-K',
            'jee': 'JEE',
            'diploma': 'Diploma',
            'lateral': 'Lateral'
        }

        results = {}
        total_assignments_created = 0
        total_invoices_created = 0
        admin_user = request.user

        for mode in admission_modes:
            if mode not in rules:
                results[mode] = {'error': f'No rule defined for {mode}'}
                continue

            template_pattern = rules[mode]

            # Get departments to process
            depts_to_process = departments if departments else StudentProfile.objects.filter(
                admission_mode=mode
            ).values_list('dept', flat=True).distinct()

            for dept in depts_to_process:
                # Find students without assignments for this academic year
                unassigned_students = StudentProfile.objects.filter(
                    admission_mode=mode,
                    dept=dept
                ).exclude(
                    feeassignment__academic_year=academic_year
                )

                if not unassigned_students:
                    continue

                # Find appropriate template
                template = FeeTemplate.objects.filter(
                    name__icontains=template_pattern
                ).filter(
                    Q(dept=dept) | Q(dept__isnull=True) | Q(dept='')
                ).first()

                if not template:
                    results[f'{mode}_{dept}'] = {'error': f'No template found for {mode} in {dept}'}
                    continue

                assignments_created = 0
                invoices_created = 0

                if not dry_run:
                    for student in unassigned_students:
                        # Create assignment
                        assignment = FeeAssignment.objects.create(
                            student=student,
                            template=template,
                            assignment_type='auto',
                            academic_year=academic_year,
                            assigned_by=admin_user,
                            is_active=True
                        )

                        # Create invoice
                        invoice = Invoice.objects.create(
                            student=student,
                            assignment=assignment,
                            invoice_type=template.fee_type,
                            academic_year=academic_year,
                            total_amount=template.total_amount,
                            paid_amount=0,
                            balance_amount=template.total_amount,
                            due_date=date.today(),
                            status='pending'
                        )

                        # Create invoice components
                        for ft_component in template.feetemplatecomponent_set.all():
                            InvoiceComponent.objects.create(
                                invoice=invoice,
                                component_name=ft_component.component.name,
                                component_amount=ft_component.amount_override or ft_component.component.amount,
                                paid_amount=0,
                                balance_amount=ft_component.amount_override or ft_component.component.amount
                            )

                        assignments_created += 1
                        invoices_created += 1

                results[f'{mode}_{dept}'] = {
                    'students_processed': len(unassigned_students),
                    'assignments_created': assignments_created,
                    'invoices_created': invoices_created,
                    'template_used': template.name,
                    'dry_run': dry_run
                }

                total_assignments_created += assignments_created
                total_invoices_created += invoices_created

        return JsonResponse({
            'message': f'{"Preview" if dry_run else "Executed"} auto-assignment',
            'total_assignments_created': total_assignments_created,
            'total_invoices_created': total_invoices_created,
            'results': results,
            'dry_run': dry_run
        })
