#!/bin/bash

# Dating Profile Optimizer - Demo Setup Script
# This script sets up both applications for development and demonstration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running from correct directory
if [ ! -f "setup-demo.sh" ]; then
    print_error "Please run this script from the Dating Profile Optimizer root directory"
    exit 1
fi

print_header "Dating Profile Optimizer - Demo Setup"
echo -e "This script will set up both the backend API and React Native mobile app"
echo -e "for development and demonstration purposes.\n"

# Check prerequisites
print_status "Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    echo "Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 16+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Prerequisites check passed!"

# Backend setup
print_header "Setting up Backend"

cd backend

# Copy environment file if it doesn't exist
if [ ! -f ".env" ]; then
    print_status "Creating .env file from example..."
    cp .env.example .env
    
    # Update .env with demo values
    print_status "Configuring demo environment variables..."
    
    # Generate random JWT secrets
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "demo-jwt-secret-$(date +%s)-$(shuf -i 1000-9999 -n 1)")
    JWT_REFRESH_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "demo-refresh-secret-$(date +%s)-$(shuf -i 1000-9999 -n 1)")
    
    # Update environment variables for demo
    sed -i.bak "s/PORT=3002/PORT=3004/" .env
    sed -i.bak "s/API_BASE_URL=http:\/\/localhost:3002/API_BASE_URL=http:\/\/localhost:3004/" .env
    sed -i.bak "s/DATABASE_URL=postgresql:\/\/postgres:password@localhost:5432\/dating_optimizer_dev/DATABASE_URL=postgresql:\/\/postgres:password@localhost:5434\/dating_optimizer_dev/" .env
    sed -i.bak "s/DB_PORT=5432/DB_PORT=5434/" .env
    sed -i.bak "s/REDIS_URL=redis:\/\/localhost:6379/REDIS_URL=redis:\/\/localhost:6382/" .env
    sed -i.bak "s/REDIS_PORT=6379/REDIS_PORT=6382/" .env
    sed -i.bak "s/JWT_SECRET=your-super-secret-jwt-key-change-in-production/JWT_SECRET=$JWT_SECRET/" .env
    sed -i.bak "s/JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production/JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET/" .env
    sed -i.bak "s/ENABLE_ANALYTICS=true/ENABLE_ANALYTICS=false/" .env
    sed -i.bak "s/CLOUDINARY_CLOUD_NAME=your-cloud-name/CLOUDINARY_CLOUD_NAME=demo-cloud-name/" .env
    sed -i.bak "s/CLOUDINARY_API_KEY=your-api-key/CLOUDINARY_API_KEY=demo-api-key/" .env
    sed -i.bak "s/CLOUDINARY_API_SECRET=your-api-secret/CLOUDINARY_API_SECRET=demo-api-secret/" .env
    
    # Remove backup file
    rm -f .env.bak
    
    print_status ".env file configured for demo mode"
else
    print_warning ".env file already exists, skipping creation"
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
else
    print_status "Backend dependencies already installed"
fi

# Start Docker services
print_status "Starting Docker services (PostgreSQL and Redis)..."
docker-compose up -d postgres redis

# Wait for database to be ready
print_status "Waiting for database to be ready..."
sleep 10

# Run database migrations
print_status "Running database migrations..."
if ! npm run migrate 2>/dev/null; then
    print_warning "Migration command not found, trying alternative..."
# Try running migrations directly
    DATABASE_URL="postgresql://postgres:password@localhost:5434/dating_optimizer_dev" npx knex migrate:latest || {
        print_warning "Migrations may need to be run manually"
    }
fi

print_status "Backend setup complete!"

# Return to root directory
cd ..

# React Native app setup
print_header "Setting up React Native App"

cd DatingProfileOptimizer

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing React Native dependencies..."
    npm install
else
    print_status "React Native dependencies already installed"
fi

print_status "React Native app setup complete!"

# Return to root directory
cd ..

# Create demo startup scripts
print_header "Creating Demo Startup Scripts"

# Backend startup script
cat > start-backend.sh << 'EOF'
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

EOF

# React Native startup script
cat > start-mobile.sh << 'EOF'
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

EOF

# Make scripts executable
chmod +x start-backend.sh
chmod +x start-mobile.sh

# Create demo data script
cat > create-demo-data.sh << 'EOF'
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

EOF

chmod +x create-demo-data.sh

# Create complete demo script
cat > demo.sh << 'EOF'
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

EOF

chmod +x demo.sh

print_header "Demo Environment Ready!"

echo -e "${GREEN}✅ Setup complete!${NC} Your Dating Profile Optimizer demo environment is ready.\n"

echo -e "📋 ${BLUE}Quick Start:${NC}"
echo -e "1. Run complete demo: ${YELLOW}./demo.sh${NC}"
echo -e "2. Or start services separately:"
echo -e "   - Backend only: ${YELLOW}./start-backend.sh${NC}"  
echo -e "   - Mobile app only: ${YELLOW}./start-mobile.sh${NC}"
echo -e "   - Create demo data: ${YELLOW}./create-demo-data.sh${NC}\n"

echo -e "📱 ${BLUE}Demo Credentials:${NC}"
echo -e "   Email: ${YELLOW}demo@example.com${NC}"
echo -e "   Password: ${YELLOW}DemoPass123!${NC}\n"

echo -e "🌐 ${BLUE}URLs:${NC}"
echo -e "   Backend API: ${YELLOW}http://localhost:3004${NC}"
echo -e "   API Docs: ${YELLOW}http://localhost:3004/api${NC}"
echo -e "   Health Check: ${YELLOW}http://localhost:3004/health${NC}\n"

echo -e "🔧 ${BLUE}Features Included:${NC}"
echo -e "   ✅ AI-Powered Bio Generation (Mock)"
echo -e "   ✅ Photo Analysis & Scoring (Mock)"
echo -e "   ✅ LinkedIn Headshot Generator (Mock)"
echo -e "   ✅ Subscription Management (Test Mode)"
echo -e "   ✅ Cloud Image Storage (Demo Mode)"
echo -e "   ✅ Analytics Dashboard (Mock Data)"
echo -e "   ✅ Comprehensive Mobile App\n"

echo -e "🎉 ${GREEN}Enjoy exploring the Dating Profile Optimizer!${NC}"