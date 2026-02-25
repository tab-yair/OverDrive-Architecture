#!/bin/bash
# Run all test scripts and provide comprehensive summary

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Overall counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

echo "=========================================="
echo "OverDrive Test Suite Runner"
echo "=========================================="
echo ""

# Start Docker in detached mode
echo -e "${BLUE}➜${NC} Starting Docker services..."
docker compose up -d

# Wait for services to be healthy
echo -e "${BLUE}➜${NC} Waiting for services to start..."
sleep 5

echo ""
echo "=========================================="
echo "Running Tests"
echo "=========================================="
echo ""

# Loop through all test_*.sh files in tests folder
for f in ./test_*.sh; do
    # Skip the framework file
    [[ "$(basename "$f")" == "test_framework.sh" ]] && continue
    
    # Skip this script itself
    [[ "$(basename "$f")" == "run_all.sh" ]] && continue
    
    echo -e "${YELLOW}▶${NC} Running $(basename "$f")..."
    echo "=========================================="
    
    if bash "$f"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓${NC} $(basename "$f") passed"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗${NC} $(basename "$f") failed"
    fi
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
done

# Stop and remove Docker containers
echo -e "${BLUE}➜${NC} Stopping Docker services..."
docker compose down

# Clean up test server data
echo -e "${BLUE}➜${NC} Cleaning up test data..."
sudo rm -rf server_data

echo ""
echo "=========================================="
echo "Final Summary"
echo "=========================================="
echo "Total test files: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All test suites passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ $FAILED_TESTS test suite(s) failed${NC}"
    exit 1
fi

