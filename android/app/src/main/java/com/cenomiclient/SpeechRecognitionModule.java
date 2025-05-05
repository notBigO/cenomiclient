package com.cenomiclient;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.app.Activity;
import android.widget.Toast;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class SpeechRecognitionModule extends ReactContextBaseJavaModule implements ActivityEventListener {
    private static final String TAG = "SpeechRecognitionModule";
    private static final int REQUEST_SPEECH_RECOGNITION = 1000;
    
    private final ReactApplicationContext reactContext;
    private SpeechRecognizer speechRecognizer;
    private boolean isListening = false;
    private Promise pendingPromise;

    public SpeechRecognitionModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        
        // Register activity event listener
        reactContext.addActivityEventListener(this);
    }
    
    // Activity result handler
    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == REQUEST_SPEECH_RECOGNITION) {
                isListening = false;
                
                if (resultCode == Activity.RESULT_OK && data != null) {
                    ArrayList<String> results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
                    if (results != null && !results.isEmpty()) {
                        WritableMap params = Arguments.createMap();
                        WritableArray resultArray = Arguments.createArray();
                        
                        for (String result : results) {
                            resultArray.pushString(result);
                        }
                        
                        params.putArray("value", resultArray);
                        sendEvent("onSpeechResults", params);
                        
                        if (pendingPromise != null) {
                            pendingPromise.resolve(true);
                            pendingPromise = null;
                        }
                    }
                } else if (resultCode == Activity.RESULT_CANCELED) {
                    WritableMap params = Arguments.createMap();
                    params.putString("error", "Speech recognition cancelled");
                    sendEvent("onSpeechError", params);
                    
                    if (pendingPromise != null) {
                        pendingPromise.reject("cancelled", "Speech recognition was cancelled");
                        pendingPromise = null;
                    }
                }
            }
        }
    };

    @Override
    public String getName() {
        return "SpeechRecognition";
    }

    private void sendEvent(String eventName, WritableMap params) {
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
        } catch (Exception e) {
            Log.e(TAG, "Error sending event: " + e.getMessage());
        }
    }

    @ReactMethod
    public void isAvailable(Promise promise) {
        try {
            // Check if any speech recognition service is available on the device
            PackageManager pm = reactContext.getPackageManager();
            List<ResolveInfo> activities = pm.queryIntentActivities(
                new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0);
            
            boolean isAvailable = !activities.isEmpty();
            Log.d(TAG, "Speech recognition availability: " + isAvailable);
            
            if (isAvailable) {
                // Also check if direct SpeechRecognizer is available
                boolean recognizerAvailable = SpeechRecognizer.isRecognitionAvailable(reactContext);
                Log.d(TAG, "SpeechRecognizer availability: " + recognizerAvailable);
                
                // We'll consider it available if either approach works
                promise.resolve(isAvailable || recognizerAvailable);
            } else {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking availability: " + e.getMessage());
            promise.reject("ERR_AVAILABILITY", "Error checking if speech recognition is available", e);
        }
    }

    // Check if Google app is installed
    private boolean isGoogleAppInstalled() {
        try {
            PackageManager pm = reactContext.getPackageManager();
            pm.getPackageInfo("com.google.android.googlequicksearchbox", PackageManager.GET_ACTIVITIES);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
    
    // Method to use speech recognition via Activity (more reliable)
    private void startSpeechRecognitionActivity(String locale) {
        Activity currentActivity = getCurrentActivity();
        if (currentActivity == null) {
            if (pendingPromise != null) {
                pendingPromise.reject("no_activity", "No activity available");
                pendingPromise = null;
            }
            return;
        }
        
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
        
        // Set language
        if (locale != null && !locale.isEmpty()) {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, locale);
        } else {
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
        }
        
        // Set prompt
        intent.putExtra(RecognizerIntent.EXTRA_PROMPT, "Speak now...");
        
        try {
            currentActivity.startActivityForResult(intent, REQUEST_SPEECH_RECOGNITION);
            isListening = true;
            
            WritableMap params = Arguments.createMap();
            sendEvent("onSpeechStart", params);
            
            Log.d(TAG, "Speech recognition activity started");
        } catch (Exception e) {
            Log.e(TAG, "Error starting speech recognition activity: " + e);
            
            if (pendingPromise != null) {
                pendingPromise.reject("activity_error", "Error launching speech recognition: " + e.getMessage());
                pendingPromise = null;
            }
            
            WritableMap params = Arguments.createMap();
            params.putString("error", "Error starting speech recognition: " + e.getMessage());
            sendEvent("onSpeechError", params);
        }
    }

    @ReactMethod
    public void startListening(String locale, Promise promise) {
        try {
            if (isListening) {
                // Already listening, stop first
                stopListening(null);
            }
            
            // Store promise for later resolution
            pendingPromise = promise;
            
            // Check for approach #1: Direct activity launch (most reliable)
            PackageManager pm = reactContext.getPackageManager();
            List<ResolveInfo> activities = pm.queryIntentActivities(
                new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0);
                
            if (!activities.isEmpty()) {
                Log.d(TAG, "Using activity-based speech recognition");
                startSpeechRecognitionActivity(locale);
                return;
            }
            
            // Approach #2: Use SpeechRecognizer directly
            boolean recognizerAvailable = SpeechRecognizer.isRecognitionAvailable(reactContext);
            
            if (recognizerAvailable) {
                // Initialize speech recognizer if needed
                if (speechRecognizer == null) {
                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext);
                    setupRecognitionListener();
                }
    
                // Configure recognition intent
                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5);
                
                // Handle language
                if (locale != null && !locale.isEmpty()) {
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, locale);
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, locale);
                } else {
                    intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
                }
    
                // Start listening
                speechRecognizer.startListening(intent);
                isListening = true;
                
                Log.d(TAG, "Speech recognition started via SpeechRecognizer");
                
                // We'll resolve the promise when we get results
            } else {
                // Both approaches failed - check if Google app is installed
                if (!isGoogleAppInstalled()) {
                    Log.e(TAG, "Google app not installed, speech recognition unavailable");
                    promise.reject("not_available", "Speech recognition not available. Google app not installed.");
                } else {
                    Log.e(TAG, "Speech recognition not available on this device");
                    promise.reject("not_available", "Speech recognition not available on this device");
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting speech recognition: " + e.getMessage());
            promise.reject("ERR_RECOGNITION_START", "Error starting speech recognition", e);
        }
    }

    @ReactMethod
    public void stopListening(Promise promise) {
        try {
            isListening = false;
            
            // Nothing to do for activity-based recognition
            
            // Stop SpeechRecognizer if active
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
                Log.d(TAG, "Speech recognition stopped");
            }
            
            if (promise != null) {
                promise.resolve(true);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping speech recognition: " + e.getMessage());
            if (promise != null) {
                promise.reject("ERR_RECOGNITION_STOP", "Error stopping speech recognition", e);
            }
        }
    }

    @ReactMethod
    public void destroy(Promise promise) {
        try {
            isListening = false;
            
            if (speechRecognizer != null) {
                speechRecognizer.destroy();
                speechRecognizer = null;
                Log.d(TAG, "Speech recognizer destroyed");
            }
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Error destroying speech recognizer: " + e.getMessage());
            promise.reject("ERR_RECOGNITION_DESTROY", "Error destroying speech recognizer", e);
        }
    }

    @ReactMethod
    public void isListening(Promise promise) {
        promise.resolve(isListening);
    }

    private void setupRecognitionListener() {
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override
            public void onReadyForSpeech(Bundle bundle) {
                WritableMap params = Arguments.createMap();
                sendEvent("onSpeechStart", params);
                Log.d(TAG, "Ready for speech");
            }

            @Override
            public void onBeginningOfSpeech() {
                WritableMap params = Arguments.createMap();
                sendEvent("onSpeechStart", params);
                Log.d(TAG, "Beginning of speech");
            }

            @Override
            public void onRmsChanged(float v) {
                // Not used but required to implement
            }

            @Override
            public void onBufferReceived(byte[] bytes) {
                // Not used but required to implement
            }

            @Override
            public void onEndOfSpeech() {
                WritableMap params = Arguments.createMap();
                sendEvent("onSpeechEnd", params);
                isListening = false;
                Log.d(TAG, "End of speech");
            }

            @Override
            public void onError(int errorCode) {
                WritableMap params = Arguments.createMap();
                params.putInt("code", errorCode);
                
                String errorMessage;
                switch (errorCode) {
                    case SpeechRecognizer.ERROR_AUDIO:
                        errorMessage = "Audio recording error";
                        break;
                    case SpeechRecognizer.ERROR_CLIENT:
                        errorMessage = "Client side error";
                        break;
                    case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                        errorMessage = "Insufficient permissions";
                        break;
                    case SpeechRecognizer.ERROR_NETWORK:
                        errorMessage = "Network error";
                        break;
                    case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                        errorMessage = "Network timeout";
                        break;
                    case SpeechRecognizer.ERROR_NO_MATCH:
                        errorMessage = "No recognition result matched";
                        break;
                    case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
                        errorMessage = "Recognition service busy";
                        break;
                    case SpeechRecognizer.ERROR_SERVER:
                        errorMessage = "Server error";
                        break;
                    case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                        errorMessage = "No speech input";
                        break;
                    default:
                        errorMessage = "Unknown error";
                        break;
                }
                
                params.putString("message", errorMessage);
                sendEvent("onSpeechError", params);
                isListening = false;
                Log.e(TAG, "Speech recognition error: " + errorMessage);
                
                if (pendingPromise != null) {
                    pendingPromise.reject("recognition_error", errorMessage);
                    pendingPromise = null;
                }
            }

            @Override
            public void onResults(Bundle results) {
                WritableMap params = Arguments.createMap();
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                
                WritableArray resultArray = Arguments.createArray();
                if (matches != null) {
                    for (String result : matches) {
                        resultArray.pushString(result);
                    }
                }
                
                params.putArray("value", resultArray);
                sendEvent("onSpeechResults", params);
                isListening = false;
                Log.d(TAG, "Speech results received");
                
                if (pendingPromise != null) {
                    pendingPromise.resolve(true);
                    pendingPromise = null;
                }
            }

            @Override
            public void onPartialResults(Bundle partialResults) {
                WritableMap params = Arguments.createMap();
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                
                WritableArray resultArray = Arguments.createArray();
                if (matches != null) {
                    for (String result : matches) {
                        resultArray.pushString(result);
                    }
                }
                
                params.putArray("value", resultArray);
                sendEvent("onSpeechPartialResults", params);
                Log.d(TAG, "Partial speech results received");
            }

            @Override
            public void onEvent(int i, Bundle bundle) {
                // Not used but required to implement
            }
        });
    }

    // Required methods for ActivityEventListener
    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        activityEventListener.onActivityResult(activity, requestCode, resultCode, data);
    }

    @Override
    public void onNewIntent(Intent intent) {
        // Not needed for speech recognition
    }
} 