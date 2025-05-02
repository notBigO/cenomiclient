// SpeechHelper.js - A helper module for more reliable speech recognition
import { Platform, PermissionsAndroid } from 'react-native';
import Voice from '@react-native-voice/voice';

class SpeechHelper {
  constructor() {
    this.isListening = false;
    this.hasSetupListeners = false;
    this.callbacks = {
      onSpeechStart: () => {},
      onSpeechEnd: () => {},
      onSpeechResults: () => {},
      onSpeechError: () => {},
    };
    
    this.setupListeners();
  }
  
  setupListeners() {
    if (this.hasSetupListeners) {
      return;
    }
    
    Voice.onSpeechStart = () => {
      console.log('SpeechHelper: Speech started');
      this.isListening = true;
      this.callbacks.onSpeechStart();
    };
    
    Voice.onSpeechRecognized = () => {
      console.log('SpeechHelper: Speech recognized');
    };
    
    Voice.onSpeechEnd = () => {
      console.log('SpeechHelper: Speech ended');
      this.isListening = false;
      this.callbacks.onSpeechEnd();
    };
    
    Voice.onSpeechError = (error) => {
      console.error('SpeechHelper: Speech error', error);
      this.isListening = false;
      this.callbacks.onSpeechError(error);
    };
    
    Voice.onSpeechResults = (event) => {
      console.log('SpeechHelper: Speech results', event);
      if (event.value && event.value.length > 0) {
        this.callbacks.onSpeechResults(event.value[0]);
      }
    };
    
    this.hasSetupListeners = true;
  }
  
  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
  
  async requestMicrophonePermission() {
    if (Platform.OS === 'android') {
      try {
        console.log('SpeechHelper: Requesting RECORD_AUDIO permission');
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'This app needs access to your microphone for voice input.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        
        console.log('SpeechHelper: Permission result:', granted);
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.error('SpeechHelper: Permission error:', err);
        return false;
      }
    } else {
      // iOS handles permissions through the Voice module
      return true;
    }
  }
  
  async resetRecognizer() {
    try {
      // Clean up any existing recognizer
      await this.stop();
      
      // Make sure we're not in a recognizing state
      const stillRecognizing = await Voice.isRecognizing();
      if (stillRecognizing) {
        console.log('SpeechHelper: Force stopping voice recognition');
        await Voice.stop();
      }
      
      // Destroy and recreate
      await Voice.destroy();
      
      // Add delay 
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Re-setup listeners
      this.hasSetupListeners = false;
      this.setupListeners();
      
      console.log('SpeechHelper: Recognizer reset complete');
      return true;
    } catch (error) {
      console.error('SpeechHelper: Reset error:', error);
      return false;
    }
  }
  
  async start(language = 'en-US') {
    if (this.isListening) {
      console.log('SpeechHelper: Already listening, stopping first');
      await this.stop();
    }
    
    const hasPermission = await this.requestMicrophonePermission();
    if (!hasPermission) {
      console.error('SpeechHelper: No microphone permission');
      throw new Error('Microphone permission denied');
    }
    
    await this.resetRecognizer();
    
    // Try multiple times to start speech recognition
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        attempt++;
        console.log(`SpeechHelper: Starting speech recognition (attempt ${attempt})`);
        
        if (Platform.OS === 'android') {
          // For Android, we need to specify full options
          await Voice.start(language, {
            EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 10000,
            EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1500,
            EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000,
            EXTRA_MAX_RESULTS: 5,
            EXTRA_PREFER_OFFLINE: true, // Try offline first
          });
        } else {
          // For iOS, simpler options
          await Voice.start(language);
        }
        
        console.log('SpeechHelper: Speech recognition started successfully');
        this.isListening = true;
        return true;
      } catch (error) {
        console.error(`SpeechHelper: Start error (attempt ${attempt}):`, error);
        
        if (attempt >= maxAttempts) {
          throw error;
        }
        
        // Wait before trying again
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.resetRecognizer();
      }
    }
  }
  
  async stop() {
    try {
      console.log('SpeechHelper: Stopping speech recognition');
      
      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }
      
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('SpeechHelper: Stop error:', error);
      this.isListening = false;
      return false;
    }
  }
  
  async cleanup() {
    try {
      await Voice.destroy();
      this.hasSetupListeners = false;
      this.isListening = false;
    } catch (error) {
      console.error('SpeechHelper: Cleanup error:', error);
    }
  }
}

// Export a singleton instance
const speechHelper = new SpeechHelper();
export default speechHelper; 