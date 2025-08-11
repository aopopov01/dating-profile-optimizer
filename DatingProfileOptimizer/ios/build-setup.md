# iOS Build Setup Instructions - Dating Profile Optimizer

## Prerequisites (macOS Required)

### 1. Xcode Installation
```bash
# Install Xcode from Mac App Store (Required for iOS builds)
# Minimum version: Xcode 14.0+ for iOS 16+ deployment

# Install Xcode Command Line Tools
xcode-select --install

# Verify installation
xcode-select -p
xcrun --show-sdk-path
```

### 2. CocoaPods Setup
```bash
# Install CocoaPods (Ruby gem manager for iOS dependencies)
sudo gem install cocoapods

# Install iOS dependencies
cd ios
pod install

# If pod install fails, try:
pod repo update
pod install --repo-update
```

### 3. iOS Development Certificate Setup

#### Option A: Automatic Signing (Recommended for Development)
1. Open `ios/DatingProfileOptimizer.xcworkspace` in Xcode
2. Select the project in navigator
3. Go to "Signing & Capabilities" tab
4. Enable "Automatically manage signing"
5. Select your Apple Developer account team

#### Option B: Manual Signing (Production)
```bash
# Generate certificates through Apple Developer Portal
# 1. Create App ID: com.yourcompany.datingprofileoptimizer
# 2. Generate Development/Distribution certificates
# 3. Create provisioning profiles
# 4. Download and install certificates in Keychain
```

### 4. Bundle Identifier Configuration
Update in Xcode project settings:
- **Bundle Identifier**: `com.yourcompany.datingprofileoptimizer`
- **Display Name**: "Dating Profile Optimizer"
- **Version**: "2.1.0" (matches package.json)
- **Build Number**: Increment for each build

## Build Commands

### Development Build
```bash
# From project root
npm run ios

# Or specific simulator
npx react-native run-ios --simulator="iPhone 15 Pro"

# Build for device (requires provisioning)
npx react-native run-ios --device
```

### Production Build (Archive)
```bash
# Command line build (requires certificates)
npm run build:ios:release

# Or manually in Xcode:
# 1. Open ios/DatingProfileOptimizer.xcworkspace
# 2. Select "Any iOS Device" as target
# 3. Product → Archive
# 4. Window → Organizer → Distribute App
```

### Build Configurations

#### Debug Configuration
- Debug symbols enabled
- Network security relaxed for development
- Mock services easily toggleable
- Faster build times with less optimization

#### Release Configuration
- Code optimization enabled
- Debug symbols stripped
- Network security enforced
- App Transport Security (ATS) enforced
- Code obfuscation enabled

## iOS-Specific Configuration

### 1. Info.plist Settings
Key configurations for Dating Profile Optimizer:

```xml
<!-- Camera and Photo Library Access -->
<key>NSCameraUsageDescription</key>
<string>Dating Profile Optimizer needs camera access to analyze and improve your dating photos.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Access your photo library to select and optimize dating profile pictures.</string>

<!-- Face ID/Touch ID for Security -->
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to secure your dating profile data and premium features.</string>

<!-- Network and Location -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Location helps provide relevant dating insights and local optimization suggestions.</string>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <!-- Add any specific domains if needed for mock services -->
    </dict>
</dict>

<!-- URL Schemes -->
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLName</key>
        <string>com.yourcompany.datingprofileoptimizer</string>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>datingprofileoptimizer</string>
        </array>
    </dict>
</array>
```

### 2. Capabilities Required
Enable in Xcode → Project → Signing & Capabilities:

- **Associated Domains**: For deep linking
- **Push Notifications**: For engagement features  
- **Background App Refresh**: For sync functionality
- **Keychain Sharing**: For secure credential storage
- **In-App Purchase**: For premium features (when payment enabled)

### 3. Build Settings Optimization
```bash
# Key build settings in Xcode:
ENABLE_BITCODE = NO  # Required for React Native
DEAD_CODE_STRIPPING = YES  # Reduces app size
STRIP_INSTALLED_PRODUCT = YES  # Remove debug symbols
GCC_OPTIMIZATION_LEVEL = s  # Optimize for size
SWIFT_OPTIMIZATION_LEVEL = -O  # Optimize Swift code
```

## Mock Services Configuration for iOS

### 1. Network Layer Configuration
Ensure mock services work offline:

```objective-c
// In AppDelegate.m or AppDelegate.mm
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  // Configure mock services for offline testing
  #if DEBUG
  [MockServiceManager enableMockServices:YES];
  #endif
  
  return YES;
}
```

### 2. Photo Analysis Mock Setup
Configure mock AI analysis in iOS:

```javascript
// src/services/mock/MockPhotoAnalysis.ios.ts
export const MockPhotoAnalysisIOS = {
  analyzePhoto: async (photoUri: string) => {
    // iOS-specific mock photo analysis
    const mockResult = {
      score: Math.random() * 3 + 7, // 7.0-10.0 range
      improvements: [
        "Better lighting detected in iOS photo library",
        "Suggested crop for iOS aspect ratios",
        "Profile angle optimized for mobile viewing"
      ],
      confidence: 0.95
    };
    
    // Simulate iOS photo processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    return mockResult;
  }
};
```

### 3. iOS Notification Setup (Mock)
```javascript
// Configure mock push notifications for iOS testing
import PushNotificationIOS from '@react-native-community/push-notification-ios';

const MockNotificationManager = {
  setupMockNotifications: () => {
    // Mock notification setup for testing
    if (__DEV__) {
      PushNotificationIOS.addEventListener('notification', onRemoteNotification);
    }
  }
};
```

## Troubleshooting Guide

### Common iOS Build Issues

1. **CocoaPods Issues**:
   ```bash
   cd ios
   pod deintegrate
   pod install
   ```

2. **Derived Data Cleanup**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

3. **React Native Cache Clear**:
   ```bash
   npx react-native start --reset-cache
   ```

4. **Build Errors with Native Dependencies**:
   ```bash
   cd ios && xcodebuild clean
   ```

### Verification Commands
```bash
# Check Xcode installation
xcode-select -p
xcodebuild -version

# Check CocoaPods
pod --version
cd ios && pod check

# Check iOS simulators available
xcrun simctl list devices

# Test build system
cd ios && xcodebuild -workspace DatingProfileOptimizer.xcworkspace -scheme DatingProfileOptimizer -configuration Debug
```

## App Store Preparation

### Pre-Submission Checklist
- [ ] App builds successfully in Release configuration
- [ ] All required capabilities are configured
- [ ] Privacy usage descriptions are comprehensive
- [ ] App launches and core features work without API keys
- [ ] Mock photo analysis generates realistic results
- [ ] Bio generation works with mock AI services
- [ ] Premium features show upgrade prompts (no payment processing)
- [ ] App handles network offline gracefully
- [ ] No debug logs or development features in release build
- [ ] App icon assets are provided at all required sizes
- [ ] Launch screen is configured and displays properly

### Build Archive Process
1. **Clean Build Environment**:
   ```bash
   cd ios
   xcodebuild clean
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```

2. **Prepare for Archive**:
   - Set device target to "Any iOS Device"
   - Select Release configuration
   - Verify signing configuration

3. **Create Archive**:
   - Product → Archive in Xcode
   - Wait for build completion
   - Validate archive before distribution

4. **Distribution Options**:
   - **Development**: For internal testing
   - **Ad Hoc**: For limited external testing
   - **App Store**: For submission to App Store

### Mock Testing on iOS
Since API services are not configured:
- Test photo upload and mock analysis
- Verify bio generation with placeholder content
- Ensure premium features show appropriate upgrade messaging
- Test offline functionality and data persistence
- Validate push notification UI (without actual notifications)
- Check social sharing features with mock content

This setup creates production-ready iOS builds optimized for App Store submission with comprehensive mock services for full functionality testing without external API dependencies.