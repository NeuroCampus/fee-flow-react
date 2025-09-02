# Stripe Integration Documentation

This document provides comprehensive documentation for the Stripe integration implemented in the college fee management system.

## Overview

The Stripe integration enables secure online payment processing for college fees. It includes:

1. **Checkout Sessions** - Secure payment pages hosted by Stripe
2. **Webhook Handling** - Automated payment confirmation and receipt generation
3. **Payment Status Tracking** - Real-time payment status updates
4. **Refund Processing** - Admin capability to process refunds
5. **Receipt Generation** - Automated PDF receipt generation

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `college_fee_backend` directory with:

```env
STRIPE_SECRET_KEY=sk_test_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Your webhook endpoint secret (for production)
FRONTEND_URL=http://localhost:3000  # Your frontend URL
```

### Stripe Account Setup

1. Create a Stripe account at https://stripe.com
2. Get your test API keys from the Stripe Dashboard
3. For production, switch to live keys

## 🚀 API Endpoints

### 1. Create Checkout Session

**Endpoint:** `POST /invoices/{invoice_id}/create-checkout-session/`

**Description:** Creates a Stripe checkout session for fee payment

**Request Body:**
```json
{
  "amount": 1500.00  // Optional: defaults to invoice balance
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/pay/cs_...",
  "session_id": "cs_test_...",
  "payment_id": 123,
  "amount": 1500.00,
  "expires_at": 1693564800
}
```

**Usage Example:**
```javascript
// Frontend JavaScript
const response = await fetch('/invoices/123/create-checkout-session/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + accessToken
  },
  body: JSON.stringify({
    amount: 1500.00
  })
});

const data = await response.json();
if (data.checkout_url) {
  window.location.href = data.checkout_url;
}
```

### 2. Payment Status Check

**Endpoint:** `GET /payments/{session_id}/status/`

**Description:** Check the status of a payment session

**Response:**
```json
{
  "payment_id": 123,
  "session_id": "cs_test_...",
  "payment_status": "paid",
  "amount_total": 1500.00,
  "currency": "inr",
  "customer_email": "student@example.com",
  "invoice_id": 456,
  "status": "success"
}
```

### 3. Webhook Endpoint

**Endpoint:** `POST /webhooks/stripe/`

**Description:** Handles Stripe webhook events (automated)

**Events Handled:**
- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed

### 4. Refund Payment (Admin)

**Endpoint:** `POST /payments/{payment_id}/refund/`

**Description:** Process a refund for a successful payment

**Request Body:**
```json
{
  "amount": 500.00,  // Optional: defaults to full amount
  "reason": "Requested by student"
}
```

**Response:**
```json
{
  "refund_id": "re_...",
  "amount": 500.00,
  "status": "succeeded",
  "reason": "Requested by student"
}
```

## 🔄 Payment Flow

### Student Payment Flow

1. **Student logs in** and views their invoice
2. **Clicks "Pay Now"** button
3. **Frontend calls** `create-checkout-session` endpoint
4. **Redirected to Stripe** checkout page
5. **Completes payment** on Stripe
6. **Redirected back** to success/cancel page
7. **Webhook processes** payment automatically
8. **Receipt generated** and notification sent

### Webhook Flow

1. **Stripe sends webhook** after payment events
2. **Django receives webhook** and verifies signature
3. **Payment status updated** in database
4. **Invoice amounts updated** (paid/balance)
5. **Receipt automatically generated** as PDF
6. **Student notification created**
7. **Payment allocated** to fee components

## 🧪 Testing

### Running Tests

```bash
# Navigate to backend directory
cd college_fee_backend

# Activate virtual environment
.\env\Scripts\Activate.ps1  # Windows
# source env/bin/activate     # Linux/Mac

# Run the test script
python test_stripe_integration.py
```

### Test Cards (Stripe Test Mode)

Use these test card numbers for testing:

- **Successful Payment:** `4242424242424242`
- **Payment Declined:** `4000000000000002`
- **Insufficient Funds:** `4000000000009995`
- **3D Secure Required:** `4000000000003220`

### Manual Testing Steps

1. **Create a test student** and invoice
2. **Login as student** and navigate to invoices
3. **Click "Pay" button** to initiate payment
4. **Complete payment** using test card
5. **Verify payment status** is updated
6. **Check receipt generation**
7. **Verify notifications** are created

## 🔒 Security Considerations

### Production Security

1. **Use HTTPS** for all endpoints
2. **Verify webhook signatures** (implemented)
3. **Use live Stripe keys** securely
4. **Enable CSRF protection** for webhooks
5. **Rate limit** payment endpoints
6. **Log all transactions** for audit

### Environment Variables

Never commit these to version control:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## 📊 Features Implemented

### ✅ Completed Features

- [x] Stripe checkout session creation
- [x] Webhook event handling
- [x] Payment status tracking
- [x] Automatic receipt generation
- [x] Payment component allocation
- [x] Student notifications
- [x] Refund processing (admin)
- [x] Error handling and logging
- [x] Test card support

### 🔮 Future Enhancements

- [ ] Saved payment methods
- [ ] Subscription billing
- [ ] Partial payment plans
- [ ] Payment reminders
- [ ] Mobile payment integration
- [ ] Multi-currency support
- [ ] Advanced reporting

## 🐛 Troubleshooting

### Common Issues

1. **"No module named 'stripe'"**
   - Install stripe: `pip install stripe`

2. **"Invalid API key"**
   - Check STRIPE_SECRET_KEY in .env file
   - Ensure it starts with `sk_test_` or `sk_live_`

3. **Webhook signature verification failed**
   - Check STRIPE_WEBHOOK_SECRET
   - Ensure webhook endpoint is accessible

4. **Payment not updating in database**
   - Check webhook endpoint is configured in Stripe
   - Verify webhook events are being received

### Debug Commands

```bash
# Check Django configuration
python manage.py check

# Test Stripe integration
python test_stripe_integration.py

# View webhook logs
tail -f logs/stripe.log

# Test webhook endpoint locally (using ngrok)
ngrok http 8000
```

## 📝 Code Examples

### Frontend Integration

```javascript
// Create payment session
async function initiatePayment(invoiceId, amount) {
  try {
    const response = await fetch(`/invoices/${invoiceId}/create-checkout-session/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`
      },
      body: JSON.stringify({ amount })
    });
    
    const data = await response.json();
    
    if (data.checkout_url) {
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    } else {
      throw new Error(data.error || 'Failed to create payment session');
    }
  } catch (error) {
    console.error('Payment initiation failed:', error);
    alert('Payment failed to start. Please try again.');
  }
}

// Check payment status
async function checkPaymentStatus(sessionId) {
  try {
    const response = await fetch(`/payments/${sessionId}/status/`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to check payment status:', error);
    return null;
  }
}
```

### Backend Usage

```python
# In views.py
from .stripe_service import create_checkout_session

def create_payment(request, invoice_id):
    invoice = Invoice.objects.get(id=invoice_id)
    student_info = {
        'name': request.user.studentprofile.name,
        'email': request.user.email,
        'usn': request.user.studentprofile.usn
    }
    
    session = create_checkout_session(
        invoice_id=invoice_id,
        amount=float(invoice.balance_amount),
        student_info=student_info
    )
    
    return JsonResponse({
        'checkout_url': session.url,
        'session_id': session.id
    })
```

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Stripe documentation
3. Check Django logs
4. Contact the development team

---

*Last updated: September 2025*
