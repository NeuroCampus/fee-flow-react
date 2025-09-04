
import stripe
from django.conf import settings
import os
import logging
import time

logger = logging.getLogger(__name__)

# Set Stripe API key
stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session(invoice_id, amount, student_info=None, description=None, metadata=None):
    """
    Create a Stripe checkout session for fee payment
    
    Args:
        invoice_id: ID of the invoice being paid
        amount: Payment amount in rupees
        student_info: Dictionary containing student information (optional)
        description: Custom description for the payment (optional)
        metadata: Additional metadata dictionary (optional)
    
    Returns:
        Stripe checkout session object
    """
    try:
        # Get frontend URL from environment or use default
        FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8080')
        
        # Customer information for better tracking
        customer_info = {}
        if student_info:
            customer_info = {
                'customer_email': student_info.get('email'),
                'customer_creation': 'always',
            }
        
        # Use custom description if provided, otherwise use default
        payment_description = description or f"Fee payment for {student_info.get('name', 'Student')} - {student_info.get('usn', '')}"
        
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'inr',
                    'product_data': {
                        'name': f'College Fee Payment - Invoice #{invoice_id}',
                        'description': payment_description,
                        'metadata': {
                            'invoice_id': str(invoice_id),
                            'student_usn': student_info.get('usn', '') if student_info else '',
                            'student_name': student_info.get('name', '') if student_info else ''
                        }
                    },
                    'unit_amount': int(amount * 100),  # Convert to paise
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{FRONTEND_URL}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&invoice_id={invoice_id}',
            cancel_url=f'{FRONTEND_URL}/payment/cancel?invoice_id={invoice_id}',
            metadata={
                'invoice_id': str(invoice_id),
                'student_usn': student_info.get('usn', '') if student_info else '',
                'amount': str(amount)
            },
            expires_at=int((time.time() + 1800)),  # 30 minutes expiry
            **customer_info
        )
        
        # Add custom metadata if provided
        if metadata:
            session.metadata.update(metadata)
        
        logger.info(f"Stripe checkout session created: {session.id} for invoice {invoice_id}")
        return session
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating checkout session: {str(e)}")
        raise Exception(f"Payment processing error: {str(e)}")
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        raise Exception(f"Failed to create payment session: {str(e)}")

def retrieve_checkout_session(session_id):
    """
    Retrieve a Stripe checkout session
    
    Args:
        session_id: Stripe session ID
    
    Returns:
        Stripe session object
    """
    try:
        session = stripe.checkout.Session.retrieve(session_id)
        return session
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving session {session_id}: {str(e)}")
        raise Exception(f"Failed to retrieve payment session: {str(e)}")

def create_payment_intent(amount, currency='inr', metadata=None):
    """
    Create a Stripe payment intent for advanced payment processing
    
    Args:
        amount: Payment amount in rupees
        currency: Currency code (default: 'inr')
        metadata: Additional metadata dictionary
    
    Returns:
        Stripe PaymentIntent object
    """
    try:
        payment_intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),  # Convert to paise
            currency=currency,
            automatic_payment_methods={'enabled': True},
            metadata=metadata or {}
        )
        
        logger.info(f"Payment intent created: {payment_intent.id}")
        return payment_intent
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        raise Exception(f"Payment processing error: {str(e)}")

def confirm_payment_intent(payment_intent_id, payment_method_id):
    """
    Confirm a Stripe payment intent
    
    Args:
        payment_intent_id: Payment intent ID
        payment_method_id: Payment method ID
    
    Returns:
        Confirmed PaymentIntent object
    """
    try:
        payment_intent = stripe.PaymentIntent.confirm(
            payment_intent_id,
            payment_method=payment_method_id
        )
        
        logger.info(f"Payment intent confirmed: {payment_intent.id}")
        return payment_intent
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error confirming payment intent: {str(e)}")
        raise Exception(f"Payment confirmation error: {str(e)}")

def create_refund(payment_intent_id, amount=None, reason=None):
    """
    Create a refund for a payment
    
    Args:
        payment_intent_id: Payment intent ID to refund
        amount: Refund amount in rupees (None for full refund)
        reason: Reason for refund
    
    Returns:
        Stripe Refund object
    """
    try:
        refund_data = {
            'payment_intent': payment_intent_id,
            'reason': reason or 'requested_by_customer'
        }
        
        if amount:
            refund_data['amount'] = int(amount * 100)  # Convert to paise
        
        refund = stripe.Refund.create(**refund_data)
        
        logger.info(f"Refund created: {refund.id} for payment intent {payment_intent_id}")
        return refund
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating refund: {str(e)}")
        raise Exception(f"Refund processing error: {str(e)}")

def get_payment_methods(customer_id):
    """
    Get saved payment methods for a customer
    
    Args:
        customer_id: Stripe customer ID
    
    Returns:
        List of payment methods
    """
    try:
        payment_methods = stripe.PaymentMethod.list(
            customer=customer_id,
            type='card'
        )
        return payment_methods.data
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error retrieving payment methods: {str(e)}")
        return []

def create_customer(email, name, metadata=None):
    """
    Create a Stripe customer
    
    Args:
        email: Customer email
        name: Customer name
        metadata: Additional metadata
    
    Returns:
        Stripe Customer object
    """
    try:
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata=metadata or {}
        )
        
        logger.info(f"Stripe customer created: {customer.id}")
        return customer
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating customer: {str(e)}")
        raise Exception(f"Customer creation error: {str(e)}")

def verify_webhook_signature(payload, signature, endpoint_secret):
    """
    Verify Stripe webhook signature
    
    Args:
        payload: Request payload
        signature: Stripe signature header
        endpoint_secret: Webhook endpoint secret
    
    Returns:
        Stripe event object if valid
    """
    try:
        event = stripe.Webhook.construct_event(
            payload, signature, endpoint_secret
        )
        return event
    except (ValueError, stripe.error.SignatureVerificationError) as e:
        logger.error(f"Webhook signature verification failed: {str(e)}")
        raise Exception("Invalid webhook signature")
