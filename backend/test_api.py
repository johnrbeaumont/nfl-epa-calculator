"""
Test script for EPA API

Run this after starting the FastAPI server to test the endpoints.
"""

import requests
import json

# API base URL
BASE_URL = "http://localhost:8000"

def test_root():
    """Test root endpoint"""
    print("\n" + "="*60)
    print("Testing Root Endpoint: GET /")
    print("="*60)

    response = requests.get(f"{BASE_URL}/")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_health():
    """Test health check endpoint"""
    print("\n" + "="*60)
    print("Testing Health Endpoint: GET /api/health")
    print("="*60)

    response = requests.get(f"{BASE_URL}/api/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_calculate_epa():
    """Test EPA calculation endpoint"""
    print("\n" + "="*60)
    print("Testing EPA Calculate Endpoint: POST /api/calculate")
    print("="*60)

    # Test scenario: 3rd & 5 at opponent 28, home team winning
    test_data = {
        "homeTeam": "KC",
        "awayTeam": "SF",
        "down": 3,
        "distance": 5,
        "yardsToGoal": 28,
        "homeScore": 21,
        "awayScore": 17,
        "timeRemaining": 165,
        "homeTimeouts": 2,
        "awayTimeouts": 1,
        "possession": "home"
    }

    print(f"\nRequest:")
    print(json.dumps(test_data, indent=2))

    response = requests.post(f"{BASE_URL}/api/calculate", json=test_data)
    print(f"\nStatus: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")

    return response.status_code == 200


def test_multiple_scenarios():
    """Test multiple game scenarios"""
    print("\n" + "="*60)
    print("Testing Multiple Scenarios")
    print("="*60)

    scenarios = [
        {
            "name": "1st & 10 at own 25",
            "data": {
                "homeTeam": "BUF",
                "awayTeam": "MIA",
                "down": 1,
                "distance": 10,
                "yardsToGoal": 75,
                "homeScore": 14,
                "awayScore": 10,
                "timeRemaining": 1800,
                "homeTimeouts": 3,
                "awayTimeouts": 3,
                "possession": "home"
            }
        },
        {
            "name": "4th & 1 at midfield",
            "data": {
                "homeTeam": "KC",
                "awayTeam": "LAC",
                "down": 4,
                "distance": 1,
                "yardsToGoal": 50,
                "homeScore": 10,
                "awayScore": 10,
                "timeRemaining": 300,
                "homeTimeouts": 1,
                "awayTimeouts": 2,
                "possession": "home"
            }
        },
        {
            "name": "1st & Goal at 5",
            "data": {
                "homeTeam": "PHI",
                "awayTeam": "DAL",
                "down": 1,
                "distance": 5,
                "yardsToGoal": 5,
                "homeScore": 17,
                "awayScore": 20,
                "timeRemaining": 120,
                "homeTimeouts": 2,
                "awayTimeouts": 1,
                "possession": "home"
            }
        }
    ]

    results = []
    for scenario in scenarios:
        print(f"\n{scenario['name']}:")
        response = requests.post(f"{BASE_URL}/api/calculate", json=scenario['data'])
        if response.status_code == 200:
            epa = response.json()['epa']
            print(f"  EPA: {epa}")
            results.append(True)
        else:
            print(f"  Error: {response.status_code}")
            results.append(False)

    return all(results)


def test_validation_errors():
    """Test input validation"""
    print("\n" + "="*60)
    print("Testing Input Validation")
    print("="*60)

    # Invalid down (out of range)
    invalid_data = {
        "homeTeam": "KC",
        "awayTeam": "SF",
        "down": 5,  # Invalid: must be 1-4
        "distance": 10,
        "yardsToGoal": 50,
        "homeScore": 10,
        "awayScore": 10,
        "timeRemaining": 1800,
        "homeTimeouts": 3,
        "awayTimeouts": 3,
        "possession": "home"
    }

    response = requests.post(f"{BASE_URL}/api/calculate", json=invalid_data)
    print(f"Invalid down test - Status: {response.status_code}")
    if response.status_code == 422:
        print("✓ Validation working correctly")
        return True
    else:
        print("✗ Validation failed")
        return False


if __name__ == "__main__":
    print("\n" + "="*60)
    print("NFL EPA API Test Suite")
    print("="*60)
    print("\nMake sure the API is running on http://localhost:8000")
    print("Run: uvicorn app.main:app --reload")
    print()

    try:
        # Run tests
        tests = [
            ("Root Endpoint", test_root),
            ("Health Check", test_health),
            ("EPA Calculate", test_calculate_epa),
            ("Multiple Scenarios", test_multiple_scenarios),
            ("Input Validation", test_validation_errors)
        ]

        results = {}
        for test_name, test_func in tests:
            try:
                results[test_name] = test_func()
            except requests.exceptions.ConnectionError:
                print(f"\n✗ Connection Error: Is the API running?")
                print("   Start with: uvicorn app.main:app --reload")
                break
            except Exception as e:
                print(f"\n✗ Error in {test_name}: {e}")
                results[test_name] = False

        # Summary
        print("\n" + "="*60)
        print("Test Summary")
        print("="*60)
        for test_name, result in results.items():
            status = "✓ PASS" if result else "✗ FAIL"
            print(f"{test_name:30s} {status}")

        total_passed = sum(results.values())
        total_tests = len(results)
        print(f"\nTotal: {total_passed}/{total_tests} tests passed")

        if total_passed == total_tests:
            print("\n🎉 All tests passed! API is working correctly.")

    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
