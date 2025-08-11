#!/bin/bash
set -e

echo "🚀 Starting Dating Profile Optimizer Backend..."

cd backend

# Start Docker services
echo "📦 Starting database and Redis..."
docker-compose up -d postgres redis

# Wait for services
echo "⏳ Waiting for services to be ready..."
sleep 5

# Start the backend server
echo "🔧 Starting backend API server on http://localhost:3004"
npm start

