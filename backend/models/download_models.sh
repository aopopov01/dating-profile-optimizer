#\!/bin/bash

echo "📥 Downloading face-api.js models..."

# Create models directory if it doesn't exist
mkdir -p face-api-models

# Download face-api.js models
BASE_URL="https://github.com/justadudewhohacks/face-api.js-models/raw/master"

# Download face detection models
wget -q "$BASE_URL/ssd_mobilenetv1_model-weights_manifest.json" -O face-api-models/ssd_mobilenetv1_model-weights_manifest.json
wget -q "$BASE_URL/ssd_mobilenetv1_model.weights" -O face-api-models/ssd_mobilenetv1_model.weights

# Download face landmark models
wget -q "$BASE_URL/face_landmark_68_model-weights_manifest.json" -O face-api-models/face_landmark_68_model-weights_manifest.json
wget -q "$BASE_URL/face_landmark_68_model.weights" -O face-api-models/face_landmark_68_model.weights

# Download face recognition models
wget -q "$BASE_URL/face_recognition_model-weights_manifest.json" -O face-api-models/face_recognition_model-weights_manifest.json
wget -q "$BASE_URL/face_recognition_model.weights" -O face-api-models/face_recognition_model.weights

echo "✅ Face-api.js models downloaded successfully\!"
echo ""
echo "📍 Models location: $(pwd)/face-api-models"
echo ""
echo "To use these models in your app:"
echo "1. Copy them to your public/models directory"
echo "2. Load them with: await faceapi.loadSsdMobilenetv1Model('/models')"
