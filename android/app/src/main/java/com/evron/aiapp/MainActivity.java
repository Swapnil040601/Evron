package com.evron.aiapp;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.evron.aiapp.plugins.DeviceInfoPlugin;
import com.evron.aiapp.plugins.BackgroundLocationPlugin;
import com.evron.aiapp.plugins.PushNotificationPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DeviceInfoPlugin.class);
        registerPlugin(BackgroundLocationPlugin.class);
        registerPlugin(PushNotificationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
