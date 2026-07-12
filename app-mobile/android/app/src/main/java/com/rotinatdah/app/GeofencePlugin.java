package com.rotinatdah.app;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.android.gms.location.Geofence;
import com.google.android.gms.location.GeofencingClient;
import com.google.android.gms.location.GeofencingRequest;
import com.google.android.gms.location.LocationServices;

import java.util.ArrayList;
import java.util.List;

/**
 * Plugin nativo Capacitor para "Lembretes por Lugar" (geofencing).
 *
 * Expoe ao JS:
 *  - addGeofence({id, lat, lng, radius, trigger})
 *  - removeGeofence({id})
 *  - requestPermissions()  (fluxo em duas etapas: FINE, depois BACKGROUND)
 *  - checkPermissions()
 *
 * O disparo real da notificacao ao cruzar a borda do geofence acontece em
 * {@link GeofenceBroadcastReceiver}, que roda fora do bridge JS (o app pode
 * estar fechado nesse momento).
 */
@CapacitorPlugin(
    name = "Geofence",
    permissions = {
        @Permission(alias = "location", strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }),
        @Permission(alias = "backgroundLocation", strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION })
    }
)
public class GeofencePlugin extends Plugin {

    public static final String ACTION_GEOFENCE_EVENT = "com.rotinatdah.app.ACTION_GEOFENCE_EVENT";

    private GeofencingClient geofencingClient;

    @Override
    public void load() {
        super.load();
        geofencingClient = LocationServices.getGeofencingClient(getContext());
    }

    private PendingIntent getGeofencePendingIntent() {
        Intent intent = new Intent(getContext(), GeofenceBroadcastReceiver.class);
        intent.setAction(ACTION_GEOFENCE_EVENT);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_MUTABLE;
        }
        return PendingIntent.getBroadcast(getContext(), 0, intent, flags);
    }

    @PluginMethod
    public void addGeofence(PluginCall call) {
        String id = call.getString("id");
        Double lat = call.getDouble("lat");
        Double lng = call.getDouble("lng");
        Double radius = call.getDouble("radius");
        String trigger = call.getString("trigger", "enter");

        if (id == null || lat == null || lng == null || radius == null) {
            call.reject("Parametros obrigatorios ausentes: id, lat, lng, radius");
            return;
        }

        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            call.reject("Permissao de localizacao (ACCESS_FINE_LOCATION) nao concedida");
            return;
        }

        int transitionTypes;
        switch (trigger) {
            case "exit":
                transitionTypes = Geofence.GEOFENCE_TRANSITION_EXIT;
                break;
            case "both":
                transitionTypes = Geofence.GEOFENCE_TRANSITION_ENTER | Geofence.GEOFENCE_TRANSITION_EXIT;
                break;
            case "enter":
            default:
                transitionTypes = Geofence.GEOFENCE_TRANSITION_ENTER;
                break;
        }

        Geofence geofence = new Geofence.Builder()
            .setRequestId(id)
            .setCircularRegion(lat, lng, radius.floatValue())
            .setExpirationDuration(Geofence.NEVER_EXPIRE)
            .setTransitionTypes(transitionTypes)
            .build();

        List<Geofence> geofenceList = new ArrayList<>();
        geofenceList.add(geofence);

        GeofencingRequest request = new GeofencingRequest.Builder()
            .setInitialTrigger(GeofencingRequest.INITIAL_TRIGGER_ENTER)
            .addGeofences(geofenceList)
            .build();

        try {
            geofencingClient.addGeofences(request, getGeofencePendingIntent())
                .addOnSuccessListener(unused -> call.resolve())
                .addOnFailureListener(e -> call.reject("Falha ao registrar geofence: " + e.getMessage(), e));
        } catch (SecurityException e) {
            call.reject("Permissao de localizacao ausente ao registrar geofence: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void removeGeofence(PluginCall call) {
        String id = call.getString("id");
        if (id == null) {
            call.reject("Parametro obrigatorio ausente: id");
            return;
        }
        List<String> ids = new ArrayList<>();
        ids.add(id);
        geofencingClient.removeGeofences(ids)
            .addOnSuccessListener(unused -> call.resolve())
            .addOnFailureListener(e -> call.reject("Falha ao remover geofence: " + e.getMessage(), e));
    }

    /**
     * Fluxo de permissao em duas etapas exigido pelo Android 10+ (API 29+):
     * primeiro ACCESS_FINE_LOCATION, e somente depois (em outra tela/prompt)
     * ACCESS_BACKGROUND_LOCATION. Pedir as duas juntas e rejeitado pelo SO.
     */
    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "fineLocationPermsCallback");
            return;
        }
        requestBackgroundLocationIfNeeded(call);
    }

    @PermissionCallback
    private void fineLocationPermsCallback(PluginCall call) {
        if (getPermissionState("location") != com.getcapacitor.PermissionState.GRANTED) {
            // Usuario negou a permissao base; nao ha como prosseguir para background.
            checkPermissions(call);
            return;
        }
        requestBackgroundLocationIfNeeded(call);
    }

    private void requestBackgroundLocationIfNeeded(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Antes do Android 10, ACCESS_FINE_LOCATION ja cobre uso em background.
            checkPermissions(call);
            return;
        }
        if (getPermissionState("backgroundLocation") == com.getcapacitor.PermissionState.GRANTED) {
            checkPermissions(call);
            return;
        }
        requestPermissionForAlias("backgroundLocation", call, "backgroundLocationPermsCallback");
    }

    @PermissionCallback
    private void backgroundLocationPermsCallback(PluginCall call) {
        checkPermissions(call);
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();
        result.put("location", getPermissionState("location").toString());
        result.put("backgroundLocation", getPermissionState("backgroundLocation").toString());
        call.resolve(result);
    }
}
