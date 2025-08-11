#!/bin/bash
set -e

echo "🎭 Creating demo data for Dating Profile Optimizer..."

# Wait for backend to be running
until curl -s http://localhost:3004/health > /dev/null; do
    echo "⏳ Waiting for backend to be ready..."
    sleep 2
done

echo "✅ Backend is ready!"

# Create demo user
echo "👤 Creating demo user..."
curl -s -X POST http://localhost:3004/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Demo",
    "lastName": "User",
    "email": "demo@example.com",
    "password": "DemoPass123!",
    "dateOfBirth": "1995-05-15",
    "gender": "male",
    "interestedIn": "female",
    "location": "San Francisco, CA"
  }' | grep -q "success" && echo "✅ Demo user created: demo@example.com / DemoPass123!" || echo "ℹ️ Demo user may already exist"

echo "🎉 Demo setup complete!"
echo ""
echo "📋 Demo credentials:"
echo "   Email: demo@example.com"
echo "   Password: DemoPass123!"
echo ""
echo "🌐 Backend running at: http://localhost:3004"
echo "📊 API Documentation: http://localhost:3004/api"
echo "❤️ Health Check: http://localhost:3004/health"

