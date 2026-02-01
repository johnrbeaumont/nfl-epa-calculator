"""
Test script for EPA and Win Probability APIs

Tests both /api/calculate (EPA) and /api/win-probability endpoints.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_epa_api():
    """Test EPA calculation endpoint"""
    print("\n" + "="*60)
    print("Testing EPA API: POST /api/calculate")
    print("="*60)

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

    response = requests.post(f"{BASE_URL}/api/calculate", json=test_data)
    print(f"\nStatus: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_win_probability_api():
    """Test Win Probability endpoint"""
    print("\n" + "="*60)
    print("Testing Win Probability API: POST /api/win-probability")
    print("="*60)

    test_data = {
        "homeTeam": "KC",
        "awayTeam": "SF",
        "down": 1,
        "distance": 10,
        "yardsToGoal": 75,
        "homeScore": 21,
        "awayScore": 14,
        "timeRemaining": 300,
        "homeTimeouts": 2,
        "awayTimeouts": 1,
        "possession": "home",
        "quarter": 4
    }

    response = requests.post(f"{BASE_URL}/api/win-probability", json=test_data)
    print(f"\nStatus: {response.status_code}")
    print(f"Response:\n{json.dumps(response.json(), indent=2)}")
    return response.status_code == 200


def test_health():
    """Test health endpoint"""
    print("\n" + "="*60)
    print("Testing Health API: GET /api/health")
    print("="*60)

    response = requests.get(f"{BASE_URL}/api/health")
    print(f"\nStatus: {response.status_code}")
    data = response.json()
    print(f"\nStatus: {data['status']}")
    print(f"EPA Model Loaded: {data['epa_model_loaded']}")
    print(f"Win Prob Model Loaded: {data['win_prob_model_loaded']}")
    return response.status_code == 200


if __name__ == "__main__":
    print("\n" + "="*60)
    print("NFL EPA & Win Probability API Test Suite")
    print("="*60)

    try:
        tests = [
            ("Health Check", test_health),
            ("EPA API", test_epa_api),
            ("Win Probability API", test_win_probability_api)
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
            print("\n🎉 All tests passed! Both APIs are working correctly.")

    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
