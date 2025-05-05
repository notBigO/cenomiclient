package com.cenomiclient;

import android.content.res.AssetManager;
import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.json.JSONException;
import org.json.JSONObject;
import org.vosk.Model;
import org.vosk.Recognizer;
import org.vosk.android.RecognitionListener;
import org.vosk.android.SpeechService;
import org.vosk.android.SpeechStreamService;
import org.vosk.android.StorageService;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

public class VoskModule extends ReactContextBaseJavaModule implements RecognitionListener {
    private static final String TAG = "VoskModule";
    private final ReactApplicationContext reactContext;
    private Model model;
    private SpeechService speechService;
    private boolean isListening = false;
    private boolean modelReady = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    
    // Model file name in assets
    private static final String MODEL_PATH = "vosk-model-small-en-us-0.15";
    
    public VoskModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "VoskSpeechRecognition";
    }
    
    private void sendEvent(String eventName, WritableMap params) {
        reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }
    
    @ReactMethod
    public void initModel(Promise promise) {
        // Initialize the model in a background thread
        new Thread(() -> {
            try {
                Log.i(TAG, "Initializing Vosk model...");
                
                File modelDir = new File(reactContext.getExternalFilesDir(null), MODEL_PATH);
                
                // Check if model already exists
                if (!modelDir.exists()) {
                    Log.i(TAG, "Model doesn't exist, extracting from assets...");
                    try {
                        // Copy model from assets
                        extractModel(MODEL_PATH, modelDir);
                    } catch (IOException e) {
                        Log.e(TAG, "Failed to extract model: " + e.getMessage());
                        mainHandler.post(() -> promise.reject("init_error", "Failed to extract model: " + e.getMessage()));
                        return;
                    }
                }
                
                // Initialize the model
                model = new Model(modelDir.getPath());
                modelReady = true;
                
                Log.i(TAG, "Model initialized successfully.");
                mainHandler.post(() -> promise.resolve(true));
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize model: " + e.getMessage());
                mainHandler.post(() -> promise.reject("init_error", "Failed to initialize model: " + e.getMessage()));
            }
        }).start();
    }
    
    private void extractModel(String modelPath, File destDir) throws IOException {
        AssetManager assetManager = reactContext.getAssets();
        String[] files = assetManager.list(modelPath);
        
        if (files == null || files.length == 0) {
            throw new IOException("No model files found in assets");
        }
        
        if (!destDir.exists()) {
            destDir.mkdirs();
        }
        
        for (String file : files) {
            String fullAssetPath = modelPath + "/" + file;
            String[] subDirFiles = assetManager.list(fullAssetPath);
            
            if (subDirFiles != null && subDirFiles.length > 0) {
                // This is a subdirectory
                File subDir = new File(destDir, file);
                extractModel(fullAssetPath, subDir);
            } else {
                // This is a file
                try (InputStream in = assetManager.open(fullAssetPath)) {
                    File outFile = new File(destDir, file);
                    copyFile(in, outFile);
                }
            }
        }
    }
    
    // Helper method to copy a file from input stream to output file
    private void copyFile(InputStream in, File outFile) throws IOException {
        try (FileOutputStream out = new FileOutputStream(outFile)) {
            byte[] buffer = new byte[1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                out.write(buffer, 0, read);
            }
        }
    }
    
    @ReactMethod
    public void isAvailable(Promise promise) {
        promise.resolve(modelReady);
    }
    
    @ReactMethod
    public void startListening(String locale, Promise promise) {
        if (!modelReady) {
            promise.reject("not_ready", "Speech recognition model is not ready");
            return;
        }
        
        if (speechService != null) {
            speechService.stop();
            speechService = null;
        }
        
        try {
            Recognizer recognizer = new Recognizer(model, 16000.0f);
            
            int audioSource = MediaRecorder.AudioSource.MIC;
            int sampleRate = 16000;
            int channelConfig = AudioFormat.CHANNEL_IN_MONO;
            int audioFormat = AudioFormat.ENCODING_PCM_16BIT;
            int bufferSize = AudioRecord.getMinBufferSize(sampleRate, channelConfig, audioFormat);
            
            if (bufferSize == AudioRecord.ERROR || bufferSize == AudioRecord.ERROR_BAD_VALUE) {
                bufferSize = sampleRate * 2;
            }
            
            speechService = new SpeechService(recognizer, sampleRate);
            speechService.startListening(this);
            
            isListening = true;
            
            // Notify JS that listening has started
            WritableMap params = Arguments.createMap();
            sendEvent("onSpeechStart", params);
            
            promise.resolve(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to start listening: " + e.getMessage());
            promise.reject("start_error", "Failed to start listening: " + e.getMessage());
        }
    }
    
    @ReactMethod
    public void stopListening(Promise promise) {
        if (speechService != null) {
            speechService.stop();
            speechService = null;
            isListening = false;
            
            // Notify JS that listening has stopped
            WritableMap params = Arguments.createMap();
            sendEvent("onSpeechEnd", params);
        }
        
        promise.resolve(true);
    }
    
    @ReactMethod
    public void isListening(Promise promise) {
        promise.resolve(isListening);
    }
    
    @ReactMethod
    public void destroy(Promise promise) {
        if (speechService != null) {
            speechService.stop();
            speechService = null;
        }
        
        if (model != null) {
            model.close();
            model = null;
            modelReady = false;
        }
        
        promise.resolve(true);
    }
    
    // RecognitionListener implementation
    @Override
    public void onPartialResult(String hypothesis) {
        if (hypothesis != null && !hypothesis.isEmpty()) {
            try {
                JSONObject json = new JSONObject(hypothesis);
                if (json.has("partial")) {
                    String text = json.getString("partial");
                    if (!text.isEmpty()) {
                        WritableMap params = Arguments.createMap();
                        WritableMap value = Arguments.createMap();
                        value.putString("0", text);
                        params.putMap("value", value);
                        sendEvent("onSpeechPartialResults", params);
                    }
                }
            } catch (JSONException e) {
                Log.e(TAG, "JSON parsing error: " + e.getMessage());
            }
        }
    }
    
    @Override
    public void onResult(String result) {
        if (result != null && !result.isEmpty()) {
            try {
                JSONObject json = new JSONObject(result);
                if (json.has("text")) {
                    String text = json.getString("text");
                    if (!text.isEmpty()) {
                        WritableMap params = Arguments.createMap();
                        WritableMap value = Arguments.createMap();
                        value.putString("0", text);
                        params.putMap("value", value);
                        sendEvent("onSpeechResults", params);
                    }
                }
            } catch (JSONException e) {
                Log.e(TAG, "JSON parsing error: " + e.getMessage());
            }
        }
    }
    
    @Override
    public void onFinalResult(String result) {
        if (result != null && !result.isEmpty()) {
            try {
                JSONObject json = new JSONObject(result);
                if (json.has("text")) {
                    String text = json.getString("text");
                    WritableMap params = Arguments.createMap();
                    WritableMap value = Arguments.createMap();
                    value.putString("0", text);
                    params.putMap("value", value);
                    sendEvent("onSpeechResults", params);
                }
            } catch (JSONException e) {
                Log.e(TAG, "JSON parsing error: " + e.getMessage());
            }
        }
        
        if (speechService != null) {
            speechService.stop();
            speechService = null;
        }
        
        isListening = false;
        
        // Notify JS that listening has finished
        WritableMap params = Arguments.createMap();
        sendEvent("onSpeechEnd", params);
    }
    
    @Override
    public void onError(Exception e) {
        Log.e(TAG, "Recognition error: " + e.getMessage());
        
        WritableMap params = Arguments.createMap();
        params.putString("error", e.getMessage());
        sendEvent("onSpeechError", params);
        
        isListening = false;
    }
    
    @Override
    public void onTimeout() {
        Log.e(TAG, "Recognition timeout");
        
        WritableMap params = Arguments.createMap();
        params.putString("error", "Recognition timeout");
        sendEvent("onSpeechError", params);
        
        isListening = false;
    }
} 