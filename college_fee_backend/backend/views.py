
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
from django.template.loader import get_template
from django.http import HttpResponse
from xhtml2pdf import pisa
from rest_framework import generics, status
from rest_framework.response import Response
from django.utils import timezone

from .models import User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment, Invoice, InvoiceComponent, Payment, PaymentComponent, Notification, CustomFeeStructure, Receipt
from .serializers import LoginSerializer, UserSerializer, StudentProfileSerializer, NotificationSerializer, FeeComponentSerializer, FeeTemplateSerializer, FeeAssignmentSerializer
from django.utils.decorators import method_decorator


# Custom permissions
class IsStudentUser(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.role == 'student'

class IsHODUser(IsAuthenticated):
    def has_permission(self, request, view):
        return request.user.role == 'hod'

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
            assignment = serializer.save()
            
            # Auto-generate invoice upon assignment
            student = assignment.student
            template = assignment.template
            overrides = assignment.overrides

            total_amount = 0
            for ft_component in template.feetemplatecomponent_set.all():
                component_amount = ft_component.amount_override if ft_component.amount_override is not None else ft_component.component.amount
                total_amount += component_amount
            
            # Apply overrides
            for component_id, override_amount in overrides.items():
                try:
                    component = FeeComponent.objects.get(id=int(component_id))
                    # Assuming overrides replace the existing amount for that component
                    # This logic needs to be refined based on how overrides are structured
                    # For simplicity, let's assume overrides directly impact the total
                    total_amount += override_amount # This part needs careful consideration
                except FeeComponent.DoesNotExist:
                    pass
            
            # Create invoice
            Invoice.objects.create(
                student=student,
                semester=template.semester,  # Assuming template has semester
                total_amount=total_amount,
                paid_amount=0,
                balance_amount=total_amount,
                due_date=datetime.now().date() # Or a dynamic due date
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
        try:
            invoice = Invoice.objects.get(id=id)
            student = StudentProfile.objects.get(user=request.user)
            if invoice.student != student:
                return JsonResponse({'error': 'Unauthorized'}, status=403)
            
            # Get payment amount (default to balance amount)
            amount = request.data.get('amount', float(invoice.balance_amount))
            
            # Validate amount
            if amount <= 0:
                return JsonResponse({'error': 'Amount must be greater than 0'}, status=400)
            if amount > float(invoice.balance_amount):
                return JsonResponse({'error': 'Amount cannot exceed balance amount'}, status=400)
            
            # Create Stripe checkout session
            session = create_checkout_session(id, amount)
            
            # Create pending payment record
            payment = Payment.objects.create(
                invoice=invoice,
                amount=amount,
                mode='stripe',
                transaction_id=session.id,
                status='pending'
            )
            
            return JsonResponse({
                'checkout_url': session.url,
                'payment_id': payment.id,
                'amount': amount
            })
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
                
                # Allocate payment to invoice components
                self.allocate_payment_to_components(payment, float(payment.amount))
                
                # Update invoice
                invoice = payment.invoice
                if not invoice:
                    print(f"Payment {payment.id} has no associated invoice")
                    return HttpResponse(status=400)
                    
                invoice.paid_amount += payment.amount
                invoice.balance_amount -= payment.amount
                invoice.status = 'paid' if invoice.balance_amount <= 0 else 'partial'
                invoice.save()
                
                # Create success notification for student
                if invoice.student and invoice.student.user:
                    Notification.objects.create(
                        user=invoice.student.user,
                        message=f"Payment of ₹{payment.amount} received successfully on {payment.timestamp.strftime('%d-%b-%Y')}. Pending amount: ₹{invoice.balance_amount}",
                        is_read=False
                    )
                
                # Generate and send receipt automatically
                self.generate_and_send_receipt(payment)
                
            except Payment.DoesNotExist:
                return HttpResponse(status=400)
        return HttpResponse(status=200)
    
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
