#!/bin/bash
# ClawDock Build & Deploy Utility
# To use as a git-build alias: alias git-build="./build.sh"

echo "Pulling latest changes..."
git pull
echo "Stopping containers..."
docker compose down
echo "Building fresh images..."
docker compose build --no-cache
echo "Starting services..."
docker compose up -d
echo "Tail logs..."
docker compose logs -f
