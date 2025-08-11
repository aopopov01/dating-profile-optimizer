# Android Build Setup Instructions

## Prerequisites Required

### 1. Java Development Kit (JDK)
```bash
# Install OpenJDK 17 (recommended for React Native 0.72+)
sudo apt update
sudo apt install -y openjdk-17-jdk

# Set JAVA_HOME environment variable
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc

# Verify installation
java -version
javac -version
```

### 2. Android SDK Setup
```bash
# Download Android Studio or Command Line Tools
# Option 1: Android Studio (Recommended)
# Download from: https://developer.android.com/studio

# Option 2: Command Line Tools Only
wget https://dl.google.com/android/repository/commandlinetools-linux-9477386_latest.zip
unzip commandlinetools-linux-9477386_latest.zip
mkdir -p ~/Android/Sdk/cmdline-tools
mv cmdline-tools ~/Android/Sdk/cmdline-tools/latest

# Set Android environment variables
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin

# Add to ~/.bashrc
echo 'export ANDROID_HOME=~/Android/Sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin' >> ~/.bashrc
```

### 3. Install Android SDK Components
```bash
# Accept licenses first
sdkmanager --licenses

# Install required SDK components
sdkmanager "platforms;android-33" "build-tools;33.0.0" "platform-tools"
sdkmanager "system-images;android-33;google_apis;x86_64"
```

### 4. Generate Signing Key
```bash
# Navigate to android/app directory
cd android/app

# Generate release key
keytool -genkey -v -keystore dating-release-key.keystore \
  -alias dating-key-alias \
  -keyalg RSA -keysize 2048 -validity 10000

# Store keystore details securely
# You'll need: keystore password, key password, key alias
```

### 5. Configure Gradle Signing
Create or update `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=dating-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=dating-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

## Build Commands

### Debug Build
```bash
npm run android
# or
cd android && ./gradlew assembleDebug
```

### Release Build
```bash
npm run build:android:release
# or
cd android && ./gradlew assembleRelease
```

### Build with Bundle (Play Store Recommended)
```bash
cd android && ./gradlew bundleRelease
```

## Output Locations
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Release AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

### Common Issues
1. **Gradle Wrapper Permission**: `chmod +x android/gradlew`
2. **Memory Issues**: Add to `android/gradle.properties`:
   ```
   org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
   ```
3. **Build Tools Version**: Update in `android/app/build.gradle`
4. **SDK Path Issues**: Verify ANDROID_HOME and PATH variables

### Verification Commands
```bash
# Check Java installation
java -version

# Check Android SDK
sdkmanager --list_installed

# Check Gradle
cd android && ./gradlew --version

# Test build system
cd android && ./gradlew clean
```

## Mock Build Configuration
Since API keys are not configured, ensure mock services are enabled:

1. Check `src/config/app.config.ts` for `MOCK_MODE: true`
2. Verify mock services in `src/services/mock/`
3. Test with offline-first functionality enabled

## Production Considerations
- Use release keystore for production builds
- Enable ProGuard/R8 code obfuscation
- Test on physical devices
- Verify app signing configuration
- Check app bundle size optimization