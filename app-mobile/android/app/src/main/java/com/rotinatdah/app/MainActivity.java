package com.rotinatdah.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    public static final String NOTIFICATION_CHANNEL_ID = "rotina-tdah-alerts";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (manager == null) return;

        NotificationChannel existing = manager.getNotificationChannel(NOTIFICATION_CHANNEL_ID);
        if (existing != null) return;

        NotificationChannel channel = new NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "Lembretes da Rotina",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Lembretes de horários e tarefas da rotina diária");
        channel.enableVibration(true);
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }
}
