#!/bin/bash
# Run all test scripts in web-server/tests/ except this one

# Start Docker in detached mode
docker compose up -d

# Wait a few seconds for services to be healthy
sleep 3

# Loop through all .sh files in tests folder
for f in web-server/tests/*.sh; do
    # Skip this script itself
    [[ "$(basename "$f")" == "run_all.sh" ]] && continue

    echo "Running $f..."
    bash "$f"
done

echo "All tests completed."

# Stop and remove Docker containers
docker compose down

# Clean up test server data (adjusted path)
sudo rm -rf server_data


