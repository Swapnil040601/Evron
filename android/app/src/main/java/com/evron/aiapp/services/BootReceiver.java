package com.evron.aiapp.services;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {

            SharedPreferences prefs = context.getSharedPreferences("evron_tracking", Context.MODE_PRIVATE);
            String apiUrl = prefs.getString("apiUrl", null);
            String authToken = prefs.getString("authToken", null);

            if (apiUrl != null && authToken != null) {
                Log.d(TAG, "Boot detected — restarting location tracking");
                Intent serviceIntent = new Intent(context, LocationTrackingService.class);
                serviceIntent.putExtra("apiUrl", apiUrl);
                serviceIntent.putExtra("authToken", authToken);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
}
