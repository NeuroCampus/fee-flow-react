#!/usr/bin/env python
"""
Test script for Stripe integration
Run this script to test the Stripe service functions
"""

import os
import sys
import django
from dotenv import load_dotenv

# Setup Django environment
load_dotenv()
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from backend.stripe_service import create_checkout_session, create_payment_intent

def test_stripe_keys():
    """Test if Stripe keys are properly configured"""
    print("Testing Stripe configuration...")
    
    secret_key = os.getenv('STRIPE_SECRET_KEY')
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    if secret_key:
        print(f"✅ STRIPE_SECRET_KEY is configured (starts with: {secret_key[:7]}...)")
    else:
        print("❌ STRIPE_SECRET_KEY is not configured")
        return False
    
    if webhook_secret:
        print(f"✅ STRIPE_WEBHOOK_SECRET is configured")
    else:
        print("⚠️  STRIPE_WEBHOOK_SECRET is not configured (needed for production)")
    
    return True

def test_checkout_session():
    """Test creating a checkout session"""
    print("\nTesting checkout session creation...")
    
    try:
        student_info = {
            'name': 'Test Student',
            'usn': 'TEST001',
            'email': 'test@example.com',
            'dept': 'CSE',
            'semester': 3
        }
        
        session = create_checkout_session(
            invoice_id=123,
            amount=1500.00,  # Test amount in rupees
            student_info=student_info
        )
        
        print(f"✅ Checkout session created successfully!")
        print(f"   Session ID: {session.id}")
        print(f"   Amount: ₹{session.amount_total / 100}")
        print(f"   Currency: {session.currency}")
        print(f"   URL: {session.url}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating checkout session: {str(e)}")
        return False

def test_payment_intent():
    """Test creating a payment intent"""
    print("\nTesting payment intent creation...")
    
    try:
        payment_intent = create_payment_intent(
            amount=1000.00,  # Test amount in rupees
            metadata={
                'invoice_id': '123',
                'student_usn': 'TEST001'
            }
        )
        
        print(f"✅ Payment intent created successfully!")
        print(f"   Payment Intent ID: {payment_intent.id}")
        print(f"   Amount: ₹{payment_intent.amount / 100}")
        print(f"   Status: {payment_intent.status}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating payment intent: {str(e)}")
        return False

def main():
    """Main test function"""
    print("🧪 Stripe Integration Test Suite")
    print("=" * 40)
    
    all_tests_passed = True
    
    # Test 1: Configuration
    if not test_stripe_keys():
        all_tests_passed = False
        print("\n❌ Configuration test failed. Please check your .env file.")
        return
    
    # Test 2: Checkout Session
    if not test_checkout_session():
        all_tests_passed = False
    
    # Test 3: Payment Intent
    if not test_payment_intent():
        all_tests_passed = False
    
    print("\n" + "=" * 40)
    if all_tests_passed:
        print("🎉 All tests passed! Stripe integration is working correctly.")
        print("\nNext steps:")
        print("1. Test the /invoices/<id>/create-checkout-session/ endpoint")
        print("2. Set up webhook endpoint for production")
        print("3. Test payment flow end-to-end")
    else:
        print("⚠️  Some tests failed. Please check the configuration and try again.")

if __name__ == "__main__":
    main()
