package com.melora.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;

/**
 * Foreground service that hosts a native MediaSession for the WebView audio
 * element. Starting this service (with foregroundServiceType=mediaPlayback) keeps
 * the app process alive while audio plays in the background and exposes
 * lock-screen / notification media controls. Playback itself still runs in the
 * web <audio> element; this service only bridges transport actions back to JS
 * and shows the system media notification.
 */
public class MediaPlaybackService extends Service {
    public static final String CHANNEL_ID = "melora_media_playback";
    public static final int NOTIF_ID = 4242;

    public interface ActionListener {
        void onAction(String action, long seekTimeMs);
    }

    private static final long ACTIONS = PlaybackStateCompat.ACTION_PLAY
            | PlaybackStateCompat.ACTION_PAUSE
            | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT
            | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_SEEK_TO;

    public static final String ACTION_PLAY = "melora.media.PLAY";
    public static final String ACTION_PAUSE = "melora.media.PAUSE";
    public static final String ACTION_NEXT = "melora.media.NEXT";
    public static final String ACTION_PREV = "melora.media.PREV";
    public static final String ACTION_SEEK = "melora.media.SEEK";

    private static MediaPlaybackService instance;
    private static ActionListener pendingListener;

    private MediaSessionCompat mediaSession;
    private PlaybackStateCompat.Builder stateBuilder;
    private int currentState = PlaybackStateCompat.STATE_NONE;
    private long positionMs = 0;
    private ActionListener actionListener;

    public static void setActionListener(ActionListener listener) {
        if (instance != null) {
            instance.actionListener = listener;
        } else {
            pendingListener = listener;
        }
    }

    public static MediaPlaybackService getInstance() {
        return instance;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        createChannel();

        mediaSession = new MediaSessionCompat(this, "MeloraMediaSession");
        mediaSession.setFlags(
                MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                        | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        stateBuilder = new PlaybackStateCompat.Builder().setActions(ACTIONS);
        mediaSession.setPlaybackState(stateBuilder.setState(currentState, positionMs, 1f).build());
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override
            public void onPlay() {
                emit(ACTION_PLAY, 0);
            }

            @Override
            public void onPause() {
                emit(ACTION_PAUSE, 0);
            }

            @Override
            public void onSkipToNext() {
                emit(ACTION_NEXT, 0);
            }

            @Override
            public void onSkipToPrevious() {
                emit(ACTION_PREV, 0);
            }

            @Override
            public void onSeekTo(long pos) {
                emit(ACTION_SEEK, pos);
            }
        });
        mediaSession.setActive(true);

        if (pendingListener != null) {
            actionListener = pendingListener;
            pendingListener = null;
        }

        startForeground(NOTIF_ID, buildNotification());
    }

    private void emit(String action, long seekTimeMs) {
        if (actionListener != null) {
            actionListener.onAction(action, seekTimeMs);
        }
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            NotificationChannel ch = new NotificationChannel(
                    CHANNEL_ID, "Melora Playback", NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Now playing controls");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
    }

    public void updateMetadata(String title, String artist) {
        MediaMetadataCompat meta = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title == null ? "" : title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist == null ? "" : artist)
                .build();
        mediaSession.setMetadata(meta);
        refresh();
    }

    public void updateState(int state) {
        currentState = state;
        stateBuilder.setState(state, positionMs, 1f);
        mediaSession.setPlaybackState(stateBuilder.build());
        refresh();
    }

    public void updatePosition(long position, long duration, float rate) {
        positionMs = position;
        stateBuilder.setState(currentState, position, rate);
        mediaSession.setPlaybackState(stateBuilder.build());
        refresh();
    }

    private PendingIntent contentIntent() {
        Intent intent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (intent == null) {
            intent = new Intent(this, MainActivity.class);
        }
        intent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private PendingIntent actionIntent(String action) {
        Intent i = new Intent(this, MediaPlaybackService.class);
        i.setAction(action);
        return PendingIntent.getService(this, action.hashCode(), i,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private Notification buildNotification() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_media)
                .setContentTitle(currentTitle())
                .setContentText(currentArtist())
                .setContentIntent(contentIntent())
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(currentState == PlaybackStateCompat.STATE_PLAYING)
                .setChannelId(CHANNEL_ID);

        MediaStyle style = new MediaStyle();
        style.setMediaSession(mediaSession.getSessionToken());
        style.setShowActionsInCompactView(0, 1, 2);
        builder.setStyle(style);

        builder.addAction(android.R.drawable.ic_media_previous, "Previous", actionIntent(ACTION_PREV));
        if (currentState == PlaybackStateCompat.STATE_PLAYING) {
            builder.addAction(android.R.drawable.ic_media_pause, "Pause", actionIntent(ACTION_PAUSE));
        } else {
            builder.addAction(android.R.drawable.ic_media_play, "Play", actionIntent(ACTION_PLAY));
        }
        builder.addAction(android.R.drawable.ic_media_next, "Next", actionIntent(ACTION_NEXT));

        return builder.build();
    }

    private String currentTitle() {
        MediaMetadataCompat m = mediaSession.getController().getMetadata();
        return m == null ? "Melora" : m.getString(MediaMetadataCompat.METADATA_KEY_TITLE);
    }

    private String currentArtist() {
        MediaMetadataCompat m = mediaSession.getController().getMetadata();
        return m == null ? "" : m.getString(MediaMetadataCompat.METADATA_KEY_ARTIST);
    }

    private void refresh() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        nm.notify(NOTIF_ID, buildNotification());
    }

    public void stop() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
        }
        stopForeground(true);
        stopSelf();
        instance = null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.getAction() != null) {
            String a = intent.getAction();
            if (ACTION_PLAY.equals(a)) {
                emit(ACTION_PLAY, 0);
            } else if (ACTION_PAUSE.equals(a)) {
                emit(ACTION_PAUSE, 0);
            } else if (ACTION_NEXT.equals(a)) {
                emit(ACTION_NEXT, 0);
            } else if (ACTION_PREV.equals(a)) {
                emit(ACTION_PREV, 0);
            }
        }
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.release();
        }
        instance = null;
        super.onDestroy();
    }
}
