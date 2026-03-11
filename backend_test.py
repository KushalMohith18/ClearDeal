#!/usr/bin/env python3
"""
ClearDeal Backend API Test Suite
Tests all major backend functionality according to the review request.
"""

import asyncio
import aiohttp
import json
import sys
from typing import Dict, Any, Optional

# Test Configuration
BASE_URL = "http://localhost:8001"
HEADERS = {"Content-Type": "application/json"}

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
        
    def add_result(self, test_name: str, success: bool, details: str = ""):
        self.results.append({
            "test": test_name,
            "passed": success,
            "details": details
        })
        if success:
            self.passed += 1
        else:
            self.failed += 1
            
    def print_summary(self):
        print(f"\n{'='*80}")
        print(f"TEST SUMMARY")
        print(f"{'='*80}")
        print(f"✅ Passed: {self.passed}")
        print(f"❌ Failed: {self.failed}")
        print(f"Total: {self.passed + self.failed}")
        
        if self.failed > 0:
            print(f"\n{'='*80}")
            print("FAILED TESTS:")
            print(f"{'='*80}")
            for result in self.results:
                if not result["passed"]:
                    print(f"❌ {result['test']}")
                    if result["details"]:
                        print(f"   Details: {result['details']}")
        
        print(f"\n{'='*80}")

# Global variables for test data
test_user_token = None
test_user_data = None
test_company_data = None

async def make_request(session: aiohttp.ClientSession, method: str, endpoint: str, 
                      data: Optional[Dict] = None, token: Optional[str] = None) -> tuple:
    """Make HTTP request and return (success, response_data, status_code)"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        async with session.request(method, url, json=data, headers=headers) as response:
            response_data = await response.json()
            return response.status < 400, response_data, response.status
    except Exception as e:
        return False, {"error": str(e)}, 0

async def test_health_endpoints(session: aiohttp.ClientSession, results: TestResults):
    """Test health check endpoints"""
    print("🔍 Testing Health Check Endpoints...")
    
    # Test 1: GET /health
    success, data, status = await make_request(session, "GET", "/health")
    if success and status == 200:
        results.add_result("Health Check /health", True, f"Status: {data}")
    else:
        results.add_result("Health Check /health", False, f"Status {status}: {data}")
    
    # Test 2: GET /api/health (this might not exist, but let's test)
    success, data, status = await make_request(session, "GET", "/api/health")
    if success and status == 200:
        results.add_result("Health Check /api/health", True, f"Status: {data}")
    elif status == 404:
        results.add_result("Health Check /api/health", True, "Endpoint not implemented (404 expected)")
    else:
        results.add_result("Health Check /api/health", False, f"Status {status}: {data}")

async def test_auth_flow(session: aiohttp.ClientSession, results: TestResults):
    """Test authentication flow"""
    global test_user_token, test_user_data
    print("🔍 Testing Authentication Flow...")
    
    # Test 1: Register new user
    register_data = {
        "email": "testowner@test.com",
        "password": "test123456",
        "full_name": "Test Owner",
        "phone": "9876543210",
        "role": "owner"
    }
    
    success, data, status = await make_request(session, "POST", "/api/auth/register", register_data)
    if success and data.get("success"):
        test_user_token = data.get("token")
        test_user_data = data.get("user")
        results.add_result("User Registration", True, f"User ID: {test_user_data.get('id')}")
    else:
        results.add_result("User Registration", False, f"Status {status}: {data}")
        return  # Stop if registration fails
    
    # Test 2: Try registering same email (should fail with AUTH_1005)
    success, data, status = await make_request(session, "POST", "/api/auth/register", register_data)
    if not success and "AUTH_1005" in str(data) or "already exists" in str(data):
        results.add_result("Duplicate Email Registration", True, "Correctly rejected duplicate email")
    else:
        results.add_result("Duplicate Email Registration", False, f"Expected error but got: Status {status}: {data}")
    
    # Test 3: Login with created user
    login_data = {
        "email": "testowner@test.com",
        "password": "test123456"
    }
    
    success, data, status = await make_request(session, "POST", "/api/auth/login", login_data)
    if success and data.get("success"):
        results.add_result("User Login", True, f"Token received")
    else:
        results.add_result("User Login", False, f"Status {status}: {data}")
    
    # Test 4: Get user profile with token
    if test_user_token:
        success, data, status = await make_request(session, "GET", "/api/auth/me", token=test_user_token)
        if success and data.get("success"):
            results.add_result("Get User Profile", True, f"Email: {data.get('user', {}).get('email')}")
        else:
            results.add_result("Get User Profile", False, f"Status {status}: {data}")
    else:
        results.add_result("Get User Profile", False, "No token available")

async def test_company_flow(session: aiohttp.ClientSession, results: TestResults):
    """Test company management flow"""
    global test_company_data
    print("🔍 Testing Company Flow...")
    
    if not test_user_token:
        results.add_result("Company Flow", False, "No auth token available")
        return
    
    # Test 1: Create company
    company_data = {
        "name": "Test Billboard Co",
        "gst_number": "36AABCU9603R1ZM", 
        "director_name": "Test Director",
        "company_type": "billboard_owner",
        "city": "Hyderabad",
        "address": "Test Address 123",
        "phone": "9876543210"
    }
    
    success, data, status = await make_request(session, "POST", "/api/companies", company_data, test_user_token)
    if success and data.get("success"):
        test_company_data = data.get("company")
        results.add_result("Create Company", True, f"Company ID: {test_company_data.get('id')}")
    else:
        results.add_result("Create Company", False, f"Status {status}: {data}")
        return
    
    # Test 2: Verify GST (mocked)
    success, data, status = await make_request(session, "POST", "/api/companies/verify-gst", {}, test_user_token)
    if success and data.get("success") and data.get("mocked"):
        results.add_result("GST Verification", True, "GST verified successfully (mocked)")
    else:
        results.add_result("GST Verification", False, f"Status {status}: {data}")
    
    # Test 3: Get company details
    success, data, status = await make_request(session, "GET", "/api/companies/me", token=test_user_token)
    if success and data.get("success"):
        company = data.get("company")
        results.add_result("Get Company Details", True, f"Company: {company.get('name')}")
    else:
        results.add_result("Get Company Details", False, f"Status {status}: {data}")

async def test_error_handling(session: aiohttp.ClientSession, results: TestResults):
    """Test error handling scenarios"""
    print("🔍 Testing Error Handling...")
    
    # Test 1: Invalid token (should return AUTH_1003 or similar)
    invalid_token = "invalid.jwt.token"
    success, data, status = await make_request(session, "GET", "/api/auth/me", token=invalid_token)
    if not success and ("AUTH_1003" in str(data) or "invalid" in str(data).lower() or "token" in str(data).lower()):
        results.add_result("Invalid Token Error", True, "Correctly rejected invalid token")
    else:
        results.add_result("Invalid Token Error", False, f"Expected auth error but got: Status {status}: {data}")
    
    # Test 2: Access without company (should return BIZ_4001 or similar)
    # First, let's create a user without company
    user_without_company_data = {
        "email": "nocompany@test.com",
        "password": "test123456", 
        "full_name": "No Company User",
        "phone": "9876543211",
        "role": "owner"
    }
    
    success, data, status = await make_request(session, "POST", "/api/auth/register", user_without_company_data)
    if success:
        no_company_token = data.get("token")
        # Try to access company endpoint without having a company
        success, data, status = await make_request(session, "GET", "/api/companies/me", token=no_company_token)
        if not success and ("BIZ_4001" in str(data) or "company" in str(data).lower()):
            results.add_result("No Company Access Error", True, "Correctly blocked access without company")
        else:
            results.add_result("No Company Access Error", False, f"Expected company error but got: Status {status}: {data}")
    else:
        results.add_result("No Company Access Error", False, "Could not create test user without company")
    
    # Test 3: Validation errors with invalid data
    invalid_company_data = {
        "name": "",  # Empty name
        "gst_number": "invalid-gst",  # Invalid GST format
        "director_name": "",
        "company_type": "invalid_type",
        "city": "",
        "address": "",
        "phone": ""
    }
    
    if test_user_token:
        success, data, status = await make_request(session, "POST", "/api/companies", invalid_company_data, test_user_token)
        if not success and (status in [400, 422] or "validation" in str(data).lower() or "invalid" in str(data).lower()):
            results.add_result("Validation Error Handling", True, "Correctly rejected invalid data")
        else:
            results.add_result("Validation Error Handling", False, f"Expected validation error but got: Status {status}: {data}")
    else:
        results.add_result("Validation Error Handling", False, "No auth token available")

async def test_billboard_endpoints(session: aiohttp.ClientSession, results: TestResults):
    """Test billboard-related endpoints"""
    print("🔍 Testing Billboard Endpoints...")
    
    if not test_user_token:
        results.add_result("Billboard Endpoints", False, "No auth token available")
        return
    
    # Test 1: Search billboards
    success, data, status = await make_request(session, "GET", "/api/billboards", token=test_user_token)
    if success and data.get("success") is not False:  # Allow empty results
        results.add_result("Search Billboards", True, f"Found {data.get('count', 0)} billboards")
    else:
        results.add_result("Search Billboards", False, f"Status {status}: {data}")
    
    # Test 2: Get my billboards
    success, data, status = await make_request(session, "GET", "/api/billboards/my", token=test_user_token)
    if success and data.get("success") is not False:  # Allow empty results
        results.add_result("Get My Billboards", True, f"User has {data.get('count', 0)} billboards")
    else:
        results.add_result("Get My Billboards", False, f"Status {status}: {data}")

async def test_additional_endpoints(session: aiohttp.ClientSession, results: TestResults):
    """Test additional endpoints mentioned in the backend"""
    print("🔍 Testing Additional Endpoints...")
    
    if not test_user_token:
        results.add_result("Additional Endpoints", False, "No auth token available")
        return
    
    # Test dashboard stats
    success, data, status = await make_request(session, "GET", "/api/dashboard/stats", token=test_user_token)
    if success and data.get("role"):
        results.add_result("Dashboard Stats", True, f"Role: {data.get('role')}")
    else:
        results.add_result("Dashboard Stats", False, f"Status {status}: {data}")
    
    # Test benchmarks
    success, data, status = await make_request(session, "GET", "/api/benchmarks", token=test_user_token)
    if success and "area" in data:
        results.add_result("Get Benchmarks", True, f"Area: {data.get('area')}")
    else:
        results.add_result("Get Benchmarks", False, f"Status {status}: {data}")

async def main():
    """Main test execution function"""
    print("🚀 Starting ClearDeal Backend API Tests")
    print(f"Base URL: {BASE_URL}")
    print("="*80)
    
    results = TestResults()
    
    async with aiohttp.ClientSession() as session:
        # Test server connectivity first
        try:
            async with session.get(f"{BASE_URL}/") as response:
                if response.status == 200:
                    print("✅ Server is reachable")
                else:
                    print(f"⚠️ Server responded with status {response.status}")
        except Exception as e:
            print(f"❌ Cannot connect to server: {e}")
            results.add_result("Server Connectivity", False, f"Connection failed: {e}")
            results.print_summary()
            return
        
        # Run all test suites
        await test_health_endpoints(session, results)
        await test_auth_flow(session, results)
        await test_company_flow(session, results)
        await test_error_handling(session, results)
        await test_billboard_endpoints(session, results)
        await test_additional_endpoints(session, results)
    
    results.print_summary()
    
    # Return non-zero exit code if any tests failed
    if results.failed > 0:
        sys.exit(1)
    else:
        print("🎉 All tests passed!")

if __name__ == "__main__":
    asyncio.run(main())