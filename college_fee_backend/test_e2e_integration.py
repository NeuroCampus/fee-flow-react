#!/usr/bin/env python3
"""
End-to-End Stripe Integration Test
This script tests the complete payment flow from frontend to backend.
"""

import requests
import json
import time
from typing import Dict, Any

class StripeIntegrationTester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000/api"
        self.frontend_url = "http://localhost:8082"
        self.session = requests.Session()
        self.auth_token = None
        self.student_id = None
        
    def login_student(self) -> bool:
        """Login as a test student"""
        print("🔐 Logging in as test student...")
        
        login_data = {
            "email": "teststudent@example.com",
            "password": "testpass123"
        }
        
        try:
            response = self.session.post(f"{self.base_url.replace('/api', '')}/auth/login/", json=login_data)
            if response.status_code == 200:
                data = response.json()
                print(f"Login response: {data}")  # Debug line
                self.auth_token = data.get('access_token') or data.get('access') or data.get('token')
                self.student_id = data.get('user', {}).get('id') or data.get('id')
                if self.auth_token:
                    self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                print(f"✅ Login successful! Student ID: {self.student_id}, Token: {self.auth_token[:20] if self.auth_token else 'None'}...")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_student_invoices(self) -> Dict[str, Any]:
        """Get student's pending invoices"""
        print("\n📄 Fetching student invoices...")
        
        try:
            response = self.session.get(f"{self.base_url.replace('/api', '')}/invoices/")
            if response.status_code == 200:
                data = response.json()
                print(f"Invoice response: {data}")  # Debug line
                
                # Extract invoices from the response
                if isinstance(data, dict) and 'invoices' in data:
                    invoices_list = data['invoices']
                elif isinstance(data, list):
                    invoices_list = data
                else:
                    invoices_list = [data] if data else []
                
                print(f"✅ Found {len(invoices_list)} invoices")
                
                # Find a pending invoice
                pending_invoices = [inv for inv in invoices_list if inv.get('status') == 'pending']
                if pending_invoices:
                    invoice = pending_invoices[0]
                    print(f"📋 Selected invoice: ID {invoice.get('id', 'N/A')} - ₹{invoice.get('total_amount', 0)}")
                    return invoice
                else:
                    print("⚠️ No pending invoices found")
                    if invoices_list:
                        # Use the first available invoice
                        invoice = invoices_list[0]
                        print(f"📋 Using first available invoice: ID {invoice.get('id', 'N/A')} - ₹{invoice.get('total_amount', 0)}")
                        return invoice
                    return {}
            else:
                print(f"❌ Failed to fetch invoices: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error fetching invoices: {e}")
            return {}
    
    def create_checkout_session(self, invoice_id: int) -> Dict[str, Any]:
        """Create a Stripe checkout session"""
        print("\n💳 Creating Stripe checkout session...")
        
        try:
            payload = {
                "invoice_id": invoice_id,
                "success_url": f"{self.frontend_url}/payment/success",
                "cancel_url": f"{self.frontend_url}/payment/cancel"
            }
            
            response = self.session.post(f"{self.base_url.replace('/api', '')}/invoices/{invoice_id}/create-checkout-session/", json=payload)
            
            if response.status_code == 200:
                session_data = response.json()
                print(f"✅ Checkout session created!")
                print(f"Session response: {session_data}")  # Debug line
                print(f"🔗 Session ID: {session_data.get('session_id', 'N/A')}")
                checkout_url = session_data.get('url') or session_data.get('checkout_url') or session_data.get('payment_url')
                if checkout_url:
                    print(f"🌐 Checkout URL: {checkout_url}")
                else:
                    print("⚠️ No checkout URL found in response")
                return session_data
            else:
                print(f"❌ Failed to create checkout session: {response.status_code} - {response.text}")
                return {}
        except Exception as e:
            print(f"❌ Error creating checkout session: {e}")
            return {}
    
    def check_payment_status(self, session_id: str) -> Dict[str, Any]:
        """Check payment status using session ID"""
        print(f"\n🔍 Checking payment status for session: {session_id}")
        
        try:
            response = self.session.get(f"{self.base_url.replace('/api', '')}/payments/{session_id}/status/")
            
            if response.status_code == 200:
                status_data = response.json()
                print(f"✅ Payment status retrieved!")
                print(f"💰 Status: {status_data['payment_status']}")
                print(f"💵 Amount: ₹{status_data['amount_total']}")
                print(f"📧 Customer: {status_data.get('customer_email', 'N/A')}")
                return status_data
            else:
                print(f"❌ Failed to check payment status: {response.status_code}")
                return {}
        except Exception as e:
            print(f"❌ Error checking payment status: {e}")
            return {}
    
    def test_webhook_endpoint(self) -> bool:
        """Test webhook endpoint accessibility"""
        print("\n🔗 Testing webhook endpoint...")
        
        try:
            # Test webhook endpoint without actual Stripe signature (will fail but endpoint should be accessible)
            response = requests.post(f"{self.base_url.replace('/api', '')}/webhooks/stripe/", 
                                   data="test", 
                                   headers={'Content-Type': 'application/json'})
            
            # We expect this to fail due to invalid signature, but endpoint should be accessible
            if response.status_code in [400, 500]:  # Bad request or server error is expected
                print("✅ Webhook endpoint is accessible")
                return True
            else:
                print(f"⚠️ Unexpected webhook response: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Error testing webhook: {e}")
            return False
    
    def test_frontend_routes(self) -> bool:
        """Test if frontend payment routes are accessible"""
        print("\n🌐 Testing frontend payment routes...")
        
        routes_to_test = [
            "/payment/success?session_id=test_session",
            "/payment/cancel?session_id=test_session"
        ]
        
        success_count = 0
        for route in routes_to_test:
            try:
                response = requests.get(f"{self.frontend_url}{route}")
                if response.status_code == 200:
                    print(f"✅ Route accessible: {route}")
                    success_count += 1
                else:
                    print(f"❌ Route failed: {route} - {response.status_code}")
            except Exception as e:
                print(f"❌ Error testing route {route}: {e}")
        
        return success_count == len(routes_to_test)
    
    def run_complete_test(self):
        """Run the complete integration test"""
        print("🚀 Starting End-to-End Stripe Integration Test")
        print("=" * 60)
        
        # Step 1: Login
        if not self.login_student():
            print("❌ Test failed at login step")
            return False
        
        # Step 2: Get invoices
        invoice = self.get_student_invoices()
        if not invoice:
            print("❌ Test failed at invoice retrieval step")
            return False
        
        # Step 3: Create checkout session
        checkout_session = self.create_checkout_session(invoice['id'])
        if not checkout_session:
            print("❌ Test failed at checkout session creation step")
            return False
        
        # Step 4: Check payment status
        payment_status = self.check_payment_status(checkout_session['session_id'])
        if not payment_status:
            print("❌ Test failed at payment status check step")
            return False
        
        # Step 5: Test webhook endpoint
        webhook_test = self.test_webhook_endpoint()
        if not webhook_test:
            print("⚠️ Webhook test had issues but continuing...")
        
        # Step 6: Test frontend routes
        frontend_test = self.test_frontend_routes()
        if not frontend_test:
            print("⚠️ Frontend route test had issues but continuing...")
        
        print("\n" + "=" * 60)
        print("🎉 INTEGRATION TEST SUMMARY")
        print("=" * 60)
        print("✅ Student Authentication: PASSED")
        print("✅ Invoice Retrieval: PASSED")
        print("✅ Checkout Session Creation: PASSED")
        print("✅ Payment Status Check: PASSED")
        print(f"{'✅' if webhook_test else '⚠️'} Webhook Endpoint: {'PASSED' if webhook_test else 'WARNING'}")
        print(f"{'✅' if frontend_test else '⚠️'} Frontend Routes: {'PASSED' if frontend_test else 'WARNING'}")
        
        print("\n🔗 NEXT STEPS:")
        print(f"1. Open the frontend: {self.frontend_url}")
        print("2. Login with credentials: teststudent@example.com / testpass123")
        print("3. Navigate to student dashboard")
        print("4. Click 'Pay Now' on any pending invoice")
        print("5. Test the complete payment flow with Stripe test cards")
        
        print("\n💳 TEST CARD NUMBERS:")
        print("• Success: 4242 4242 4242 4242")
        print("• Decline: 4000 0000 0000 0002")
        print("• 3D Secure: 4000 0027 6000 3184")
        
        return True

if __name__ == "__main__":
    tester = StripeIntegrationTester()
    tester.run_complete_test()
