#!/usr/bin/env python3
"""
ClearDeal Backend API Test Suite - Review Request Specific Tests
Tests the exact scenarios specified in the review request.
"""

import asyncio
import aiohttp
import json
import sys

BASE_URL = "http://localhost:8001"
HEADERS = {"Content-Type": "application/json"}

class TestLogger:
    def __init__(self):
        self.tests_passed = 0
        self.tests_failed = 0
        self.critical_failures = []
        
    def log_success(self, test_name: str, details: str = ""):
        print(f"✅ {test_name}")
        if details:
            print(f"   {details}")
        self.tests_passed += 1
        
    def log_failure(self, test_name: str, details: str = "", critical: bool = True):
        print(f"❌ {test_name}")
        if details:
            print(f"   {details}")
        self.tests_failed += 1
        if critical:
            self.critical_failures.append(f"{test_name}: {details}")
            
    def log_info(self, message: str):
        print(f"ℹ️  {message}")

logger = TestLogger()

async def make_request(session: aiohttp.ClientSession, method: str, endpoint: str, 
                      data: dict = None, token: str = None):
    """Make HTTP request and return response details"""
    url = f"{BASE_URL}{endpoint}"
    headers = HEADERS.copy()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        async with session.request(method, url, json=data, headers=headers) as response:
            try:
                response_data = await response.json()
            except:
                response_data = await response.text()
            return {
                "status": response.status,
                "data": response_data,
                "success": response.status < 400
            }
    except Exception as e:
        return {
            "status": 0,
            "data": {"error": str(e)},
            "success": False
        }

async def test_health_checks(session: aiohttp.ClientSession):
    """1. Health Check Tests"""
    print("\n" + "="*60)
    print("1. HEALTH CHECK TESTS")
    print("="*60)
    
    # GET /health - Should return status "healthy"
    response = await make_request(session, "GET", "/health")
    if response["success"] and isinstance(response["data"], dict) and response["data"].get("status") == "healthy":
        logger.log_success("GET /health", f"Status: {response['data'].get('status')}, DB: {response['data'].get('database')}")
    else:
        logger.log_failure("GET /health", f"Status {response['status']}: {response['data']}")
    
    # GET /api/health - Should return API status (or 404 if not implemented)
    response = await make_request(session, "GET", "/api/health")
    if response["status"] == 404:
        logger.log_success("GET /api/health", "Endpoint not implemented (404 - acceptable)")
    elif response["success"]:
        logger.log_success("GET /api/health", f"API status returned")
    else:
        logger.log_failure("GET /api/health", f"Status {response['status']}: {response['data']}", critical=False)

async def test_authentication_flow(session: aiohttp.ClientSession):
    """2. Authentication Flow Tests"""
    print("\n" + "="*60)
    print("2. AUTHENTICATION FLOW TESTS")
    print("="*60)
    
    global user_token
    
    # POST /api/auth/register - Register a new user with role "owner"
    register_data = {
        "email": "testowner@test.com",
        "password": "test123456",
        "full_name": "Test Owner",
        "phone": "9876543210",
        "role": "owner"
    }
    
    response = await make_request(session, "POST", "/api/auth/register", register_data)
    if response["success"] and response["data"].get("success"):
        user_token = response["data"].get("token")
        user_info = response["data"].get("user", {})
        logger.log_success("POST /api/auth/register", 
                          f"User created - Email: {user_info.get('email')}, Role: {user_info.get('role')}")
    else:
        logger.log_failure("POST /api/auth/register", f"Status {response['status']}: {response['data']}")
        return None
    
    # Test error handling: Try registering same email again (should get AUTH_1005 error)
    response = await make_request(session, "POST", "/api/auth/register", register_data)
    if not response["success"]:
        error_data = response["data"]
        if ("AUTH_1005" in str(error_data) or 
            "already exists" in str(error_data).lower() or
            "email" in str(error_data).lower()):
            logger.log_success("Duplicate email registration error", 
                              f"Correctly rejected: {error_data}")
        else:
            logger.log_failure("Duplicate email registration error", 
                              f"Wrong error format: Status {response['status']}: {error_data}")
    else:
        logger.log_failure("Duplicate email registration error", 
                          "Should have failed but succeeded")
    
    # POST /api/auth/login - Login with the created user
    login_data = {
        "email": "testowner@test.com",
        "password": "test123456"
    }
    
    response = await make_request(session, "POST", "/api/auth/login", login_data)
    if response["success"] and response["data"].get("success"):
        login_token = response["data"].get("token")
        logger.log_success("POST /api/auth/login", "Login successful, token received")
    else:
        logger.log_failure("POST /api/auth/login", f"Status {response['status']}: {response['data']}")
    
    # GET /api/auth/me - Get user profile with token
    if user_token:
        response = await make_request(session, "GET", "/api/auth/me", token=user_token)
        if response["success"] and response["data"].get("success"):
            user_profile = response["data"].get("user", {})
            logger.log_success("GET /api/auth/me", 
                              f"Profile retrieved - Email: {user_profile.get('email')}")
        else:
            logger.log_failure("GET /api/auth/me", f"Status {response['status']}: {response['data']}")
    
    return user_token

async def test_company_flow(session: aiohttp.ClientSession, token: str):
    """3. Company Flow Tests"""
    print("\n" + "="*60)
    print("3. COMPANY FLOW TESTS")
    print("="*60)
    
    if not token:
        logger.log_failure("Company Flow", "No authentication token available")
        return
    
    # POST /api/companies - Create company
    company_data = {
        "name": "Test Billboard Co",
        "gst_number": "36AABCU9603R1ZM",
        "director_name": "Test Director", 
        "company_type": "billboard_owner",
        "city": "Hyderabad",
        "address": "Test Address 123",
        "phone": "9876543210"
    }
    
    response = await make_request(session, "POST", "/api/companies", company_data, token)
    if response["success"] and response["data"].get("success"):
        company_info = response["data"].get("company", {})
        logger.log_success("POST /api/companies", 
                          f"Company created - Name: {company_info.get('name')}, GST: {company_info.get('gst_number')}")
    else:
        logger.log_failure("POST /api/companies", f"Status {response['status']}: {response['data']}")
        return
    
    # POST /api/companies/verify-gst - Verify GST (mocked)
    response = await make_request(session, "POST", "/api/companies/verify-gst", {}, token)
    if response["success"] and response["data"].get("success"):
        is_mocked = response["data"].get("mocked", False)
        message = response["data"].get("message", "")
        logger.log_success("POST /api/companies/verify-gst", 
                          f"GST verification: {message} (Mocked: {is_mocked})")
    else:
        logger.log_failure("POST /api/companies/verify-gst", f"Status {response['status']}: {response['data']}")
    
    # GET /api/companies/me - Get company details
    response = await make_request(session, "GET", "/api/companies/me", token=token)
    if response["success"] and response["data"].get("success"):
        company = response["data"].get("company", {})
        logger.log_success("GET /api/companies/me", 
                          f"Company details retrieved - Name: {company.get('name')}, Verified: GST({company.get('gst_verified')})")
    else:
        logger.log_failure("GET /api/companies/me", f"Status {response['status']}: {response['data']}")

async def test_error_handling(session: aiohttp.ClientSession):
    """4. Error Handling Tests"""
    print("\n" + "="*60)
    print("4. ERROR HANDLING TESTS")
    print("="*60)
    
    # Test invalid token (should return AUTH_1003)
    invalid_token = "invalid.jwt.token.here"
    response = await make_request(session, "GET", "/api/auth/me", token=invalid_token)
    if not response["success"]:
        error_data = response["data"]
        if ("AUTH_1003" in str(error_data) or 
            "invalid" in str(error_data).lower() or
            "token" in str(error_data).lower()):
            logger.log_success("Invalid token error handling", 
                              f"Correctly rejected invalid token: {error_data}")
        else:
            logger.log_failure("Invalid token error handling", 
                              f"Wrong error format: Status {response['status']}: {error_data}")
    else:
        logger.log_failure("Invalid token error handling", "Should have failed but succeeded")
    
    # Test accessing without company (should return BIZ_4001)
    # Create a user without company first
    user_data = {
        "email": "nocompany@test.com",
        "password": "test123456",
        "full_name": "No Company User", 
        "phone": "9876543211",
        "role": "owner"
    }
    
    response = await make_request(session, "POST", "/api/auth/register", user_data)
    if response["success"]:
        no_company_token = response["data"].get("token")
        
        # Try to access company endpoint without having a company
        response = await make_request(session, "GET", "/api/companies/me", token=no_company_token)
        if not response["success"]:
            error_data = response["data"]
            if ("BIZ_4001" in str(error_data) or 
                "company" in str(error_data).lower() or
                "registration" in str(error_data).lower()):
                logger.log_success("No company access error handling", 
                                  f"Correctly blocked access: {error_data}")
            else:
                logger.log_failure("No company access error handling", 
                                  f"Wrong error format: Status {response['status']}: {error_data}")
        else:
            logger.log_failure("No company access error handling", "Should have failed but succeeded")
    
    # Test validation errors with invalid data
    invalid_data = {
        "name": "",  # Empty name
        "gst_number": "invalid-gst",  # Invalid GST format
        "director_name": "",
        "company_type": "invalid_type",
        "city": "",
        "address": "",
        "phone": ""
    }
    
    # Use a valid token for this test
    response = await make_request(session, "POST", "/api/auth/register", {
        "email": "validation@test.com",
        "password": "test123456", 
        "full_name": "Validation Test",
        "phone": "9876543212",
        "role": "owner"
    })
    
    if response["success"]:
        validation_token = response["data"].get("token")
        response = await make_request(session, "POST", "/api/companies", invalid_data, validation_token)
        
        if not response["success"] and response["status"] in [400, 422]:
            error_data = response["data"]
            logger.log_success("Validation error handling", 
                              f"Correctly rejected invalid data: Status {response['status']}")
        else:
            logger.log_failure("Validation error handling", 
                              f"Should have rejected invalid data: Status {response['status']}: {response['data']}")

async def main():
    """Main test execution"""
    print("🚀 ClearDeal Backend API Tests - Review Request Specific")
    print(f"📍 Base URL: {BASE_URL}")
    print(f"🎯 Testing enhanced error handling with proper error codes")
    
    async with aiohttp.ClientSession() as session:
        # Test server connectivity
        response = await make_request(session, "GET", "/")
        if not response["success"] and response["status"] == 404:
            logger.log_info("Server is running (root endpoint returns 404 as expected)")
        elif response["success"]:
            logger.log_info("Server is running and responding")
        else:
            logger.log_failure("Server connectivity", f"Cannot connect: {response['data']}")
            return
        
        # Run all test suites as specified in review request
        await test_health_checks(session)
        user_token = await test_authentication_flow(session)
        await test_company_flow(session, user_token)
        await test_error_handling(session)
    
    # Print final summary
    print("\n" + "="*80)
    print("📊 FINAL TEST SUMMARY")
    print("="*80)
    print(f"✅ Passed: {logger.tests_passed}")
    print(f"❌ Failed: {logger.tests_failed}")
    print(f"📈 Total: {logger.tests_passed + logger.tests_failed}")
    
    if logger.critical_failures:
        print(f"\n🚨 CRITICAL FAILURES:")
        for failure in logger.critical_failures:
            print(f"   • {failure}")
    
    if logger.tests_failed == 0:
        print(f"\n🎉 All tests passed! Enhanced error handling is working properly.")
    else:
        print(f"\n⚠️  Some tests failed. Please review the issues above.")
    
    print("="*80)
    
    # Exit with error code if tests failed
    sys.exit(0 if logger.tests_failed == 0 else 1)

if __name__ == "__main__":
    asyncio.run(main())