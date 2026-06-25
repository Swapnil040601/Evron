package com.evron.aiapp.services;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.IntentFilter;
import android.location.Location;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import com.evron.aiapp.MainActivity;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class LocationTrackingService extends Service {
    private static final String TAG = "LocationTracking";
    private static final String CHANNEL_ID = "evron_location_channel";
    private static final int NOTIFICATION_ID = 1001;
    private static final long INTERVAL_MS = 30_000;

    private FusedLocationProviderClient fusedClient;
    private LocationCallback locationCallback;
    private String apiUrl;
    private String authToken;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        fusedClient = LocationServices.getFusedLocationProviderClient(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            apiUrl = intent.getStringExtra("apiUrl");
            authToken = intent.getStringExtra("authToken");
        }

        startForeground(NOTIFICATION_ID, buildNotification("Tracking location..."));

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, INTERVAL_MS)
                .setMinUpdateIntervalMillis(INTERVAL_MS / 2)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location loc = result.getLastLocation();
                if (loc == null || loc.getAccuracy() > 150) return;
                sendLocationToServer(loc);
            }
        };

        try {
            fusedClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.e(TAG, "Location permission denied", e);
            stopSelf();
        }

        return START_STICKY;
    }

    private void sendLocationToServer(Location loc) {
        if (apiUrl == null || authToken == null) return;

        new Thread(() -> {
            try {
                String wifiSsid = getWifiSsid();
                int[] battery = getBatteryInfo();
                int devMode = Settings.Global.getInt(getContentResolver(),
                        Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0);
                String deviceId = Settings.Secure.getString(getContentResolver(),
                        Settings.Secure.ANDROID_ID);

                String json = String.format(
                    "{\"latitude\":%f,\"longitude\":%f,\"accuracy\":%f," +
                    "\"wifi_ssid\":%s,\"network_type\":\"%s\"," +
                    "\"is_developer_mode\":%b,\"device_id\":\"%s\"," +
                    "\"battery_level\":%d,\"charging_status\":\"%s\"," +
                    "\"battery_health\":\"%s\",\"battery_temp\":%.1f}",
                    loc.getLatitude(), loc.getLongitude(), loc.getAccuracy(),
                    wifiSsid != null ? "\"" + wifiSsid + "\"" : "null",
                    wifiSsid != null ? "wifi" : "cellular",
                    devMode == 1, deviceId != null ? deviceId : "",
                    battery[0], getChargingStatus(battery[1]),
                    getBatteryHealthStr(battery[2]), battery[3] / 10.0
                );

                URL url = new URL(apiUrl + "/me/location");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setRequestProperty("Authorization", "Bearer " + authToken);
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(json.getBytes(StandardCharsets.UTF_8));
                }
                int code = conn.getResponseCode();
                conn.disconnect();

                updateNotification(String.format("Location sent (±%.0fm) · Battery %d%%", loc.getAccuracy(), battery[0]));
            } catch (Exception e) {
                Log.w(TAG, "Failed to send location: " + e.getMessage());
            }
        }).start();
    }

    private String getWifiSsid() {
        try {
            WifiManager wm = (WifiManager) getApplicationContext().getSystemService(WIFI_SERVICE);
            WifiInfo info = wm.getConnectionInfo();
            String ssid = info != null ? info.getSSID() : null;
            if (ssid != null) {
                if (ssid.startsWith("\"") && ssid.endsWith("\""))
                    ssid = ssid.substring(1, ssid.length() - 1);
                if ("<unknown ssid>".equals(ssid) || ssid.isEmpty()) ssid = null;
            }
            return ssid;
        } catch (Exception e) { return null; }
    }

    private int[] getBatteryInfo() {
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent bs = registerReceiver(null, ifilter);
            if (bs == null) return new int[]{-1, -1, -1, 0};
            int level = bs.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
            int scale = bs.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
            int pct = (int) ((level / (float) scale) * 100);
            int status = bs.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
            int health = bs.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
            int temp = bs.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
            return new int[]{pct, status, health, temp};
        } catch (Exception e) { return new int[]{-1, -1, -1, 0}; }
    }

    private String getChargingStatus(int status) {
        if (status == BatteryManager.BATTERY_STATUS_CHARGING) return "charging";
        if (status == BatteryManager.BATTERY_STATUS_FULL) return "full";
        if (status == BatteryManager.BATTERY_STATUS_DISCHARGING) return "discharging";
        if (status == BatteryManager.BATTERY_STATUS_NOT_CHARGING) return "not_charging";
        return "unknown";
    }

    private String getBatteryHealthStr(int health) {
        if (health == BatteryManager.BATTERY_HEALTH_GOOD) return "good";
        if (health == BatteryManager.BATTERY_HEALTH_OVERHEAT) return "overheat";
        if (health == BatteryManager.BATTERY_HEALTH_DEAD) return "dead";
        if (health == BatteryManager.BATTERY_HEALTH_COLD) return "cold";
        return "unknown";
    }

    private Notification buildNotification(String text) {
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Evron — Location Active")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pi)
                .setOngoing(true)
                .setSilent(true)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(text));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Location Tracking", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Tracks employee location during work hours");
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }

    @Override
    public void onDestroy() {
        if (fusedClient != null && locationCallback != null) {
            fusedClient.removeLocationUpdates(locationCallback);
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) { return null; }
}
