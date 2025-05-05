package com.cenomiclient;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

import android.content.pm.PackageManager;
import android.content.pm.PackageInfo;
import android.util.Log;

public class PackageManagerModule extends ReactContextBaseJavaModule {
    private static final String TAG = "PackageManagerModule";
    private final ReactApplicationContext reactContext;

    public PackageManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "PackageManager";
    }

    @ReactMethod
    public void isPackageInstalled(String packageName, Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            try {
                pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
                promise.resolve(true);
            } catch (PackageManager.NameNotFoundException e) {
                promise.resolve(false);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking package: " + e.getMessage());
            promise.reject("ERR_PACKAGE_CHECK", "Error checking if package is installed", e);
        }
    }

    @ReactMethod
    public void getPackageInfo(String packageName, Promise promise) {
        try {
            PackageManager pm = reactContext.getPackageManager();
            try {
                PackageInfo info = pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
                WritableMap infoMap = Arguments.createMap();
                infoMap.putString("packageName", info.packageName);
                infoMap.putString("versionName", info.versionName);
                infoMap.putInt("versionCode", info.versionCode);
                promise.resolve(infoMap);
            } catch (PackageManager.NameNotFoundException e) {
                promise.reject("ERR_PACKAGE_NOT_FOUND", "Package not found", e);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting package info: " + e.getMessage());
            promise.reject("ERR_PACKAGE_INFO", "Error getting package info", e);
        }
    }
} 