#!/bin/bash
set -e

echo "📱 Starting Dating Profile Optimizer Mobile App..."

cd DatingProfileOptimizer

# Start Metro bundler
echo "🔧 Starting React Native development server..."
echo "📱 To run on device/simulator:"
echo "   - iOS: npx react-native run-ios"
echo "   - Android: npx react-native run-android"
echo ""

npm start

