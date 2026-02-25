#!/bin/bash
# Test script to check if InfoSidebar opens when clicking Details
# This script checks the browser console logs for the expected messages

echo "=== Testing InfoSidebar Opening ==="
echo ""
echo "Instructions for manual testing:"
echo "1. Open browser to http://localhost:3001"
echo "2. Open Developer Console (F12)"
echo "3. Go to Console tab"
echo "4. Click on a file's 3-dot menu"
echo "5. Click 'Details'"
echo ""
echo "Expected console logs:"
echo "  - '[FilePageWrapper] MyDrive action: details Files: {file object} Selected count: 0 or 1'"
echo "  - '[FilePageWrapper] Details action - selectedCount: 0 or 1'"
echo "  - '[FilePageWrapper] Opening InfoSidebar for file: {file object}'"
echo "  - '[FilePageWrapper] Sidebar opened - fileId: {some-uuid}'"
echo ""
echo "If you see 'Details blocked - multiple files selected: X', it means:"
echo "  - You have X files selected (Ctrl+Click to select multiple)"
echo "  - Sidebar will NOT open (by design - only works with 0 or 1 selected)"
echo ""
echo "=== Automated Check ==="
echo "Checking if react-client is running..."
if docker ps | grep -q overdrive-react-client; then
    echo "✓ react-client container is running"
    echo ""
    echo "Checking if the updated code is in the bundle..."
    if docker exec overdrive-react-client sh -c "grep -q 'Details blocked - multiple files selected' /app/build/static/js/main.*.js 2>/dev/null"; then
        echo "✓ Updated code is present in the bundle"
        echo ""
        echo "Checking container logs for any React errors..."
        docker logs overdrive-react-client --tail 20 2>&1 | grep -i "error\|warning\|failed" || echo "  No errors found in logs"
    else
        echo "✗ Updated code NOT found in bundle"
        echo "  Run: docker-compose build --no-cache react-client"
    fi
else
    echo "✗ react-client container is not running"
    echo "  Run: docker-compose up -d react-client"
fi
echo ""
echo "=== Quick DOM Check ==="
echo "To check if InfoSidebar is in the DOM, run this in browser console:"
echo "  document.querySelector('.info-sidebar')"
echo ""
echo "If sidebar is open, it should return an element."
echo "If sidebar is closed, it might return null (depends on implementation)."
