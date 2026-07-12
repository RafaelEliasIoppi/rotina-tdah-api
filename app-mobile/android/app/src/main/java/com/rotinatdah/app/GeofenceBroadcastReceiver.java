package com.rotinatdah.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofenceStatusCodes;
import com.google.android.gms.location.GeofencingEvent;

import java.util.List;

/**
 * Recebe as transicoes de geofence (enter/exit) mesmo com o app fechado e
 * dispara uma notificacao local nativa (fora do bridge Capacitor/JS, que nao
 * esta disponivel nesse contexto).
 *
 * Reaproveita o MESMO notification channel ("default") ja criado pelo
 * @capacitor/local-notifications (ver LocalNotificationManager.
 * DEFAULT_NOTIFICATION_CHANNEL_ID no plugin oficial), para manter a mesma
 * aparencia/comportamento de notificacao no app todo.
 */
public class GeofenceBroadcastReceiver extends BroadcastReceiver {

    private static final String DEFAULT_NOTIFICATION_CHANNEL_ID = "default";
    private static final String PREFS_NAME = "geofence_prefs";
    private static final String PREF_KEY_PREFIX = "geofence_last_fired_";
    private static final String PREF_LABEL_PREFIX = "geofence_label_";
    private static final String PREF_TASK_PREFIX = "geofence_task_";
    private static final long RATE_LIMIT_MS = 3 * 60 * 60 * 1000L; // 3 horas

    @Override
    public void onReceive(Context context, Intent intent) {
        GeofencingEvent geofencingEvent = GeofencingEvent.fromIntent(intent);
        if (geofencingEvent == null) {
            return;
        }

        if (geofencingEvent.hasError()) {
            String errorMessage = GeofenceStatusCodes.getStatusCodeString(geofencingEvent.getErrorCode());
            android.util.Log.e("GeofenceReceiver", "Erro no evento de geofence: " + errorMessage);
            return;
        }

        int transitionType = geofencingEvent.getGeofenceTransition();
        if (transitionType != Geofence.GEOFENCE_TRANSITION_ENTER
                && transitionType != Geofence.GEOFENCE_TRANSITION_EXIT) {
            return;
        }

        List<Geofence> triggeringGeofences = geofencingEvent.getTriggeringGeofences();
        if (triggeringGeofences == null || triggeringGeofences.isEmpty()) {
            return;
        }

        boolean isEnter = transitionType == Geofence.GEOFENCE_TRANSITION_ENTER;

        for (Geofence geofence : triggeringGeofences) {
            String geofenceId = geofence.getRequestId();
            if (geofenceId == null) continue;

            if (isRateLimited(context, geofenceId)) {
                continue;
            }

            markFired(context, geofenceId);
            showNotification(context, geofenceId, isEnter);
        }
    }

    private boolean isRateLimited(Context context, String geofenceId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long lastFired = prefs.getLong(PREF_KEY_PREFIX + geofenceId, 0L);
        long now = System.currentTimeMillis();
        return (now - lastFired) < RATE_LIMIT_MS;
    }

    private void markFired(Context context, String geofenceId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putLong(PREF_KEY_PREFIX + geofenceId, System.currentTimeMillis()).apply();
    }

    private void showNotification(Context context, String geofenceId, boolean isEnter) {
        ensureNotificationChannel(context);

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String label = prefs.getString(PREF_LABEL_PREFIX + geofenceId, null);
        String taskLabel = prefs.getString(PREF_TASK_PREFIX + geofenceId, null);

        String title = "Rotina TDAH";
        String body;
        if (label != null && taskLabel != null) {
            body = (isEnter ? "Chegando em " : "Saindo de ") + label + ": " + taskLabel;
        } else if (label != null) {
            body = isEnter
                ? "Voce chegou em " + label + "."
                : "Voce saiu de " + label + ".";
        } else {
            body = isEnter
                ? "Voce chegou em um local com lembrete."
                : "Voce saiu de um local com lembrete.";
        }

        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }
            contentIntent = PendingIntent.getActivity(context, geofenceId.hashCode(), launchIntent, flags);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, DEFAULT_NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager != null) {
            notificationManager.notify(geofenceId.hashCode(), builder.build());
        }
    }

    /**
     * Garante que o channel "default" exista, mesmo se este receiver disparar
     * antes de o app ter sido aberto (e portanto antes de o plugin
     * @capacitor/local-notifications ter criado o channel). O ID e os
     * parametros replicam exatamente o que o plugin oficial cria, para nao
     * gerar um segundo channel com comportamento diferente.
     */
    private void ensureNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager notificationManager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) return;

        NotificationChannel existing = notificationManager.getNotificationChannel(DEFAULT_NOTIFICATION_CHANNEL_ID);
        if (existing != null) return;

        NotificationChannel channel = new NotificationChannel(
            DEFAULT_NOTIFICATION_CHANNEL_ID,
            "Default",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Default");
        notificationManager.createNotificationChannel(channel);
    }
}
