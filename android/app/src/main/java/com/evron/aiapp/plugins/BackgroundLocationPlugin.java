package com.evron.aiapp.plugins;

import android.content.Intent;
import android.os.Build;

import com.evron.aiapp.services.LocationTrackingService;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BackgroundLocation")
public class BackgroundLocationPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        String apiUrl = call.getString("apiUrl", "");
        String authToken = call.getString("authToken", "");

        Intent intent = new Intent(getContext(), LocationTrackingService.class);
        intent.putExtra("apiUrl", apiUrl);
        intent.putExtra("authToken", authToken);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }

        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), LocationTrackingService.class);
        getContext().stopService(intent);
        call.resolve();
    }
}
