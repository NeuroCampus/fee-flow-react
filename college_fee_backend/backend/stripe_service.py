
import stripe
from django.conf import settings
import os

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_checkout_session(invoice_id, amount):
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:3000')
    session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price_data': {
                'currency': 'inr',
                'product_data': {
                    'name': f'Fee Payment for Invoice {invoice_id}',
                    'description': 'College fee payment',
                },
                'unit_amount': int(amount * 100),
            },
            'quantity': 1,
        }],
        mode='payment',
        success_url=f'{FRONTEND_URL}/payment-success?session_id={{CHECKOUT_SESSION_ID}}',
        cancel_url=f'{FRONTEND_URL}/payment-cancel',
        metadata={'invoice_id': invoice_id}
    )
    return session
