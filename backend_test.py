#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for LockedIn Chess System
Tests all chess endpoints with proper authentication and validation
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Optional

# Configuration
BASE_URL = "https://recovery-app-8.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class ChessAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.user1_token = None
        self.user2_token = None
        self.user1_id = None
        self.user2_id = None
        self.test_game_id = None
        self.results = []
        
    def log_result(self, test_name: str, success: bool, message: str, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def make_request(self, method: str, endpoint: str, data: dict = None, headers: dict = None, params: dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        req_headers = headers or self.headers
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=req_headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=req_headers, json=data, timeout=30)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=req_headers, json=data, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}, 0
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}, 0
    
    def setup_test_users(self):
        """Create two test users for chess testing"""
        print("\n=== Setting up test users ===")
        
        # Create user 1
        user1_data = {
            "username": "chessplayer1",
            "email": "chessplayer1@test.com", 
            "password": "testpass123"
        }
        
        success, response, status = self.make_request("POST", "/auth/register", user1_data)
        if success:
            self.user1_token = response.get("access_token")
            self.user1_id = response.get("user", {}).get("_id")
            self.log_result("User1 Registration", True, "Chess player 1 registered successfully")
        else:
            # Try login if user exists
            login_data = {"email": user1_data["email"], "password": user1_data["password"]}
            success, response, status = self.make_request("POST", "/auth/login", login_data)
            if success:
                self.user1_token = response.get("access_token")
                self.user1_id = response.get("user", {}).get("_id")
                self.log_result("User1 Login", True, "Chess player 1 logged in successfully")
            else:
                self.log_result("User1 Setup", False, "Failed to setup user 1", str(response))
                return False
        
        # Create user 2
        user2_data = {
            "username": "chessplayer2",
            "email": "chessplayer2@test.com",
            "password": "testpass123"
        }
        
        success, response, status = self.make_request("POST", "/auth/register", user2_data)
        if success:
            self.user2_token = response.get("access_token")
            self.user2_id = response.get("user", {}).get("_id")
            self.log_result("User2 Registration", True, "Chess player 2 registered successfully")
        else:
            # Try login if user exists
            login_data = {"email": user2_data["email"], "password": user2_data["password"]}
            success, response, status = self.make_request("POST", "/auth/login", login_data)
            if success:
                self.user2_token = response.get("access_token")
                self.user2_id = response.get("user", {}).get("_id")
                self.log_result("User2 Login", True, "Chess player 2 logged in successfully")
            else:
                self.log_result("User2 Setup", False, "Failed to setup user 2", str(response))
                return False
        
        return True
    
    def test_chess_stats_endpoints(self):
        """Test chess stats endpoints"""
        print("\n=== Testing Chess Stats Endpoints ===")
        
        # Test GET /api/chess/stats (current user)
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        success, response, status = self.make_request("GET", "/chess/stats", headers=headers)
        if success:
            # Check if response has stats object
            stats = response.get("stats", response)
            required_fields = ["rating", "wins", "losses", "draws", "games_played"]
            has_all_fields = all(field in stats for field in required_fields)
            if has_all_fields:
                self.log_result("Get Current User Chess Stats", True, f"Stats retrieved: Rating {stats.get('rating', 'N/A')}")
            else:
                self.log_result("Get Current User Chess Stats", False, "Missing required fields", f"Response: {response}")
        else:
            self.log_result("Get Current User Chess Stats", False, "Failed to get stats", f"Status: {status}, Response: {response}")
        
        # Test GET /api/chess/stats/{user_id} (other user)
        if self.user2_id:
            success, response, status = self.make_request("GET", f"/chess/stats/{self.user2_id}", headers=headers)
            if success:
                # Check if response has stats object
                stats = response.get("stats", response)
                required_fields = ["rating", "wins", "losses", "draws", "games_played"]
                has_all_fields = all(field in stats for field in required_fields)
                if has_all_fields:
                    self.log_result("Get Other User Chess Stats", True, f"Other user stats retrieved: Rating {stats.get('rating', 'N/A')}")
                else:
                    self.log_result("Get Other User Chess Stats", False, "Missing required fields", f"Response: {response}")
            else:
                self.log_result("Get Other User Chess Stats", False, "Failed to get other user stats", f"Status: {status}, Response: {response}")
    
    def test_chess_leaderboard(self):
        """Test chess leaderboard endpoint"""
        print("\n=== Testing Chess Leaderboard ===")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        # Test different leaderboard types
        for leaderboard_type in ["rating", "wins", "games"]:
            params = {"type": leaderboard_type, "limit": 20}
            success, response, status = self.make_request("GET", "/chess/leaderboard", headers=headers, params=params)
            
            if success:
                if "leaderboard" in response and isinstance(response["leaderboard"], list):
                    self.log_result(f"Chess Leaderboard ({leaderboard_type})", True, f"Retrieved {len(response['leaderboard'])} entries")
                else:
                    self.log_result(f"Chess Leaderboard ({leaderboard_type})", False, "Invalid leaderboard format", f"Response: {response}")
            else:
                self.log_result(f"Chess Leaderboard ({leaderboard_type})", False, f"Failed to get {leaderboard_type} leaderboard", f"Status: {status}, Response: {response}")
    
    def test_chess_game_creation(self):
        """Test chess game creation"""
        print("\n=== Testing Chess Game Creation ===")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        # Test different game modes
        game_modes = [
            {"mode": "quick"},
            {"mode": "ranked"},
            {"mode": "casual"},
            {"mode": "friend", "opponent_id": self.user2_id}
        ]
        
        for game_data in game_modes:
            success, response, status = self.make_request("POST", "/chess/create", game_data, headers)
            
            if success:
                if "game_id" in response:
                    # Store the first successful game ID for later tests
                    if not self.test_game_id and game_data["mode"] == "friend":
                        self.test_game_id = response["game_id"]
                    self.log_result(f"Create Chess Game ({game_data['mode']})", True, f"Game created: {response['game_id']}")
                else:
                    self.log_result(f"Create Chess Game ({game_data['mode']})", False, "No game_id in response", f"Response: {response}")
            else:
                self.log_result(f"Create Chess Game ({game_data['mode']})", False, f"Failed to create {game_data['mode']} game", f"Status: {status}, Response: {response}")
    
    def test_chess_game_state(self):
        """Test getting chess game state"""
        print("\n=== Testing Chess Game State ===")
        
        if not self.test_game_id:
            self.log_result("Get Chess Game State", False, "No test game available", "Game creation must succeed first")
            return
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        success, response, status = self.make_request("GET", f"/chess/game/{self.test_game_id}", headers=headers)
        
        if success:
            required_fields = ["game_id", "white_player", "black_player", "current_turn", "game_state", "status"]
            has_all_fields = all(field in response for field in required_fields)
            
            if has_all_fields:
                self.log_result("Get Chess Game State", True, f"Game state retrieved, status: {response.get('status')}")
                
                # Check if legal moves are provided
                if "legal_moves" in response:
                    self.log_result("Chess Legal Moves", True, f"Legal moves provided: {len(response['legal_moves'])} moves")
                else:
                    self.log_result("Chess Legal Moves", False, "Legal moves not provided")
            else:
                missing_fields = [field for field in required_fields if field not in response]
                self.log_result("Get Chess Game State", False, f"Missing fields: {missing_fields}", f"Response: {response}")
        else:
            self.log_result("Get Chess Game State", False, "Failed to get game state", f"Status: {status}, Response: {response}")
    
    def test_chess_moves(self):
        """Test making chess moves"""
        print("\n=== Testing Chess Moves ===")
        
        if not self.test_game_id:
            self.log_result("Chess Move Test", False, "No test game available", "Game creation must succeed first")
            return
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        # Test valid opening move (e2 to e4)
        move_data = {
            "game_id": self.test_game_id,
            "from_square": "e2",
            "to_square": "e4"
        }
        
        success, response, status = self.make_request("POST", "/chess/move", move_data, headers)
        
        if success:
            if "move_made" in response or "success" in response or response.get("message"):
                self.log_result("Valid Chess Move", True, "Legal move accepted (e2-e4)")
                
                # Test illegal move (should fail)
                illegal_move = {
                    "game_id": self.test_game_id,
                    "from_square": "e1",  # King
                    "to_square": "e5"     # Illegal king move
                }
                
                success2, response2, status2 = self.make_request("POST", "/chess/move", illegal_move, headers)
                if not success2:
                    self.log_result("Illegal Move Rejection", True, "Illegal move properly rejected")
                else:
                    self.log_result("Illegal Move Rejection", False, "Illegal move was accepted", f"Response: {response2}")
                
                # Test move when not your turn (switch to user2)
                headers2 = self.headers.copy()
                headers2["Authorization"] = f"Bearer {self.user1_token}"  # Same user trying to move again
                
                another_move = {
                    "game_id": self.test_game_id,
                    "from_square": "d2",
                    "to_square": "d4"
                }
                
                success3, response3, status3 = self.make_request("POST", "/chess/move", another_move, headers2)
                if not success3:
                    self.log_result("Turn Validation", True, "Move rejected when not player's turn")
                else:
                    self.log_result("Turn Validation", False, "Move allowed when not player's turn", f"Response: {response3}")
                    
            else:
                self.log_result("Valid Chess Move", False, "Unexpected response format", f"Response: {response}")
        else:
            self.log_result("Valid Chess Move", False, "Legal move rejected", f"Status: {status}, Response: {response}")
    
    def test_chess_resign(self):
        """Test chess resignation"""
        print("\n=== Testing Chess Resignation ===")
        
        if not self.test_game_id:
            self.log_result("Chess Resign Test", False, "No test game available", "Game creation must succeed first")
            return
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        resign_data = {"game_id": self.test_game_id}
        success, response, status = self.make_request("POST", "/chess/resign", resign_data, headers)
        
        if success:
            if "winner" in response or "resigned" in str(response).lower():
                self.log_result("Chess Resignation", True, "Resignation processed successfully")
            else:
                self.log_result("Chess Resignation", False, "Unexpected resignation response", f"Response: {response}")
        else:
            self.log_result("Chess Resignation", False, "Failed to resign", f"Status: {status}, Response: {response}")
    
    def test_chess_active_games(self):
        """Test getting active games"""
        print("\n=== Testing Active Games ===")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        success, response, status = self.make_request("GET", "/chess/active-games", headers=headers)
        
        if success:
            if "games" in response and isinstance(response["games"], list):
                self.log_result("Get Active Chess Games", True, f"Retrieved {len(response['games'])} active games")
            else:
                self.log_result("Get Active Chess Games", False, "Invalid response format", f"Response: {response}")
        else:
            self.log_result("Get Active Chess Games", False, "Failed to get active games", f"Status: {status}, Response: {response}")
    
    def test_chess_history(self):
        """Test getting chess game history"""
        print("\n=== Testing Chess History ===")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        params = {"limit": 10}
        success, response, status = self.make_request("GET", "/chess/history", headers=headers, params=params)
        
        if success:
            if "games" in response and isinstance(response["games"], list):
                self.log_result("Get Chess History", True, f"Retrieved {len(response['games'])} completed games")
            else:
                self.log_result("Get Chess History", False, "Invalid response format", f"Response: {response}")
        else:
            self.log_result("Get Chess History", False, "Failed to get game history", f"Status: {status}, Response: {response}")
    
    def test_chess_queue(self):
        """Test chess matchmaking queue"""
        print("\n=== Testing Chess Queue ===")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        # Test leaving queue (should work even if not in queue)
        success, response, status = self.make_request("DELETE", "/chess/queue", headers=headers)
        
        if success or status == 404:  # 404 is acceptable if not in queue
            self.log_result("Leave Chess Queue", True, "Queue leave operation completed")
        else:
            self.log_result("Leave Chess Queue", False, "Failed to leave queue", f"Status: {status}, Response: {response}")
    
    def test_checkmate_detection(self):
        """Test checkmate detection (simplified test)"""
        print("\n=== Testing Checkmate Detection ===")
        
        # This is a complex test that would require setting up a specific board position
        # For now, we'll just verify that the game state includes proper status tracking
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {self.user1_token}"
        
        # Create a new game for testing
        game_data = {"mode": "casual"}
        success, response, status = self.make_request("POST", "/chess/create", game_data, headers)
        
        if success and "game_id" in response:
            game_id = response["game_id"]
            
            # Get game state to check status tracking
            success2, response2, status2 = self.make_request("GET", f"/chess/game/{game_id}", headers=headers)
            
            if success2 and "status" in response2:
                valid_statuses = ["active", "waiting", "completed", "checkmate", "stalemate", "draw"]
                if response2["status"] in valid_statuses:
                    self.log_result("Game Status Tracking", True, f"Game status properly tracked: {response2['status']}")
                else:
                    self.log_result("Game Status Tracking", False, f"Invalid game status: {response2['status']}")
            else:
                self.log_result("Game Status Tracking", False, "No status field in game state")
        else:
            self.log_result("Checkmate Detection Setup", False, "Could not create test game for checkmate detection")
    
    def run_all_tests(self):
        """Run all chess API tests"""
        print("🏁 Starting Comprehensive Chess System API Testing")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_users():
            print("❌ Test setup failed - cannot continue")
            return
        
        # Run all tests
        self.test_chess_stats_endpoints()
        self.test_chess_leaderboard()
        self.test_chess_game_creation()
        self.test_chess_game_state()
        self.test_chess_moves()
        self.test_chess_active_games()
        self.test_chess_history()
        self.test_chess_queue()
        self.test_checkmate_detection()
        self.test_chess_resign()  # Run resign last as it ends the game
        
        # Summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("🏆 CHESS SYSTEM API TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.results if "✅ PASS" in r["status"])
        failed = sum(1 for r in self.results if "❌ FAIL" in r["status"])
        total = len(self.results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.results:
                if "❌ FAIL" in result["status"]:
                    print(f"  • {result['test']}: {result['message']}")
                    if result["details"]:
                        print(f"    Details: {result['details']}")
        
        print(f"\n✅ PASSED TESTS:")
        for result in self.results:
            if "✅ PASS" in result["status"]:
                print(f"  • {result['test']}: {result['message']}")

if __name__ == "__main__":
    tester = ChessAPITester()
    tester.run_all_tests()