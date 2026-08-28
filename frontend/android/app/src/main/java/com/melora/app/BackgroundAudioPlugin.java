package com.melora.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.content.ContextCompat;

import android.support.v4.media.session.PlaybackStateCompat;

@CapacitorPlugin(
        name = "BackgroundAudio",
        permissions = {
            @Permission(alias = "notifications", strings = {"android.permission.POST_NOTIFICATIONS"})
        })
public class BackgroundAudioPlugin extends Plugin {
    private static final String POST_NOTIF = "android.permission.POST_NOTIFICATIONS";
    private PluginCall pendingCall;

    @Override
    public void load() {
        MediaPlaybackService.setActionListener(
                (action, seekTimeMs) -> {
                    JSObject obj = new JSObject();
                    String name;
                    if (action.equals(MediaPlaybackService.ACTION_PLAY)) {
                        name = "play";
                    } else if (action.equals(MediaPlaybackService.ACTION_PAUSE)) {
                        name = "pause";
                    } else if (action.equals(MediaPlaybackService.ACTION_NEXT)) {
                        name = "next";
                    } else if (action.equals(MediaPlaybackService.ACTION_PREV)) {
                        name = "previous";
                    } else {
                        name = "seek";
                    }
                    obj.put("action", name);
                    if (name.equals("seek")) {
                        obj.put("time", seekTimeMs / 1000.0);
                    }
                    notifyListeners("action", obj);
                });
    }

    @PluginMethod
    public void enable(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(getContext(), POST_NOTIF) != PackageManager.PERMISSION_GRANTED) {
            pendingCall = call;
            requestPermissions(call);
            return;
        }
        startService();
        call.resolve();
    }

    private void startService() {
        Intent i = new Intent(getContext(), MediaPlaybackService.class);
        getContext().startForegroundService(i);
    }

    @Override
    protected void handleRequestPermissionsResult(
            int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);
        startService();
        if (pendingCall != null) {
            pendingCall.resolve();
            pendingCall = null;
        }
    }

    @PluginMethod
    public void setMetadata(PluginCall call) {
        MediaPlaybackService svc = MediaPlaybackService.getInstance();
        if (svc != null) {
            svc.updateMetadata(call.getString("title"), call.getString("artist"));
        }
        call.resolve();
    }

    @PluginMethod
    public void setPlaybackState(PluginCall call) {
        String state = call.getString("state");
        int s = PlaybackStateCompat.STATE_NONE;
        if ("playing".equals(state)) {
            s = PlaybackStateCompat.STATE_PLAYING;
        } else if ("paused".equals(state)) {
            s = PlaybackStateCompat.STATE_PAUSED;
        } else if ("stopped".equals(state)) {
            s = PlaybackStateCompat.STATE_STOPPED;
        }
        MediaPlaybackService svc = MediaPlaybackService.getInstance();
        if (svc != null) {
            svc.updateState(s);
        }
        call.resolve();
    }

    @PluginMethod
    public void setPositionState(PluginCall call) {
        double dur = call.getDouble("duration", 0.0);
        double pos = call.getDouble("position", 0.0);
        double rate = call.getDouble("playbackRate", 1.0);
        MediaPlaybackService svc = MediaPlaybackService.getInstance();
        if (svc != null) {
            svc.updatePosition((long) (pos * 1000), (long) (dur * 1000), (float) rate);
        }
        call.resolve();
    }

    @PluginMethod
    public void disable(PluginCall call) {
        MediaPlaybackService svc = MediaPlaybackService.getInstance();
        if (svc != null) {
            svc.stop();
        }
        call.resolve();
    }
}
