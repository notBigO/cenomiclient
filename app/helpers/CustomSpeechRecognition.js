// CustomSpeechRecognition.js - A direct bridge to our native speech recognition module
import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';

// Get reference to our custom native module
const { SpeechRecognition } = NativeModules;

// Create event emitter for events from the native module
const speechRecognitionEmitter = SpeechRecognition 
  ? new NativeEventEmitter(SpeechRecognition) 
  : null;

// Log availability for debugging
if (SpeechRecognition) {
  console.log('Native SpeechRecognition module is available');
} else {
  console.warn('Native SpeechRecognition module not found');
}

// Event listeners
let onSpeechStartListener = null;
let onSpeechEndListener = null;
let onSpeechResultsListener = null;
let onSpeechPartialResultsListener = null;
let onSpeechErrorListener = null;

// Callback storage
const callbacks = {
  onSpeechStart: () => {},
  onSpeechEnd: () => {},
  onSpeechResults: () => {},
  onSpeechPartialResults: () => {},
  onSpeechError: () => {}
};

// Keep track of attempts
let recognitionAttempts = 0;
const MAX_ATTEMPTS = 3;

const CustomSpeechRecognition = {
  isAvailable: async () => {
    try {
      if (!SpeechRecognition) return false;
      
      const available = await SpeechRecognition.isAvailable();
      console.log('Speech recognition available:', available);
      return available;
    } catch (error) {
      console.error('Error checking speech recognition availability:', error);
      return false;
    }
  },

  // Set callbacks for events
  setCallbacks: (newCallbacks = {}) => {
    if (newCallbacks.onSpeechStart) callbacks.onSpeechStart = newCallbacks.onSpeechStart;
    if (newCallbacks.onSpeechEnd) callbacks.onSpeechEnd = newCallbacks.onSpeechEnd;
    if (newCallbacks.onSpeechError) callbacks.onSpeechError = newCallbacks.onSpeechError;
    if (newCallbacks.onSpeechResults) callbacks.onSpeechResults = newCallbacks.onSpeechResults;
    if (newCallbacks.onSpeechPartialResults) callbacks.onSpeechPartialResults = newCallbacks.onSpeechPartialResults;
  },

  // Start listening for speech
  startListening: async (locale = 'en-US') => {
    try {
      if (!SpeechRecognition) {
        throw new Error('Native speech recognition module not available');
      }

      // Setup event listeners if they're not already set up
      CustomSpeechRecognition._setupEventListeners();

      // Attempt to start recognition
      try {
        const result = await SpeechRecognition.startListening(locale);
        console.log('Native speech recognition started');
        recognitionAttempts = 0;
        return result;
      } catch (error) {
        recognitionAttempts++;
        console.error(`Speech recognition attempt ${recognitionAttempts} failed:`, error);
        
        // If we've tried too many times, give detailed error
        if (recognitionAttempts >= MAX_ATTEMPTS) {
          recognitionAttempts = 0;
          
          // Show detailed error alert
          if (error.message && error.message.includes('Google app not installed')) {
            Alert.alert(
              'Speech Recognition Unavailable',
              'The Google app is required for speech recognition. Would you like to install it?',
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
                {
                  text: 'Install Google App',
                  onPress: () => {
                    // Open Google Play Store
                    if (Platform.OS === 'android') {
                      CustomSpeechRecognition._openGooglePlayStore();
                    }
                  }
                }
              ]
            );
          }
          
          throw new Error('Speech recognition failed after multiple attempts: ' + error.message);
        }
        
        // Try again with a small delay
        await new Promise(resolve => setTimeout(resolve, 500));
        return await CustomSpeechRecognition.startListening(locale);
      }
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      throw error;
    }
  },
  
  // Helper to open Google Play Store
  _openGooglePlayStore: () => {
    try {
      const { Linking } = require('react-native');
      Linking.openURL('market://details?id=com.google.android.googlequicksearchbox').catch(() => {
        // If Play Store app is not installed, open in browser
        Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox');
      });
    } catch (error) {
      console.error('Could not open Google Play Store:', error);
    }
  },

  // Stop listening for speech
  stopListening: async () => {
    try {
      if (!SpeechRecognition) return false;
      
      const result = await SpeechRecognition.stopListening();
      console.log('Native speech recognition stopped');
      return result;
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      return false;
    }
  },

  // Clean up resources
  destroy: async () => {
    try {
      // Remove event listeners
      CustomSpeechRecognition._removeEventListeners();

      if (!SpeechRecognition) return false;
      
      const result = await SpeechRecognition.destroy();
      console.log('Native speech recognition destroyed');
      return result;
    } catch (error) {
      console.error('Error destroying speech recognition:', error);
      return false;
    }
  },

  // Check if currently listening
  isListening: async () => {
    try {
      if (!SpeechRecognition) return false;
      
      const listening = await SpeechRecognition.isListening();
      return listening;
    } catch (error) {
      console.error('Error checking if speech is listening:', error);
      return false;
    }
  },

  // Setup event listeners
  _setupEventListeners: () => {
    if (!speechRecognitionEmitter) {
      console.warn('Speech recognition event emitter not available');
      return;
    }

    // Remove any existing listeners first
    CustomSpeechRecognition._removeEventListeners();

    // Set up new listeners
    onSpeechStartListener = speechRecognitionEmitter.addListener(
      'onSpeechStart',
      (event) => {
        console.log('Native speech start event:', event);
        callbacks.onSpeechStart(event);
      }
    );

    onSpeechEndListener = speechRecognitionEmitter.addListener(
      'onSpeechEnd',
      (event) => {
        console.log('Native speech end event:', event);
        callbacks.onSpeechEnd(event);
      }
    );

    onSpeechResultsListener = speechRecognitionEmitter.addListener(
      'onSpeechResults',
      (event) => {
        console.log('Native speech results event:', event);
        if (event && event.value && event.value.length > 0) {
          callbacks.onSpeechResults(event.value[0], event);
        }
      }
    );

    onSpeechPartialResultsListener = speechRecognitionEmitter.addListener(
      'onSpeechPartialResults',
      (event) => {
        console.log('Native speech partial results event:', event);
        if (event && event.value && event.value.length > 0) {
          callbacks.onSpeechPartialResults(event.value[0], event);
        }
      }
    );

    onSpeechErrorListener = speechRecognitionEmitter.addListener(
      'onSpeechError',
      (event) => {
        console.error('Native speech error event:', event);
        callbacks.onSpeechError(event);
      }
    );

    console.log('Native speech recognition event listeners registered');
  },

  // Remove event listeners
  _removeEventListeners: () => {
    if (!speechRecognitionEmitter) return;

    if (onSpeechStartListener) {
      onSpeechStartListener.remove();
      onSpeechStartListener = null;
    }

    if (onSpeechEndListener) {
      onSpeechEndListener.remove();
      onSpeechEndListener = null;
    }

    if (onSpeechResultsListener) {
      onSpeechResultsListener.remove();
      onSpeechResultsListener = null;
    }

    if (onSpeechPartialResultsListener) {
      onSpeechPartialResultsListener.remove();
      onSpeechPartialResultsListener = null;
    }

    if (onSpeechErrorListener) {
      onSpeechErrorListener.remove();
      onSpeechErrorListener = null;
    }

    console.log('Native speech recognition event listeners removed');
  }
};

export default CustomSpeechRecognition; 