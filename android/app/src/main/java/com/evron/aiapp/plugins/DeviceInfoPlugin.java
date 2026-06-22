package com.evron.aiapp.plugins;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.wifi.WifiInfo;
import android.net.wifi.WifiManager;
import android.os.BatteryManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@CapacitorPlugin(name = "DeviceInfo")
public class DeviceInfoPlugin extends Plugin {

    // Packages to ignore when counting "other app opens"
    private static final String[] IGNORED_PACKAGES = {
        "com.android.systemui",
        "com.android.launcher",
        "com.android.launcher2",
        "com.android.launcher3",
        "com.google.android.apps.nexuslauncher",
        "com.miui.home",
        "com.sec.android.app.launcher",
        "com.huawei.android.launcher",
        "com.coloros.launcher",
        "com.vivo.launcher",
        "com.oneplus.launcher",
        "com.android.inputmethod",
        "com.google.android.inputmethod",
        "com.swiftkey",
        "com.touchtype.swiftkey",
    };

    @PluginMethod
    public void getInfo(PluginCall call) {
        Context context = getContext();
        JSObject result = new JSObject();

        // ── Device ID (stable per-device, no special permission needed) ──────
        try {
            String androidId = Settings.Secure.getString(
                    context.getContentResolver(),
                    Settings.Secure.ANDROID_ID);
            result.put("deviceId", (androidId != null && !androidId.isEmpty()) ? androidId : null);
        } catch (Exception e) {
            result.put("deviceId", (Object) null);
        }

        // ── WiFi SSID ─────────────────────────────────────────────────────────
        try {
            WifiManager wm = (WifiManager) context.getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            WifiInfo info = wm.getConnectionInfo();
            String ssid = info != null ? info.getSSID() : null;
            if (ssid != null) {
                if (ssid.startsWith("\"") && ssid.endsWith("\"")) {
                    ssid = ssid.substring(1, ssid.length() - 1);
                }
                if ("<unknown ssid>".equals(ssid) || ssid.isEmpty()) {
                    ssid = null;
                }
            }
            result.put("wifiSsid", ssid);
        } catch (Exception e) {
            result.put("wifiSsid", (Object) null);
        }

        // ── Location Services Enabled ─────────────────────────────────────────
        try {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            boolean locationEnabled = false;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                locationEnabled = lm.isLocationEnabled();
            } else {
                locationEnabled = lm.isProviderEnabled(LocationManager.GPS_PROVIDER)
                        || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
            }
            result.put("locationEnabled", locationEnabled);
        } catch (Exception e) {
            result.put("locationEnabled", false);
        }

        // ── Developer Mode ────────────────────────────────────────────────────
        try {
            int devMode = Settings.Global.getInt(
                    context.getContentResolver(),
                    Settings.Global.DEVELOPMENT_SETTINGS_ENABLED, 0);
            result.put("isDeveloperMode", devMode == 1);
        } catch (Exception e) {
            result.put("isDeveloperMode", false);
        }

        // ── App Opens via UsageEvents ─────────────────────────────────────────
        boolean hasUsagePermission = hasUsageStatsPermission(context);
        result.put("hasUsagePermission", hasUsagePermission);

        int totalOtherAppOpens = 0;
        JSONObject appOpenDetail = new JSONObject();
        JSONArray appTimeline = new JSONArray();

        if (hasUsagePermission) {
            try {
                UsageStatsManager usm = (UsageStatsManager)
                        context.getSystemService(Context.USAGE_STATS_SERVICE);

                Calendar midnight = Calendar.getInstance();
                midnight.set(Calendar.HOUR_OF_DAY, 0);
                midnight.set(Calendar.MINUTE, 0);
                midnight.set(Calendar.SECOND, 0);
                midnight.set(Calendar.MILLISECOND, 0);
                long workStart = midnight.getTimeInMillis();
                long now = System.currentTimeMillis();

                UsageEvents events = usm.queryEvents(workStart, now);
                UsageEvents.Event event = new UsageEvents.Event();
                Map<String, Integer> counts = new HashMap<>();
                Map<String, List<Long>> timestamps = new HashMap<>();
                String myPkg = context.getPackageName();

                while (events.hasNextEvent()) {
                    events.getNextEvent(event);
                    if (event.getEventType() != UsageEvents.Event.MOVE_TO_FOREGROUND) continue;

                    String pkg = event.getPackageName();
                    if (pkg == null || pkg.equals(myPkg)) continue;
                    if (isIgnored(pkg)) continue;

                    counts.merge(pkg, 1, Integer::sum);
                    timestamps.computeIfAbsent(pkg, k -> new ArrayList<>()).add(event.getTimeStamp());
                    totalOtherAppOpens++;
                }

                PackageManager pm = context.getPackageManager();
                SimpleDateFormat sdf = new SimpleDateFormat("hh:mm a", Locale.getDefault());

                for (Map.Entry<String, Integer> entry : counts.entrySet()) {
                    String label = entry.getKey();
                    try {
                        ApplicationInfo ai = pm.getApplicationInfo(entry.getKey(), 0);
                        label = pm.getApplicationLabel(ai).toString();
                    } catch (Exception ignored) {}
                    appOpenDetail.put(label, entry.getValue());

                    List<Long> times = timestamps.get(entry.getKey());
                    if (times != null) {
                        for (Long ts : times) {
                            JSONObject item = new JSONObject();
                            item.put("app", label);
                            item.put("time", sdf.format(new Date(ts)));
                            item.put("ts", ts);
                            appTimeline.put(item);
                        }
                    }
                }

            } catch (Exception e) {
                // no-op
            }
        }

        result.put("otherAppOpens", totalOtherAppOpens);
        result.put("appOpensDetail", appOpenDetail.toString());
        result.put("appTimeline", appTimeline.toString());

        // ── Battery Info ──────────────────────────────────────────────────────
        try {
            IntentFilter ifilter = new IntentFilter(Intent.ACTION_BATTERY_CHANGED);
            Intent batteryStatus = context.registerReceiver(null, ifilter);
            if (batteryStatus != null) {
                int level = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                int scale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, 100);
                int pct = (int) ((level / (float) scale) * 100);
                result.put("batteryLevel", pct);

                int status = batteryStatus.getIntExtra(BatteryManager.EXTRA_STATUS, -1);
                String chargingStatus = "unknown";
                if (status == BatteryManager.BATTERY_STATUS_CHARGING) chargingStatus = "charging";
                else if (status == BatteryManager.BATTERY_STATUS_DISCHARGING) chargingStatus = "discharging";
                else if (status == BatteryManager.BATTERY_STATUS_FULL) chargingStatus = "full";
                else if (status == BatteryManager.BATTERY_STATUS_NOT_CHARGING) chargingStatus = "not_charging";
                result.put("chargingStatus", chargingStatus);

                int plugged = batteryStatus.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0);
                String plugType = "none";
                if (plugged == BatteryManager.BATTERY_PLUGGED_AC) plugType = "ac";
                else if (plugged == BatteryManager.BATTERY_PLUGGED_USB) plugType = "usb";
                else if (plugged == BatteryManager.BATTERY_PLUGGED_WIRELESS) plugType = "wireless";
                result.put("plugType", plugType);

                int health = batteryStatus.getIntExtra(BatteryManager.EXTRA_HEALTH, -1);
                String healthStr = "unknown";
                if (health == BatteryManager.BATTERY_HEALTH_GOOD) healthStr = "good";
                else if (health == BatteryManager.BATTERY_HEALTH_OVERHEAT) healthStr = "overheat";
                else if (health == BatteryManager.BATTERY_HEALTH_DEAD) healthStr = "dead";
                else if (health == BatteryManager.BATTERY_HEALTH_OVER_VOLTAGE) healthStr = "over_voltage";
                else if (health == BatteryManager.BATTERY_HEALTH_COLD) healthStr = "cold";
                result.put("batteryHealth", healthStr);

                int temp = batteryStatus.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0);
                result.put("batteryTemp", temp / 10.0);
            }
        } catch (Exception e) {
            result.put("batteryLevel", -1);
            result.put("chargingStatus", "unknown");
            result.put("batteryHealth", "unknown");
        }

        call.resolve(result);
    }

    @PluginMethod
    public void openUsageAccessSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open settings: " + e.getMessage());
        }
    }

    private boolean hasUsageStatsPermission(Context context) {
        try {
            AppOpsManager aom = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
            int mode = aom.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    android.os.Process.myUid(),
                    context.getPackageName());
            return mode == AppOpsManager.MODE_ALLOWED;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isIgnored(String pkg) {
        for (String ignored : IGNORED_PACKAGES) {
            if (pkg.startsWith(ignored)) return true;
        }
        return false;
    }
}
