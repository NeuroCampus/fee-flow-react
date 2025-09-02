#!/usr/bin/env python
"""
Quick endpoint response test
"""

import requests
import json

def test_specific_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    print("📋 Detailed Endpoint Responses")
    print("=" * 50)
    
    # Test webhook endpoint with detailed response
    print("\n1. Testing Webhook Endpoint")
    print("-" * 30)
    try:
        response = requests.post(f"{base_url}/webhooks/stripe/", 
                               json={"test": "data"},
                               headers={'Content-Type': 'application/json'})
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Content: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test checkout session endpoint
    print("\n2. Testing Checkout Session Endpoint")
    print("-" * 30)
    try:
        response = requests.post(f"{base_url}/invoices/1/create-checkout-session/", 
                               json={"amount": 1500},
                               headers={'Content-Type': 'application/json'})
        print(f"Status: {response.status_code}")
        print(f"Content: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test payment status endpoint
    print("\n3. Testing Payment Status Endpoint")
    print("-" * 30)
    try:
        response = requests.get(f"{base_url}/payments/test_session_123/status/")
        print(f"Status: {response.status_code}")
        print(f"Content: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test admin endpoints structure
    print("\n4. Testing Admin Endpoints")
    print("-" * 30)
    admin_endpoints = [
        "/students/",
        "/fee/components/",
        "/admin/invoices/",
        "/admin/reports/outstanding/"
    ]
    
    for endpoint in admin_endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            print(f"{endpoint}: Status {response.status_code}")
        except Exception as e:
            print(f"{endpoint}: Error - {e}")

if __name__ == "__main__":
    test_specific_endpoints()
