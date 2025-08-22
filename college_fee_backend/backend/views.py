
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

from .models import User, StudentProfile, FeeComponent, FeeTemplate, FeeTemplateComponent, FeeAssignment, Invoice, Payment, Notification
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
class LoginView(generics.GenericAPIView):
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

class RegisterView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'student') # Default role is student

        if not email or not password:
            return JsonResponse({'error': 'Please provide both email and password'}, status=400)

        try:
            user = User.objects.create_user(email=email, password=password, role=role)
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

# Student views
class StudentDashboardView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request):
        try:
            student = StudentProfile.objects.get(user=request.user)
            dues = Invoice.objects.filter(student=student).aggregate(total_due=Sum('balance_amount'))['total_due'] or 0
            total_fee = Invoice.objects.filter(student=student).aggregate(total=Sum('total_amount'))['total'] or 0
            paid_amount = Invoice.objects.filter(student=student).aggregate(total=Sum('paid_amount'))['total'] or 0
            invoices_data = [{
                'id': inv.id,
                'semester': inv.semester,
                'total_amount': float(inv.total_amount),
                'paid_amount': float(inv.paid_amount),
                'balance_amount': float(inv.balance_amount),
                'status': inv.status,
                'due_date': inv.due_date.isoformat()
            } for inv in Invoice.objects.filter(student=student)]

            return JsonResponse({
                'student': {
                    'name': student.name,
                    'usn': student.usn,
                    'dept': student.dept,
                    'semester': student.semester,
                    'status': student.status
                },
                'dues': float(dues),
                'total_fee': float(total_fee),
                'paid_amount': float(paid_amount),
                'invoices': invoices_data
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


class DownloadReceiptView(APIView):
    permission_classes = [IsStudentUser]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id, invoice__student__user=request.user)
            invoice = payment.invoice
            student = invoice.student

            template = get_template('receipt_template.html')
            context = {
                'payment': payment,
                'invoice': invoice,
                'student': student,
                'user': request.user,
            }
            html = template.render(context)
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="receipt_{payment.id}.pdf"'
            pisa_status = pisa.CreatePDF(html, dest=response)
            if pisa_status.err:
                return HttpResponse('We had some errors <pre>' + html + '</pre>')
            return response
        except Payment.DoesNotExist:
            return JsonResponse({'error': 'Payment not found or unauthorized'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

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
            outstanding_report.append({
                'invoice_id': invoice.id,
                'student_name': invoice.student.name,
                'student_usn': invoice.student.usn,
                'department': invoice.student.dept,
                'semester': invoice.semester,
                'total_amount': float(invoice.total_amount),
                'paid_amount': float(invoice.paid_amount),
                'balance_amount': float(invoice.balance_amount),
                'due_date': invoice.due_date.isoformat(),
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
