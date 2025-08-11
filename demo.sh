#!/bin/bash
set -e

echo "🚀 Starting Complete Dating Profile Optimizer Demo..."

# Start backend in background
echo "📡 Starting backend..."
./start-backend.sh &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to start..."
sleep 15

# Create demo data
echo "🎭 Setting up demo data..."
./create-demo-data.sh

echo ""
echo "🎉 Demo is ready!"
echo ""
echo "🔧 Next steps:"
echo "1. Open a new terminal and run: ./start-mobile.sh"
echo "2. Use React Native CLI to run the app:"
echo "   - For iOS: cd DatingProfileOptimizer && npx react-native run-ios"
echo "   - For Android: cd DatingProfileOptimizer && npx react-native run-android"
echo ""
echo "📱 Demo credentials:"
echo "   Email: demo@example.com"
echo "   Password: DemoPass123!"
echo ""
echo "🔄 To stop the demo: kill $BACKEND_PID"

# Keep script running
wait $BACKEND_PID

