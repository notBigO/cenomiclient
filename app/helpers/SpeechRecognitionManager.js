// SpeechRecognitionManager.js - A robust speech recognition implementation
import { Platform, PermissionsAndroid, NativeModules, Alert, Linking } from 'react-native';
import Voice from '@react-native-voice/voice';
import CustomSpeechRecognition from './CustomSpeechRecognition';

// Get reference to our custom native module
const { PackageManager } = NativeModules;

// Debug all available native modules
console.log('Available NativeModules:', Object.keys(NativeModules));
console.log('PackageManager module available:', !!PackageManager);

class SpeechRecognitionManager {
  constructor() {
    this.isInitialized = false;
    this.isListening = false;
    this.isPermissionGranted = false;
    this.permissionChecked = false;
    this.languageOption = 'en-US';
    this.listeners = {};
    this.useCustomImpl = false;
    
    // Print Voice module details for debugging
    console.log('Voice module:', Voice);
    
    // Bind methods
    this.initialize = this.initialize.bind(this);
    this.requestPermissions = this.requestPermissions.bind(this);
    this.startListening = this.startListening.bind(this);
    this.stopListening = this.stopListening.bind(this);
    this.destroy = this.destroy.bind(this);
    
    // Event callbacks
    this.onSpeechStart = () => {};
    this.onSpeechRecognized = () => {};
    this.onSpeechEnd = () => {};
    this.onSpeechError = () => {};
    this.onSpeechResults = () => {};
    this.onSpeechPartialResults = () => {};
  }
  
  // Set event callbacks
  setCallbacks(callbacks = {}) {
    if (callbacks.onSpeechStart) this.onSpeechStart = callbacks.onSpeechStart;
    if (callbacks.onSpeechRecognized) this.onSpeechRecognized = callbacks.onSpeechRecognized;
    if (callbacks.onSpeechEnd) this.onSpeechEnd = callbacks.onSpeechEnd;
    if (callbacks.onSpeechError) this.onSpeechError = callbacks.onSpeechError;
    if (callbacks.onSpeechResults) this.onSpeechResults = callbacks.onSpeechResults;
    if (callbacks.onSpeechPartialResults) this.onSpeechPartialResults = callbacks.onSpeechPartialResults;
    
    // Also set callbacks on the custom implementation if using
    if (this.useCustomImpl) {
      CustomSpeechRecognition.setCallbacks(callbacks);
    }
  }
  
  // Check which speech recognition impl to use
  async _determineImplementation() {
    try {
      console.log('Checking for the best speech recognition implementation...');
      
      // Try to check the Voice package
      let voiceAvailable = false;
      try {
        if (Voice && Voice.isRecognizing) {
          await Voice.isRecognizing();
          voiceAvailable = true;
          console.log('Voice package is available and functional');
        }
      } catch (e) {
        console.warn('Voice package check failed:', e);
        voiceAvailable = false;
      }
      
      // Check if custom implementation is available
      let customAvailable = false;
      try {
        customAvailable = await CustomSpeechRecognition.isAvailable();
        console.log('Custom speech recognition is available:', customAvailable);
      } catch (e) {
        console.warn('Custom speech recognition check failed:', e);
      }
      
      // Decide which implementation to use
      this.useCustomImpl = !voiceAvailable && customAvailable;
      console.log('Using custom implementation:', this.useCustomImpl);
      
      return voiceAvailable || customAvailable;
    } catch (error) {
      console.error('Error determining implementation:', error);
      return false;
    }
  }
  
  // Check if speech recognition is available on the device
  async checkAvailability() {
    try {
      if (Platform.OS === 'android') {
        // Try to initialize the Voice module as a check
        try {
          // First, check which implementation to use
          const implAvailable = await this._determineImplementation();
          if (!implAvailable) {
            throw new Error('No speech recognition implementation available');
          }
          
          if (this.useCustomImpl) {
            return true; // We already checked availability in _determineImplementation
          }
          
          const isRecognizing = await Voice.isRecognizing();
          console.log('Voice.isRecognizing() result:', isRecognizing);
           
          // Check if Google app is installed for speech recognition
          if (PackageManager) {
            try {
              const isGoogleAppInstalled = await PackageManager.isPackageInstalled('com.google.android.googlequicksearchbox');
              console.log('Google app installed:', isGoogleAppInstalled);
              
              if (!isGoogleAppInstalled) {
                // Show alert to the user
                Alert.alert(
                  'Speech Recognition Error',
                  'Your device might not have Google\'s speech recognition service installed. Would you like to install the Google app?',
                  [
                    {
                      text: 'Cancel',
                      style: 'cancel',
                    },
                    {
                      text: 'Install Google App',
                      onPress: () => {
                        // Open Google Play Store for Google App
                        Linking.openURL('market://details?id=com.google.android.googlequicksearchbox')
                          .catch(() => {
                            // If Play Store isn't available, open the web URL
                            Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox');
                          });
                      },
                    },
                  ]
                );
                return false;
              }
            } catch (err) {
              console.error('Error checking Google app:', err);
            }
          } else {
            console.warn('PackageManager native module not available');
          }
          
          return true;
        } catch (e) {
          // If this fails, it might be because there's no recognition service
          console.error('Speech recognition may not be available:', e);
          
          // Try the custom implementation as a fallback
          try {
            const customAvailable = await CustomSpeechRecognition.isAvailable();
            if (customAvailable) {
              console.log('Using custom speech recognition as fallback');
              this.useCustomImpl = true;
              return true;
            }
          } catch (customError) {
            console.error('Custom speech recognition also failed:', customError);
          }
          
          // Show alert to the user
          Alert.alert(
            'Speech Recognition Error',
            'Your device might not have Google\'s speech recognition service installed. Would you like to install the Google app?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Install Google App',
                onPress: () => {
                  // Open Google Play Store for Google App
                  Linking.openURL('market://details?id=com.google.android.googlequicksearchbox')
                    .catch(() => {
                      // If Play Store isn't available, open the web URL
                      Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox');
                    });
                },
              },
            ]
          );
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error checking speech recognition availability:', error);
      return true; // Assume it's available if we can't check
    }
  }
  
  // Initialize the manager
  async initialize() {
    if (this.isInitialized) return true;
    
    try {
      console.log('Initializing SpeechRecognitionManager...');
      
      // Determine which implementation to use
      await this._determineImplementation();
      
      // If using custom implementation, initialize it
      if (this.useCustomImpl) {
        console.log('Initializing custom speech recognition');
        CustomSpeechRecognition.setCallbacks({
          onSpeechStart: this.onSpeechStart,
          onSpeechEnd: this.onSpeechEnd,
          onSpeechResults: this.onSpeechResults,
          onSpeechPartialResults: this.onSpeechPartialResults,
          onSpeechError: this.onSpeechError
        });
        this.isInitialized = true;
        console.log('Custom speech recognition initialized');
        return true;
      }
      
      // Otherwise, initialize Voice
      // Check Voice before proceeding
      if (!Voice) {
        console.error('Voice module is not available!');
        return false;
      }
      
      // Log available methods on Voice
      console.log('Voice methods:', Object.keys(Voice));
      
      // Remove any existing listeners
      await this._removeAllListeners();
      
      // Clear any existing sessions
      try {
        const isRecognizing = await Voice.isRecognizing();
        console.log('Current recognition status:', isRecognizing);
        if (isRecognizing) {
          await Voice.stop();
          console.log('Stopped existing voice recognition');
        }
        await Voice.destroy();
        console.log('Destroyed voice instance');
      } catch (e) {
        console.log('No active Voice session to destroy or error:', e);
      }
      
      // Wait for any cleanup operations
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Set up event listeners
      this._setupListeners();
      
      // Check permissions early
      await this.requestPermissions();
      
      this.isInitialized = true;
      console.log('SpeechRecognitionManager initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SpeechRecognitionManager:', error);
      return false;
    }
  }
  
  // Set up Voice event listeners
  _setupListeners() {
    if (this.listeners.start) {
      console.log('Listeners already set up, skipping');
      return;
    }

    console.log('Setting up Voice listeners...');
    
    // Verify Voice object has event listeners
    if (!Voice.onSpeechStart || !Voice.onSpeechResults) {
      console.error('Voice object is missing event handlers!', Voice);
      Alert.alert(
        'Speech Recognition Error',
        'The speech recognition module is not properly initialized. Please try restarting the app.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      this.listeners.start = Voice.onSpeechStart = (e) => {
        console.log('onSpeechStart event', e);
        this.isListening = true;
        this.onSpeechStart(e);
      };
      
      this.listeners.recognized = Voice.onSpeechRecognized = (e) => {
        console.log('onSpeechRecognized event', e);
        this.onSpeechRecognized(e);
      };
      
      this.listeners.end = Voice.onSpeechEnd = (e) => {
        console.log('onSpeechEnd event', e);
        this.isListening = false;
        this.onSpeechEnd(e);
      };
      
      this.listeners.error = Voice.onSpeechError = (e) => {
        console.error('onSpeechError event', e);
        this.isListening = false;
        this.onSpeechError(e);
      };
      
      this.listeners.results = Voice.onSpeechResults = (e) => {
        console.log('onSpeechResults event', e);
        if (e && e.value && e.value.length > 0) {
          this.onSpeechResults(e.value[0], e);
        }
      };
      
      this.listeners.partialResults = Voice.onSpeechPartialResults = (e) => {
        console.log('onSpeechPartialResults event', e);
        if (e && e.value && e.value.length > 0) {
          this.onSpeechPartialResults(e.value[0], e);
        }
      };
      
      console.log('Voice listeners registered successfully');
    } catch (err) {
      console.error('Error setting up Voice listeners:', err);
    }
  }
  
  // Remove all event listeners
  async _removeAllListeners() {
    try {
      if (!Voice.removeAllListeners) {
        console.error('Voice.removeAllListeners is not a function!');
        return;
      }
      
      await Voice.removeAllListeners();
      this.listeners = {};
      console.log('All Voice listeners removed');
    } catch (e) {
      console.error('Error removing Voice listeners:', e);
    }
  }
  
  // Request required permissions
  async requestPermissions() {
    if (this.permissionChecked) return this.isPermissionGranted;
    
    try {
      // For Android, we need to explicitly request RECORD_AUDIO permission
      if (Platform.OS === 'android') {
        console.log('Requesting RECORD_AUDIO permission on Android');
        
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone to enable voice input.',
            buttonPositive: 'Grant Permission',
            buttonNegative: 'Cancel',
            buttonNeutral: 'Ask Me Later',
          }
        );
        
        this.isPermissionGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('Permission result:', granted, 'Granted:', this.isPermissionGranted);
      } else {
        // For iOS, permission will be requested by the Voice module
        this.isPermissionGranted = true;
      }
      
      this.permissionChecked = true;
      return this.isPermissionGranted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      this.permissionChecked = true;
      this.isPermissionGranted = false;
      return false;
    }
  }
  
  // Set language for speech recognition
  setLanguage(language) {
    this.languageOption = language || 'en-US';
  }
  
  // Start listening for speech
  async startListening(language) {
    // Set language if provided
    if (language) {
      this.setLanguage(language);
    }
    
    try {
      // Initialize if not already done
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize speech recognition');
        }
      }
      
      // Check if already listening
      if (this.isListening) {
        await this.stopListening();
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      // Check permissions
      if (!this.isPermissionGranted) {
        const granted = await this.requestPermissions();
        if (!granted) {
          throw new Error('Microphone permission denied');
        }
      }

      console.log('Starting speech recognition with language:', this.languageOption);
      
      // If using custom implementation, use that
      if (this.useCustomImpl) {
        console.log('Using custom speech recognition for listening');
        await CustomSpeechRecognition.startListening(this.languageOption);
        this.isListening = true;
        return true;
      }
      
      // Check Voice is available for the standard implementation
      if (!Voice || !Voice.start) {
        console.error('Voice module or start method not available!');
        
        // Try fallback to custom implementation
        const customAvailable = await CustomSpeechRecognition.isAvailable();
        if (customAvailable) {
          console.log('Falling back to custom implementation');
          this.useCustomImpl = true;
          return this.startListening(language);
        }
        
        Alert.alert('Error', 'Speech recognition is not available on this device.');
        return false;
      }
      
      // Check availability
      const isAvailable = await this.checkAvailability();
      if (!isAvailable) {
        throw new Error('Speech recognition not available on this device');
      }
      
      // Reset any existing session
      try {
        const isRecognizing = await Voice.isRecognizing();
        if (isRecognizing) {
          await Voice.stop();
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (e) {
        console.log('Error checking recognition status:', e);
      }
      
      // Special considerations for Android
      if (Platform.OS === 'android') {
        console.log(`Starting Android speech recognition with language: ${this.languageOption}`);
        
        // For Android, we'll try multiple times with a retry strategy
        let attempt = 0;
        const maxAttempts = 3;
        let lastError = null;
        
        while (attempt < maxAttempts) {
          try {
            attempt++;
            console.log(`Attempt ${attempt} to start speech recognition`);
            
            // Before each attempt, make sure we're not already recognizing
            try {
              await Voice.destroy();
              // Small delay after destroy
              await new Promise(resolve => setTimeout(resolve, 150));
              this._setupListeners();
              // Small delay after setup listeners
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
              console.log('Error resetting Voice before attempt:', error);
            }
            
            // Core Android options to make speech recognition more reliable
            const options = {
              EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 5000,
              EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
              EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000,
              EXTRA_MAX_RESULTS: 5,
              EXTRA_PARTIAL_RESULTS: true,
              EXTRA_CALLING_PACKAGE: 'com.cenomiclient',
              EXTRA_PREFER_OFFLINE: false
            };
            
            await Voice.start(this.languageOption, options);
            
            this.isListening = true;
            console.log('Speech recognition started successfully');
            return true;
          } catch (error) {
            console.error(`Speech recognition start error (attempt ${attempt}):`, error);
            lastError = error;
            
            if (attempt >= maxAttempts) {
              break;
            }
            
            // Reset before retrying
            await Voice.destroy().catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 500));
            this._setupListeners();
          }
        }
        
        // If we've exhausted all attempts, try one last approach for Android - use free_form model
        try {
          console.log('Trying one last approach with free_form language model');
          const freeFormOptions = {
            EXTRA_LANGUAGE_MODEL: "free_form",
            EXTRA_MAX_RESULTS: 5,
            EXTRA_PARTIAL_RESULTS: true,
            EXTRA_PREFER_OFFLINE: false,
            EXTRA_CALLING_PACKAGE: 'com.cenomiclient',
          };
          
          await Voice.start(this.languageOption, freeFormOptions);
          this.isListening = true;
          console.log('Speech recognition started successfully with free_form model');
          return true;
        } catch (finalError) {
          console.error('Final speech recognition attempt failed:', finalError);
          
          // Try our custom implementation as a last resort
          try {
            console.log('Trying custom speech recognition implementation as last resort');
            const customAvailable = await CustomSpeechRecognition.isAvailable();
            if (customAvailable) {
              this.useCustomImpl = true;
              await CustomSpeechRecognition.startListening(this.languageOption);
              this.isListening = true;
              console.log('Successfully started custom speech recognition');
              return true;
            }
          } catch (customError) {
            console.error('Custom implementation also failed:', customError);
          }
          
          // Show error to user
          Alert.alert(
            'Speech Recognition Failed',
            'Could not start speech recognition. Please check if Google app is installed and microphone permissions are granted.',
            [{ text: 'OK' }]
          );
          throw lastError || finalError;
        }
      } else {
        // iOS is generally more reliable
        console.log(`Starting iOS speech recognition with language: ${this.languageOption}`);
        await Voice.start(this.languageOption);
        this.isListening = true;
        return true;
      }
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.isListening = false;
      throw error;
    }
  }
  
  // Stop listening for speech
  async stopListening() {
    try {
      console.log('Stopping speech recognition');
      
      // If using custom implementation, use that
      if (this.useCustomImpl) {
        await CustomSpeechRecognition.stopListening();
        this.isListening = false;
        return true;
      }
      
      // Otherwise use Voice
      // Check if we're actually listening
      try {
        const isRecognizing = await Voice.isRecognizing();
        console.log('Is currently recognizing:', isRecognizing);
        if (isRecognizing) {
          await Voice.stop();
          console.log('Speech recognition stopped successfully');
        }
      } catch (e) {
        console.log('Error checking recognition status:', e);
        // Try stopping anyway
        await Voice.stop().catch(() => {});
      }
      
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Speech recognition stop error:', error);
      this.isListening = false;
      return false;
    }
  }
  
  // Completely clean up resources
  async destroy() {
    try {
      // If using custom implementation, clean it up
      if (this.useCustomImpl) {
        await CustomSpeechRecognition.destroy();
      } else {
        // Otherwise cleanup Voice
        await this.stopListening();
        await this._removeAllListeners();
        await Voice.destroy();
      }
      
      this.isInitialized = false;
      this.isListening = false;
      this.permissionChecked = false;
      
      console.log('Speech recognition manager destroyed');
      return true;
    } catch (error) {
      console.error('Error destroying speech recognition manager:', error);
      return false;
    }
  }
}

// Export a singleton instance
const speechRecognitionManager = new SpeechRecognitionManager();
export default speechRecognitionManager; 