package com.threebigha.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;

        manager.createNotificationChannel(new NotificationChannel(
                "chat_message",
                "Chat Messages",
                NotificationManager.IMPORTANCE_HIGH
        ));

        manager.createNotificationChannel(new NotificationChannel(
                "rfq_response",
                "RFQ Responses",
                NotificationManager.IMPORTANCE_HIGH
        ));

        manager.createNotificationChannel(new NotificationChannel(
                "vendor_lead",
                "Vendor Leads",
                NotificationManager.IMPORTANCE_HIGH
        ));

        manager.createNotificationChannel(new NotificationChannel(
                "procurement_alert",
                "Procurement Alerts",
                NotificationManager.IMPORTANCE_HIGH
        ));

        manager.createNotificationChannel(new NotificationChannel(
                "operational_alert",
                "Operational Alerts",
                NotificationManager.IMPORTANCE_DEFAULT
        ));

        manager.createNotificationChannel(new NotificationChannel(
                "silent_sync",
                "Background Sync",
                NotificationManager.IMPORTANCE_LOW
        ));
    }
}