#!/bin/bash
# iOS Build Script for Cenomi AI

# Make script exit if any command fails
set -e

# Display usage information
function show_usage {
  echo "Usage: ./build-ios.sh [options]"
  echo "Options:"
  echo "  --development    Build for development with dev client"
  echo "  --preview        Build for internal testing (IPA)"
  echo "  --simulator      Build for iOS simulator"
  echo "  --production     Build for App Store"
  echo "  --help           Show this help message"
}

# Default build profile
BUILD_PROFILE="preview-ipa"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --development)
      BUILD_PROFILE="development"
      shift
      ;;
    --preview)
      BUILD_PROFILE="preview-ipa"
      shift
      ;;
    --simulator)
      BUILD_PROFILE="simulator"
      shift
      ;;
    --production)
      BUILD_PROFILE="production"
      shift
      ;;
    --help)
      show_usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      show_usage
      exit 1
      ;;
  esac
done

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

# Check if we're on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "⚠️  Warning: iOS builds require macOS. This script may not work as expected."
  echo "    Consider using Expo's cloud build service with 'eas build'."
fi

echo "🔍 Checking dependencies..."

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed. Please install Node.js and try again."
  exit 1
fi

# Check if eas-cli is installed
if ! command -v eas &> /dev/null; then
  echo "📦 Installing EAS CLI..."
  npm install -g eas-cli
fi

# Ensure all node dependencies are installed
echo "📦 Installing node dependencies..."
npm install

# Run the build with the selected profile
echo "🏗️  Starting iOS build with profile: $BUILD_PROFILE"
eas build --platform ios --profile $BUILD_PROFILE

echo "✅ Build command executed successfully!"
echo "   Check the Expo dashboard for build status and to download the IPA when complete." 