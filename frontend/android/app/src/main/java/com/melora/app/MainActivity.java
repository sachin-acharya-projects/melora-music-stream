package com.melora.app;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ExternalBrowserPlugin.class);
        registerPlugin(BackgroundAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }

    // Capacitor pauses the WebView on background, which also pauses <audio>
    // playback. Our BackgroundAudio foreground service keeps the process alive,
    // so re-resume the WebView after Capacitor pauses it to allow background
    // audio. No-op when nothing is playing.
    private void keepWebViewAudioAlive() {
        Bridge bridge = getBridge();
        if (bridge != null) {
            WebView webView = bridge.getWebView();
            if (webView != null) {
                webView.onResume();
            }
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        keepWebViewAudioAlive();
    }

    @Override
    public void onStop() {
        super.onStop();
        keepWebViewAudioAlive();
    }
}
