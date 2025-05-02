import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CustomSpeechRecognition from '../helpers/CustomSpeechRecognition';

export default function TestSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [results, setResults] = useState('');
  const [partialResults, setPartialResults] = useState('');
  const [available, setAvailable] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [log, setLog] = useState([]);

  // Add to log function
  const addToLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]);
  };

  // Check speech recognition availability
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        addToLog('Checking speech recognition availability...');
        const isAvailable = await CustomSpeechRecognition.isAvailable();
        setAvailable(isAvailable);
        addToLog(`Speech recognition available: ${isAvailable}`);
        
        if (isAvailable) {
          if (Platform.OS === 'android') {
            const granted = await requestMicrophonePermission();
            setPermissionGranted(granted);
            addToLog(`Microphone permission ${granted ? 'granted' : 'denied'}`);
          } else {
            setPermissionGranted(true);
          }
        }
      } catch (error) {
        console.error('Error checking availability:', error);
        addToLog(`Error checking availability: ${error.message}`);
        setAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
  }, []);

  // Request microphone permission on Android
  const requestMicrophonePermission = async () => {
    try {
      if (Platform.OS !== 'android') {
        return true;
      }

      addToLog('Requesting RECORD_AUDIO permission');
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'This app needs access to your microphone to enable voice input.',
          buttonPositive: 'Grant Permission',
          buttonNegative: 'Cancel',
        }
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Error requesting permission:', error);
      addToLog(`Error requesting permission: ${error.message}`);
      return false;
    }
  };

  // Start listening
  const startListening = async () => {
    try {
      addToLog('Starting speech recognition...');
      setResults('');
      setPartialResults('');

      // Set up the event callbacks
      CustomSpeechRecognition.setCallbacks({
        onSpeechStart: () => {
          addToLog('Speech started');
          setIsListening(true);
        },
        onSpeechEnd: () => {
          addToLog('Speech ended');
          setIsListening(false);
        },
        onSpeechResults: (text) => {
          addToLog(`Speech results: ${text}`);
          setResults(text);
        },
        onSpeechPartialResults: (text) => {
          addToLog(`Partial results: ${text}`);
          setPartialResults(text);
        },
        onSpeechError: (error) => {
          console.error('Speech recognition error:', error);
          addToLog(`Speech error: ${JSON.stringify(error)}`);
          setIsListening(false);
          
          let errorMessage = 'An error occurred during speech recognition.';
          if (error && error.message) {
            errorMessage = error.message;
          } else if (error && error.code) {
            // Error codes from SpeechRecognizer
            switch (error.code) {
              case 1:
                errorMessage = 'Network operation timed out.';
                break;
              case 2:
                errorMessage = 'Network error.';
                break;
              case 3:
                errorMessage = 'Audio recording error.';
                break;
              case 4:
                errorMessage = 'Server error.';
                break;
              case 5:
                errorMessage = 'Client side error.';
                break;
              case 6:
                errorMessage = 'No speech heard.';
                break;
              case 7:
                errorMessage = 'Too much speech.';
                break;
              case 8:
                errorMessage = 'No match found.';
                break;
              case 9:
                errorMessage = 'Recognizer busy.';
                break;
              default:
                errorMessage = `Error: ${error.code}`;
            }
          }
          
          Alert.alert('Speech Recognition Error', errorMessage);
        },
      });

      // Start speech recognition
      await CustomSpeechRecognition.startListening(Platform.OS === 'android' ? 'en-US' : 'en_US');
      setIsListening(true);
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      addToLog(`Error starting: ${error.message}`);
      setIsListening(false);
      Alert.alert('Error', error.message);
    }
  };

  // Stop listening
  const stopListening = async () => {
    try {
      addToLog('Stopping speech recognition...');
      await CustomSpeechRecognition.stopListening();
      setIsListening(false);
      addToLog('Speech recognition stopped');
    } catch (error) {
      console.error('Error stopping speech recognition:', error);
      addToLog(`Error stopping: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6C5CE7" />
        <Text style={styles.loadingText}>Checking speech recognition availability...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Speech Recognition Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>
          Recognition Available:{' '}
          <Text style={available ? styles.statusGood : styles.statusBad}>
            {available ? 'Yes' : 'No'}
          </Text>
        </Text>
        
        <Text style={styles.statusLabel}>
          Microphone Permission:{' '}
          <Text style={permissionGranted ? styles.statusGood : styles.statusBad}>
            {permissionGranted ? 'Granted' : 'Denied'}
          </Text>
        </Text>
      </View>

      <View style={styles.resultContainer}>
        <Text style={styles.resultTitle}>Recognition Results:</Text>
        <ScrollView style={styles.resultText}>
          <Text style={styles.resultContent}>{results || '(No results yet)'}</Text>
        </ScrollView>
      </View>

      {isListening && (
        <View style={styles.partialContainer}>
          <Text style={styles.partialTitle}>Listening:</Text>
          <Text style={styles.partialText}>{partialResults || '...'}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {!isListening ? (
          <TouchableOpacity
            style={[
              styles.button,
              (!available || !permissionGranted) && styles.buttonDisabled,
            ]}
            onPress={startListening}
            disabled={!available || !permissionGranted}
          >
            <Ionicons name="mic" size={24} color="white" />
            <Text style={styles.buttonText}>Start Listening</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stopListening}>
            <Ionicons name="stop" size={24} color="white" />
            <Text style={styles.buttonText}>Stop Listening</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Debug Log:</Text>
        <ScrollView style={styles.logScroll}>
          {log.map((entry, index) => (
            <Text key={index} style={styles.logEntry}>
              {entry}
            </Text>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F7',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusLabel: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
    color: '#333',
  },
  statusGood: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusBad: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    height: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: '500',
    color: '#333',
  },
  resultText: {
    flex: 1,
  },
  resultContent: {
    fontSize: 16,
    color: '#6C5CE7',
    fontWeight: '500',
  },
  partialContainer: {
    backgroundColor: '#F0F0FF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6C5CE7',
  },
  partialTitle: {
    fontSize: 14,
    marginBottom: 5,
    fontWeight: '500',
    color: '#333',
  },
  partialText: {
    fontSize: 14,
    color: '#6C5CE7',
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#6C5CE7',
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#B5B5B5',
  },
  stopButton: {
    backgroundColor: '#FF5252',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  logTitle: {
    color: '#FFF',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  logScroll: {
    flex: 1,
  },
  logEntry: {
    color: '#DDD',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    marginBottom: 3,
  },
}); 