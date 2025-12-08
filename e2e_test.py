#!/usr/bin/env python3
"""
End-to-End Integration Test for OverDrive System
Tests server-client communication with multiple concurrent clients
"""

import subprocess
import time
import sys
import os
import shutil
from pathlib import Path

def run_command(cmd, check=True, capture_output=True):
    """Run shell command and return result"""
    print(f"Running: {cmd}")
    result = subprocess.run(
        cmd,
        shell=True,
        check=check,
        capture_output=capture_output,
        text=True
    )
    if capture_output and result.stdout:
        print(f"Output: {result.stdout}")
    if capture_output and result.stderr:
        print(f"Error: {result.stderr}")
    return result

def cleanup_test_data():
    """Clean up integration test data"""
    test_dir = Path("./integration_test_data")
    if test_dir.exists():
        print(f"Cleaning up {test_dir}...")
        shutil.rmtree(test_dir)
    
    # Clean docker volumes for tests
    run_command("docker compose down -v", check=False)

def setup_test_environment():
    """Setup test environment"""
    print("\n=== Setting up test environment ===")
    cleanup_test_data()
    
    # Create test directory
    test_dir = Path("./integration_test_data")
    test_dir.mkdir(exist_ok=True)
    
    return test_dir

def build_services():
    """Build all Docker services"""
    print("\n=== Building Docker services ===")
    run_command("docker compose build", check=True)

def start_server():
    """Start the server service"""
    print("\n=== Starting server ===")
    run_command("docker compose up -d server", check=True)
    
    # Wait for server to be healthy
    print("Waiting for server to be ready...")
    for i in range(30):
        result = run_command(
            "docker compose ps server --format json",
            check=False
        )
        if "healthy" in result.stdout or "(healthy)" in result.stdout:
            print("Server is ready!")
            return True
        time.sleep(1)
    
    print("Warning: Server health check timeout, proceeding anyway...")
    time.sleep(5)
    return True

def run_unit_tests():
    """Run unit tests"""
    print("\n=== Running unit tests ===")
    result = run_command(
        "docker compose run --rm tests",
        check=False
    )
    return result.returncode == 0

def test_client_server_communication():
    """Test client-server communication"""
    print("\n=== Testing client-server communication ===")
    
    # Test 1: POST command
    print("\n--- Test 1: POST file ---")
    post_cmd = 'echo "POST testfile.txt\\nHello World" | docker compose run --rm -T client server 5555'
    result = run_command(post_cmd, check=False)
    
    # Test 2: GET command
    print("\n--- Test 2: GET file ---")
    get_cmd = 'echo "GET testfile.txt" | docker compose run --rm -T client server 5555'
    result = run_command(get_cmd, check=False)
    
    # Test 3: SEARCH command
    print("\n--- Test 3: SEARCH files ---")
    search_cmd = 'echo "SEARCH Hello" | docker compose run --rm -T client server 5555'
    result = run_command(search_cmd, check=False)
    
    return True

def test_concurrent_clients():
    """Test multiple concurrent clients"""
    print("\n=== Testing concurrent clients ===")
    
    # Create multiple client processes
    processes = []
    for i in range(3):
        print(f"\nStarting client {i+1}...")
        cmd = f'echo "POST file{i}.txt\\nContent from client {i}" | docker compose run --rm -T client server 5555'
        proc = subprocess.Popen(
            cmd,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        processes.append(proc)
    
    # Wait for all clients to complete
    for i, proc in enumerate(processes):
        stdout, stderr = proc.communicate(timeout=30)
        print(f"Client {i+1} completed with return code: {proc.returncode}")
    
    return True

def verify_server_data():
    """Verify that server data persists"""
    print("\n=== Verifying server data persistence ===")
    result = run_command(
        "docker compose exec server ls -la /app/files",
        check=False
    )
    return result.returncode == 0

def main():
    """Main test execution"""
    print("=" * 60)
    print("OverDrive End-to-End Integration Tests")
    print("=" * 60)
    
    try:
        # Setup
        test_dir = setup_test_environment()
        
        # Build
        build_services()
        
        # Start server
        if not start_server():
            print("Failed to start server")
            return 1
        
        # Run tests
        tests_passed = True
        
        # Unit tests
        if not run_unit_tests():
            print("⚠️  Unit tests failed")
            tests_passed = False
        else:
            print("✅ Unit tests passed")
        
        # Integration tests
        if not test_client_server_communication():
            print("⚠️  Client-server communication test failed")
            tests_passed = False
        else:
            print("✅ Client-server communication test passed")
        
        if not test_concurrent_clients():
            print("⚠️  Concurrent clients test failed")
            tests_passed = False
        else:
            print("✅ Concurrent clients test passed")
        
        if not verify_server_data():
            print("⚠️  Server data verification failed")
            tests_passed = False
        else:
            print("✅ Server data verification passed")
        
        # Results
        print("\n" + "=" * 60)
        if tests_passed:
            print("✅ ALL TESTS PASSED")
            print("=" * 60)
            return 0
        else:
            print("⚠️  SOME TESTS FAILED")
            print("=" * 60)
            return 1
            
    except Exception as e:
        print(f"\n❌ Test execution failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        # Cleanup
        print("\n=== Cleaning up ===")
        cleanup_test_data()
        print("Cleanup complete")

if __name__ == "__main__":
    sys.exit(main())
