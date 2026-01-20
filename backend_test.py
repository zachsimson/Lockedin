#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Gambling Recovery App
Tests all endpoints with realistic data and error cases
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import os
from pathlib import Path

# Load backend URL from frontend .env
def get_backend_url():
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

class GamblingRecoveryAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.admin_token = None
        self.test_user_id = None
        self.admin_user_id = None
        self.results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }
        
    def log_result(self, test_name: str, success: bool, message: str = ""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.results['passed'] += 1
        else:
            self.results['failed'] += 1
            self.results['errors'].append(f"{test_name}: {message}")
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, auth_required: bool = False) -> requests.Response:
        """Make HTTP request with optional authentication"""
        url = f"{API_URL}{endpoint}"
        request_headers = headers or {}
        
        if auth_required and self.auth_token:
            request_headers['Authorization'] = f"Bearer {self.auth_token}"
        
        try:
            if method.upper() == 'GET':
                response = self.session.get(url, headers=request_headers, timeout=30)
            elif method.upper() == 'POST':
                response = self.session.post(url, json=data, headers=request_headers, timeout=30)
            elif method.upper() == 'PUT':
                response = self.session.put(url, json=data, headers=request_headers, timeout=30)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            return response
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            raise
    
    def test_health_check(self):
        """Test basic API health"""
        try:
            response = self.make_request('GET', '/')
            if response.status_code == 200:
                data = response.json()
                self.log_result("API Health Check", True, f"Status: {data.get('status', 'unknown')}")
            else:
                self.log_result("API Health Check", False, f"Status code: {response.status_code}")
        except Exception as e:
            self.log_result("API Health Check", False, f"Error: {str(e)}")
    
    # ============= AUTHENTICATION TESTS =============
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        test_data = {
            "username": "recovery_seeker_2024",
            "email": "recovery.seeker@example.com",
            "password": "SecurePass123!",
            "gambling_weekly_amount": 250.0
        }
        
        try:
            response = self.make_request('POST', '/auth/register', test_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.auth_token = data['access_token']
                    self.test_user_id = data['user']['_id']
                    self.log_result("User Registration", True, f"User ID: {self.test_user_id}")
                else:
                    self.log_result("User Registration", False, "Missing token or user data")
            else:
                self.log_result("User Registration", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("User Registration", False, f"Error: {str(e)}")
    
    def test_duplicate_registration(self):
        """Test duplicate email registration (should fail)"""
        test_data = {
            "username": "another_user",
            "email": "recovery.seeker@example.com",  # Same email as above
            "password": "AnotherPass123!",
            "gambling_weekly_amount": 100.0
        }
        
        try:
            response = self.make_request('POST', '/auth/register', test_data)
            
            if response.status_code == 400:
                self.log_result("Duplicate Email Registration", True, "Correctly rejected duplicate email")
            else:
                self.log_result("Duplicate Email Registration", False, f"Should have failed with 400, got {response.status_code}")
        except Exception as e:
            self.log_result("Duplicate Email Registration", False, f"Error: {str(e)}")
    
    def test_user_login(self):
        """Test user login endpoint"""
        test_data = {
            "email": "recovery.seeker@example.com",
            "password": "SecurePass123!"
        }
        
        try:
            response = self.make_request('POST', '/auth/login', test_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data:
                    self.auth_token = data['access_token']
                    self.log_result("User Login", True, "Login successful")
                else:
                    self.log_result("User Login", False, "Missing access token")
            else:
                self.log_result("User Login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_result("User Login", False, f"Error: {str(e)}")
    
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        test_data = {
            "email": "recovery.seeker@example.com",
            "password": "WrongPassword123!"
        }
        
        try:
            response = self.make_request('POST', '/auth/login', test_data)
            
            if response.status_code == 401:
                self.log_result("Invalid Login", True, "Correctly rejected invalid credentials")
            else:
                self.log_result("Invalid Login", False, f"Should have failed with 401, got {response.status_code}")
        except Exception as e:
            self.log_result("Invalid Login", False, f"Error: {str(e)}")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        try:
            response = self.make_request('GET', '/auth/me', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'username' in data and 'email' in data:
                    self.log_result("Get Current User", True, f"Username: {data['username']}")
                else:
                    self.log_result("Get Current User", False, "Missing user data")
            else:
                self.log_result("Get Current User", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Current User", False, f"Error: {str(e)}")
    
    def test_unauthorized_access(self):
        """Test accessing protected endpoint without token"""
        try:
            response = self.make_request('GET', '/auth/me')
            
            if response.status_code == 401 or response.status_code == 403:
                self.log_result("Unauthorized Access", True, "Correctly rejected unauthorized request")
            else:
                self.log_result("Unauthorized Access", False, f"Should have failed with 401/403, got {response.status_code}")
        except Exception as e:
            self.log_result("Unauthorized Access", False, f"Error: {str(e)}")
    
    # ============= RECOVERY TRACKING TESTS =============
    
    def test_recovery_stats(self):
        """Test getting recovery statistics"""
        try:
            response = self.make_request('GET', '/recovery/stats', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['days_sober', 'money_saved', 'gambling_weekly_amount']
                if all(field in data for field in required_fields):
                    self.log_result("Recovery Stats", True, f"Days sober: {data['days_sober']}, Money saved: ${data['money_saved']}")
                else:
                    self.log_result("Recovery Stats", False, f"Missing required fields. Got: {list(data.keys())}")
            else:
                self.log_result("Recovery Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Recovery Stats", False, f"Error: {str(e)}")
    
    def test_report_relapse(self):
        """Test reporting a relapse"""
        test_data = {
            "amount": 75.50,
            "notes": "Had a weak moment at the casino. Feeling disappointed but ready to restart."
        }
        
        try:
            response = self.make_request('POST', '/recovery/relapse', test_data, auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'new_start_date' in data:
                    self.log_result("Report Relapse", True, "Relapse recorded and timer reset")
                else:
                    self.log_result("Report Relapse", False, "Missing response data")
            else:
                self.log_result("Report Relapse", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Report Relapse", False, f"Error: {str(e)}")
    
    def test_add_gambling_history(self):
        """Test adding gambling history entry"""
        test_data = {
            "amount": 120.0,
            "date": (datetime.now() - timedelta(days=30)).isoformat(),
            "notes": "Lost money on sports betting before starting recovery"
        }
        
        try:
            response = self.make_request('POST', '/recovery/gambling-history', test_data, auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Add Gambling History", True, "History entry added")
                else:
                    self.log_result("Add Gambling History", False, "Missing response message")
            else:
                self.log_result("Add Gambling History", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Add Gambling History", False, f"Error: {str(e)}")
    
    def test_get_gambling_history(self):
        """Test retrieving gambling history"""
        try:
            response = self.make_request('GET', '/recovery/gambling-history', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'history' in data and isinstance(data['history'], list):
                    self.log_result("Get Gambling History", True, f"Retrieved {len(data['history'])} entries")
                else:
                    self.log_result("Get Gambling History", False, "Invalid history format")
            else:
                self.log_result("Get Gambling History", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Gambling History", False, f"Error: {str(e)}")
    
    # ============= CHAT TESTS =============
    
    def test_chat_history(self):
        """Test getting chat message history"""
        try:
            response = self.make_request('GET', '/chat/history', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'messages' in data and isinstance(data['messages'], list):
                    self.log_result("Chat History", True, f"Retrieved {len(data['messages'])} messages")
                else:
                    self.log_result("Chat History", False, "Invalid messages format")
            else:
                self.log_result("Chat History", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Chat History", False, f"Error: {str(e)}")
    
    # ============= BLOCKING TESTS =============
    
    def test_get_blocked_domains(self):
        """Test getting list of blocked gambling domains"""
        try:
            response = self.make_request('GET', '/blocking/domains', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'domains' in data and isinstance(data['domains'], list):
                    self.log_result("Get Blocked Domains", True, f"Retrieved {len(data['domains'])} domains")
                else:
                    self.log_result("Get Blocked Domains", False, "Invalid domains format")
            else:
                self.log_result("Get Blocked Domains", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Blocked Domains", False, f"Error: {str(e)}")
    
    def test_enable_blocking(self):
        """Test enabling/disabling blocking status"""
        try:
            # Test enabling
            response = self.make_request('POST', '/blocking/enable', {"enabled": True}, auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('blocking_enabled') == True:
                    self.log_result("Enable Blocking", True, "Blocking enabled successfully")
                else:
                    self.log_result("Enable Blocking", False, "Blocking not enabled properly")
            else:
                self.log_result("Enable Blocking", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Enable Blocking", False, f"Error: {str(e)}")
    
    def test_get_blocking_status(self):
        """Test getting current blocking status"""
        try:
            response = self.make_request('GET', '/blocking/status', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['blocking_enabled', 'is_blocked']
                if all(field in data for field in required_fields):
                    self.log_result("Get Blocking Status", True, f"Blocking enabled: {data['blocking_enabled']}")
                else:
                    self.log_result("Get Blocking Status", False, "Missing status fields")
            else:
                self.log_result("Get Blocking Status", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Blocking Status", False, f"Error: {str(e)}")
    
    # ============= SETTINGS TESTS =============
    
    def test_get_discord_link(self):
        """Test getting Discord community link"""
        try:
            response = self.make_request('GET', '/settings/discord-link', auth_required=True)
            
            if response.status_code == 200:
                data = response.json()
                if 'discord_link' in data:
                    self.log_result("Get Discord Link", True, f"Link: {data['discord_link']}")
                else:
                    self.log_result("Get Discord Link", False, "Missing discord_link field")
            else:
                self.log_result("Get Discord Link", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Get Discord Link", False, f"Error: {str(e)}")
    
    # ============= ADMIN TESTS =============
    
    def create_admin_user(self):
        """Create an admin user for testing admin endpoints"""
        admin_data = {
            "username": "admin_recovery_2024",
            "email": "admin@recoveryapp.com",
            "password": "AdminSecure123!",
            "gambling_weekly_amount": 0.0
        }
        
        try:
            response = self.make_request('POST', '/auth/register', admin_data)
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data['access_token']
                self.admin_user_id = data['user']['_id']
                
                # Note: In a real scenario, we'd need to manually set role=admin in MongoDB
                # For testing purposes, we'll try the admin endpoints and see if they work
                self.log_result("Create Admin User", True, f"Admin user created: {self.admin_user_id}")
                return True
            else:
                self.log_result("Create Admin User", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("Create Admin User", False, f"Error: {str(e)}")
            return False
    
    def test_admin_get_users(self):
        """Test getting all users (admin only)"""
        if not self.admin_token:
            self.log_result("Admin Get Users", False, "No admin token available")
            return
        
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = self.make_request('GET', '/admin/users', headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if 'users' in data and isinstance(data['users'], list):
                    self.log_result("Admin Get Users", True, f"Retrieved {len(data['users'])} users")
                else:
                    self.log_result("Admin Get Users", False, "Invalid users format")
            elif response.status_code == 403:
                self.log_result("Admin Get Users", False, "Access denied - user not admin (expected for test)")
            else:
                self.log_result("Admin Get Users", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Get Users", False, f"Error: {str(e)}")
    
    def test_admin_block_user(self):
        """Test blocking a user (admin only)"""
        if not self.admin_token or not self.test_user_id:
            self.log_result("Admin Block User", False, "Missing admin token or test user ID")
            return
        
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = self.make_request('POST', f'/admin/block-user/{self.test_user_id}', 
                                      {"reason": "Test blocking"}, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Admin Block User", True, "User blocked successfully")
                else:
                    self.log_result("Admin Block User", False, "Missing response message")
            elif response.status_code == 403:
                self.log_result("Admin Block User", False, "Access denied - user not admin (expected for test)")
            else:
                self.log_result("Admin Block User", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Block User", False, f"Error: {str(e)}")
    
    def test_admin_unblock_user(self):
        """Test unblocking a user (admin only)"""
        if not self.admin_token or not self.test_user_id:
            self.log_result("Admin Unblock User", False, "Missing admin token or test user ID")
            return
        
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = self.make_request('POST', f'/admin/unblock-user/{self.test_user_id}', 
                                      headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data:
                    self.log_result("Admin Unblock User", True, "User unblocked successfully")
                else:
                    self.log_result("Admin Unblock User", False, "Missing response message")
            elif response.status_code == 403:
                self.log_result("Admin Unblock User", False, "Access denied - user not admin (expected for test)")
            else:
                self.log_result("Admin Unblock User", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Unblock User", False, f"Error: {str(e)}")
    
    def test_admin_stats(self):
        """Test getting admin dashboard stats"""
        if not self.admin_token:
            self.log_result("Admin Stats", False, "No admin token available")
            return
        
        try:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = self.make_request('GET', '/admin/stats', headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ['total_users', 'active_subscriptions', 'blocked_users', 'total_messages']
                if all(field in data for field in required_fields):
                    self.log_result("Admin Stats", True, f"Total users: {data['total_users']}")
                else:
                    self.log_result("Admin Stats", False, "Missing stats fields")
            elif response.status_code == 403:
                self.log_result("Admin Stats", False, "Access denied - user not admin (expected for test)")
            else:
                self.log_result("Admin Stats", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Admin Stats", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all API tests in sequence"""
        print(f"🧪 Starting Gambling Recovery API Tests")
        print(f"📡 Backend URL: {BASE_URL}")
        print(f"🔗 API Base: {API_URL}")
        print("=" * 60)
        
        # Basic health check
        self.test_health_check()
        
        # Authentication tests
        print("\n🔐 AUTHENTICATION TESTS")
        self.test_user_registration()
        self.test_duplicate_registration()
        self.test_user_login()
        self.test_invalid_login()
        self.test_get_current_user()
        self.test_unauthorized_access()
        
        # Recovery tracking tests
        print("\n📊 RECOVERY TRACKING TESTS")
        self.test_recovery_stats()
        self.test_report_relapse()
        self.test_add_gambling_history()
        self.test_get_gambling_history()
        
        # Chat tests
        print("\n💬 CHAT TESTS")
        self.test_chat_history()
        
        # Blocking tests
        print("\n🚫 BLOCKING TESTS")
        self.test_get_blocked_domains()
        self.test_enable_blocking()
        self.test_get_blocking_status()
        
        # Settings tests
        print("\n⚙️ SETTINGS TESTS")
        self.test_get_discord_link()
        
        # Admin tests
        print("\n👑 ADMIN TESTS")
        if self.create_admin_user():
            self.test_admin_get_users()
            self.test_admin_block_user()
            self.test_admin_unblock_user()
            self.test_admin_stats()
        
        # Summary
        print("\n" + "=" * 60)
        print(f"📋 TEST SUMMARY")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed'] / (self.results['passed'] + self.results['failed']) * 100):.1f}%")
        
        if self.results['errors']:
            print(f"\n🚨 FAILED TESTS:")
            for error in self.results['errors']:
                print(f"   • {error}")
        
        return self.results

if __name__ == "__main__":
    tester = GamblingRecoveryAPITester()
    results = tester.run_all_tests()