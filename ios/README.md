# iOS Build Instructions for Cenomi AI

This directory contains the configuration files required to build the Cenomi AI application for iOS devices.

## Prerequisites

1. macOS computer with Xcode 14.0 or later
2. Apple Developer account
3. Node.js and npm/yarn installed
4. Expo CLI: `npm install -g expo-cli`
5. EAS CLI: `npm install -g eas-cli`

## Setting up for iOS Build

1. Make sure you have logged in to your Expo account:
   ```
   eas login
   ```

2. Configure your Apple Developer account with Expo:
   ```
   eas credentials
   ```

3. Ensure that your app.json has the correct iOS configuration:
   - The `bundleIdentifier` should match your Apple Developer account application ID
   - Proper permissions are configured in the `infoPlist` section

## Building for iOS

### Development Build (for testing on device)

```
eas build --platform ios --profile development
```

### Preview Build (for internal testing)

```
eas build --platform ios --profile preview-ipa
```

### Simulator Build (for testing on iOS Simulator)

```
eas build --platform ios --profile simulator
```

### Production Build

```
eas build --platform ios --profile production
```

## Troubleshooting Common Issues

1. **Pod Installation Errors**: 
   - Run `cd ios && pod install` manually
   - Check that your Podfile references all the correct dependencies

2. **Code Signing Issues**:
   - Verify Apple Developer account permissions
   - Check that the provisioning profile is correctly configured

3. **Missing Resources**:
   - Ensure that all assets referenced in the app are included in the Xcode project

4. **Architecture Compatibility**:
   - Ensure that native modules support the target architectures (arm64, x86_64)

## Testing the iOS Build

Once your build is complete, you can:

1. Download the IPA file from the Expo dashboard
2. Install it on test devices using Apple TestFlight
3. Share internal builds with your team using Expo's distribution options

## Deploying to App Store

1. Create a submission configuration in eas.json
2. Run `eas submit -p ios`
3. Complete any additional steps in App Store Connect 