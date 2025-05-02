// VoskSpeechRecognition.js - Offline speech recognition using Vosk
import { NativeModules, NativeEventEmitter, Platform, Alert } from 'react-native';

// Get reference to our Vosk native module
const { VoskSpeechRecognition } = NativeModules;

// Create event emitter for events from the native module
const voskEmitter = VoskSpeechRecognition 
  ? new NativeEventEmitter(VoskSpeechRecognition) 
  : null;

// Log availability for debugging
if (VoskSpeechRecognition) {
  console.log('Vosk speech recognition module is available');
} else {
  console.warn('Vosk speech recognition module not found');
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

// Keep track of initialization state
let initialized = false;

const VoskRecognition = {
  initModel: async () => {
    try {
      if (!VoskSpeechRecognition) {
        throw new Error('Vosk module not available');
      }
      
      console.log('Initializing Vosk model...');
      await VoskSpeechRecognition.initModel();
      initialized = true;
      console.log('Vosk model initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Vosk model:', error);
      throw error;
    }
  },
  
  isAvailable: async () => {
    try {
      if (!VoskSpeechRecognition) return false;
      
      // Check if model is initialized
      if (!initialized) {
        try {
          await VoskRecognition.initModel();
        } catch (error) {
          console.warn('Failed to initialize Vosk model:', error);
          return false;
        }
      }
      
      const available = await VoskSpeechRecognition.isAvailable();
      console.log('Vosk recognition available:', available);
      return available;
    } catch (error) {
      console.error('Error checking Vosk availability:', error);
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
    
    // Setup event listeners if not already set up
    VoskRecognition._setupEventListeners();
  },

  // Start listening for speech
  startListening: async (locale = 'en-US') => {
    try {
      if (!VoskSpeechRecognition) {
        throw new Error('Vosk speech recognition module not available');
      }
      
      // Check if model is initialized
      if (!initialized) {
        try {
          await VoskRecognition.initModel();
        } catch (error) {
          console.error('Failed to initialize Vosk model:', error);
          throw new Error('Failed to initialize speech model: ' + error.message);
        }
      }

      // Setup event listeners if they're not already set up
      VoskRecognition._setupEventListeners();

      // Start the speech recognition
      console.log('Starting Vosk recognition...');
      const result = await VoskSpeechRecognition.startListening(locale);
      console.log('Vosk recognition started');
      return result;
    } catch (error) {
      console.error('Error starting Vosk recognition:', error);
      throw error;
    }
  },

  // Stop listening for speech
  stopListening: async () => {
    try {
      if (!VoskSpeechRecognition) return false;
      
      const result = await VoskSpeechRecognition.stopListening();
      console.log('Vosk recognition stopped');
      return result;
    } catch (error) {
      console.error('Error stopping Vosk recognition:', error);
      return false;
    }
  },

  // Clean up resources
  destroy: async () => {
    try {
      // Remove event listeners
      VoskRecognition._removeEventListeners();

      if (!VoskSpeechRecognition) return false;
      
      const result = await VoskSpeechRecognition.destroy();
      console.log('Vosk recognition destroyed');
      initialized = false;
      return result;
    } catch (error) {
      console.error('Error destroying Vosk recognition:', error);
      return false;
    }
  },

  // Check if currently listening
  isListening: async () => {
    try {
      if (!VoskSpeechRecognition) return false;
      
      const listening = await VoskSpeechRecognition.isListening();
      return listening;
    } catch (error) {
      console.error('Error checking if Vosk is listening:', error);
      return false;
    }
  },

  // Setup event listeners
  _setupEventListeners: () => {
    if (!voskEmitter) {
      console.warn('Vosk event emitter not available');
      return;
    }

    // Remove any existing listeners first
    VoskRecognition._removeEventListeners();

    // Set up new listeners
    onSpeechStartListener = voskEmitter.addListener(
      'onSpeechStart',
      (event) => {
        console.log('Vosk speech start event:', event);
        callbacks.onSpeechStart(event);
      }
    );

    onSpeechEndListener = voskEmitter.addListener(
      'onSpeechEnd',
      (event) => {
        console.log('Vosk speech end event:', event);
        callbacks.onSpeechEnd(event);
      }
    );

    onSpeechResultsListener = voskEmitter.addListener(
      'onSpeechResults',
      (event) => {
        console.log('Vosk speech results event:', event);
        if (event && event.value && event.value['0']) {
          callbacks.onSpeechResults(event.value['0'], event);
        }
      }
    );

    onSpeechPartialResultsListener = voskEmitter.addListener(
      'onSpeechPartialResults',
      (event) => {
        console.log('Vosk speech partial results event:', event);
        if (event && event.value && event.value['0']) {
          callbacks.onSpeechPartialResults(event.value['0'], event);
        }
      }
    );

    onSpeechErrorListener = voskEmitter.addListener(
      'onSpeechError',
      (event) => {
        console.error('Vosk speech error event:', event);
        callbacks.onSpeechError(event);
      }
    );

    console.log('Vosk event listeners registered');
  },

  // Remove event listeners
  _removeEventListeners: () => {
    if (!voskEmitter) return;

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

    console.log('Vosk event listeners removed');
  }
};

export default VoskRecognition; 